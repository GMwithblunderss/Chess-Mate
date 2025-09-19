import { UciEngine } from "./engine/logic.js";
import { Chess } from "chess.js";
import { API_URL } from "./pathconfig.js";
import { getRecommendedWorkersNb } from "./engine/worker/worker.js";
import { Stockfish17 } from "./engine/stockfish17.js";
//console.log("Imported createStockfishService =", UciEngine);

async function runInBatches(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

let stockfishServicePromise = null;

export const prewarmStockfish = () => {
  if (!stockfishServicePromise) {
    stockfishServicePromise = (async () => {
      const service = await Stockfish17.create(undefined, getRecommendedWorkersNb());
      //console.log("🔥 Stockfish workers prewarmed");
      return service;
    })();
  }
  return stockfishServicePromise;
};

async function analyte() {
    const username = localStorage.getItem("currentUser");
    const analysisKey = sessionStorage.getItem("analysisKey");
    let stockfishService;
    try {
        const response = await fetch(`${API_URL}/analyzewithstockfish`, {
            method: "POST",
            headers: { 'Content-Type': "application/json" },
            body: JSON.stringify({ username, analysisKey })
        });

        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();

        stockfishService = await prewarmStockfish();
        const { fens } = data;

        let recommendedWorkers = getRecommendedWorkersNb();
        if (fens.length > 100) {
            recommendedWorkers = Math.max(1, recommendedWorkers - 2); 
            console.log(`⚡ Reduced workers to ${recommendedWorkers} due to long game (${fens.length} moves)`);
        }

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

            if (moveResult) {
                bestfens.push(chess.fen());
            } else {
                console.warn(`Invalid best move '${bestmove}' for FEN:`, r.fen);
                bestfens.push(null);
            }
        }

        const bestresults = await runInBatches(bestfens, recommendedWorkers, async (bestfen) => {
            if (!bestfen) return null;
            const bestanalysis = await stockfishService.analyzeFen(bestfen, { depth: 15 });
            return { fen: bestfen, analysis: bestanalysis };
        });

        const payload = { fens, results, bestfens, bestresults, username, analysisKey };

        console.log(
            "Payload size (MB):",
            (JSON.stringify(payload).length / 1024 / 1024).toFixed(2)
        ); 

        await fetch(`${API_URL}/wasmresults`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fens,
                results,
                bestfens,
                bestresults,
                username,
                analysisKey
            }),
        });

        sessionStorage.removeItem("analysisKey");

        //console.log("All WASM results sent to backend");

    } catch (err) {
        console.error("Error in analyte():", err);
        sessionStorage.removeItem("analysisKey");
    } finally {
        console.log("Analysis finished (no quit available on stockfishService).");
    }
}

export default analyte;
