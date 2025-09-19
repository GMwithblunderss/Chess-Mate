import { getEngineWorker, sendCommandsToWorker, getRecommendedWorkersNb } from "./worker/worker";

export class UciEngine {
  constructor(enginePath) {
    this.enginePath = enginePath;
    this.workers = [];
    this.queue = [];
  }

  static async create(enginePath, workersNb = 1) {
    const engine = new UciEngine(enginePath);
    await engine.init(workersNb);
    return engine;
  }

  async init(workersNb = 1) {
    // Keep your existing recommendation logic but let user request more (still capped).
    const nb = Math.min(workersNb, getRecommendedWorkersNb());
    for (let i = 0; i < nb; i++) {
      const worker = getEngineWorker(this.enginePath);
      await sendCommandsToWorker(worker, ["uci", "isready"], "readyok");
      worker.isReady = true;
      this.workers.push(worker);
    }
  }

  // Call this when user starts analyzing a brand new game (prevents stale transposition data).
  async newGame() {
    await Promise.all(
      this.workers.map(w =>
        sendCommandsToWorker(w, ["ucinewgame", "isready"], "readyok").catch(() => {})
      )
    );
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

  releaseWorker(worker) {
    const next = this.queue.shift();
    if (!next) {
      worker.isReady = true;
      return;
    }
    this._runJobOnWorker(worker, next);
  }

  // Centralized job executor so queued vs immediate are identical.
  async _runJobOnWorker(worker, job) {
    const { commands, finalMessage } = job;
    try {
      const lines = await sendCommandsToWorker(worker, commands, finalMessage);
      const parsed = this._parse(lines);
      job.resolve(parsed);
    } catch (err) {
      if (job.attempt < job.retries) {
        job.attempt++;
        // Requeue at end
        this.queue.push(job);
      } else {
        job.resolve(null); // keep it simple: return null on final failure
      }
    } finally {
      this.releaseWorker(worker);
    }
  }

  _parse(lines) {
    let bestmove = null;
    let pvhistory = [];
    let evalCp = null; // keep as you had (simple)
    for (const line of lines) {
      if (line.startsWith("bestmove")) bestmove = line.split(" ")[1];
      if (line.includes("score mate")) {
        const m = line.match(/score mate (-?\d+)/);
        if (m) evalCp = `mate in ${parseInt(m[1], 10)}`;
      } else if (line.includes("score cp")) {
        const m = line.match(/score cp (-?\d+)/);
        if (m) evalCp = parseInt(m[1], 10);
      }
      if (line.includes(" pv ")) {
        pvhistory = line.split(" pv ")[1].trim().split(/\s+/);
      }
    }
    return bestmove ? { bestmove, pvhistory, evalCp } : null;
  }

  analyzeFen(fen, { movetime = 2000, depth = null, retries = 2 } = {}) {
    const commands = [
      `position fen ${fen}`,
      depth ? `go depth ${depth}` : `go movetime ${movetime}`
    ];
    const finalMessage = "bestmove";

    return new Promise((resolve) => {
      const job = {
        commands,
        finalMessage,
        resolve,
        retries,
        attempt: 1
      };
      const worker = this.acquireWorker();
      if (!worker) {
        this.queue.push(job);
      } else {
        this._runJobOnWorker(worker, job);
      }
    });
  }

  terminate() {
    for (const w of this.workers) {
      try { w.terminate(); } catch {}
    }
    this.workers = [];
    this.queue = [];
  }
}
