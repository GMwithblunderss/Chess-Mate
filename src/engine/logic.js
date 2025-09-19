import { getEngineWorker, sendCommandsToWorker, getRecommendedWorkersNb } from "./worker/worker";

export class UciEngine {
  constructor(enginePath) {
    this.enginePath = enginePath;
    this.workers = [];
    this.workerQueue = [];
  }

  static async create(enginePath, workersNb = 1) {
    const engine = new UciEngine(enginePath);
    await engine.init(workersNb);
    return engine;
  }

  async init(workersNb = 1) {
    const nb = Math.min(workersNb, getRecommendedWorkersNb());
    for (let i = 0; i < nb; i++) {
      const worker = getEngineWorker(this.enginePath);
      await sendCommandsToWorker(worker, ["uci", "isready"], "readyok");
      worker.isReady = true;
      this.workers.push(worker);
    }
  }

  acquireWorker() {
    for (const w of this.workers) {
      if (w.isReady) {
        w.isReady = false;
        return w;
      }
    }
    return null;
  }

  async releaseWorker(worker) {
    const nextJob = this.workerQueue.shift();
    if (!nextJob) {
      worker.isReady = true;
      return;
    }
    const res = await sendCommandsToWorker(
      worker,
      nextJob.commands,
      nextJob.finalMessage,
      nextJob.onNewMessage
    );
    nextJob.resolve(res);
    this.releaseWorker(worker);
  }

  async analyzeFen(fen, { movetime = 2000, depth = null, retries = 3 } = {}) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const worker = this.acquireWorker();

      let commands;
      if (depth) {
        commands = [`position fen ${fen}`, `go depth ${depth}`];
      } else {
        commands = [`position fen ${fen}`, `go movetime ${movetime}`];
      }

      const finalMessage = "bestmove";

      if (!worker) {
        // Queue the job if no worker is ready
        return new Promise((resolve) => {
          this.workerQueue.push({ commands, finalMessage, resolve });
        });
      }

      let results;
      try {
        results = await sendCommandsToWorker(worker, commands, finalMessage);
      } catch (err) {
        console.warn(`Stockfish crashed (attempt ${attempt}) for FEN: ${fen}`, err);
        this.releaseWorker(worker);
        if (attempt === retries) return null;
        continue; // retry the same FEN
      }

      let bestmove = null;
      let pvhistory = [];
      let evalCp = null;

      for (const line of results) {
        if (line.includes("score mate")) {
          const match = line.match(/score mate (-?\d+)/);
          if (match) evalCp = `mate in ${parseInt(match[1], 10)}`;
        } else if (line.includes("score cp")) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) evalCp = parseInt(match[1], 10);
        }
        if (line.includes(" pv ")) {
          pvhistory = line.split(" pv ")[1].trim().split(" ");
        }
        if (line.startsWith("bestmove")) {
          bestmove = line.split(" ")[1];
        }
      }

      this.releaseWorker(worker);

      if (bestmove) {
        return { bestmove, pvhistory, evalCp };
      } else {
        console.warn(`No bestmove found (attempt ${attempt}) for FEN: ${fen}`);
        if (attempt === retries) return null; // push null after max retries
      }
    }
  }

  terminate() {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.workerQueue = [];
  }
}
