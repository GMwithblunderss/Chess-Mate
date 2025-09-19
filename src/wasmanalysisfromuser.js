import { UciEngine } from "./engine/logic.js";
import { Chess } from "chess.js";
import { API_URL } from "./pathconfig.js";
import { getRecommendedWorkersNb } from "./engine/worker/worker.js";
import { prewarmStockfish } from './wasmanalysis.js';

export const prewarmStockfishuser = () => {
  return prewarmStockfish(); // reuse already prewarmed workers
};
async function runInBatches(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

/*export const prewarmStockfishuser = () => {
  if (!stockfishServicePromise) {
    stockfishServicePromise = (async () => {
      const service = await UciEngine.create("stockfish-17.js", getRecommendedWorkersNb());
      //console.log("🔥 Stockfish workers prewarmed");
      return service;
    })();
  }
  return stockfishServicePromise;
};*/


let stockfishServicePromise = null;
async function analyteUser() {
    console.log("🔥 analyteUser called");
    const username = localStorage.getItem("currentUser");
    let stockfishService;
    try {
        const response = await fetch(`${API_URL}/analyzewithstockfishuser`, {
            method: "POST",
            headers: { 'Content-Type': "application/json" },
            body: JSON.stringify({ username })
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json(); 
        console.log("fens",data);

        stockfishService = await prewarmStockfishuser();
        const { fens } = data;

        const recommendedWorkers = getRecommendedWorkersNb();

        const results = await runInBatches(fens, recommendedWorkers, async (fen) => {
            if (!fen) return { fen: null, analysis: null };
            const analysis = await stockfishService.analyzeFen(fen, { depth: 15 });
            return { fen, analysis };
        });

        const bestfens = [];
        for (let i = 0; i < results.length; i++) {
            if (i === results.length - 1) continue;
            const r = results[i];
            const bestmove = r.analysis?.bestmove;
            if (!r.fen || !bestmove) {
                bestfens.push(null);
                continue;
            }
            const chess = new Chess();
            chess.load(r.fen);
            const moveResult = chess.move(bestmove);
            bestfens.push(moveResult ? chess.fen() : null);
        }

        const bestresults = await runInBatches(bestfens, recommendedWorkers, async (bestfen) => {
            if (!bestfen) return null;
            const bestanalysis = await stockfishService.analyzeFen(bestfen, { depth: 15 });
            return { fen: bestfen, analysis: bestanalysis };
        });
                const payload = { fens, results, bestfens, bestresults, username };

        console.log(
            "Payload size (MB):",
            (JSON.stringify(payload).length / 1024 / 1024).toFixed(2)
        ); 
        await fetch(`${API_URL}/wasmresultsuser`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fens, results, bestfens, bestresults, username }),
        });

    } catch (err) {
        console.error("Error in analyteUser():", err);
    } finally {
        console.log("User PGN analysis finished.");
    }
}
export default analyteUser;
