import { UciEngine } from "./logic.js";
import { isMultiThreadSupported, isWasmSupported, isMobileDevice } from "./checker.js"; 

export class Stockfish17 {

  static async create(lite = true, workersNb = 1) {
    if (!Stockfish17.isSupported()) {
      throw new Error("Stockfish 17 is not supported in this environment");
    }

    const multiThread = isMultiThreadSupported();
    if (!multiThread) console.log("Single thread mode");

    // Determine if user has a strong machine
    const hardwareThreads = navigator.hardwareConcurrency || 2;
    const deviceMemory = navigator.deviceMemory || 2; // in GB
    const isStrongMachine = hardwareThreads >= 4 && deviceMemory >= 4 && !isMobileDevice();

    // Use full engine if the machine is strong
    lite = !isStrongMachine;

    const enginePath = `stockfish-17${lite ? "-lite" : ""}${multiThread ? "" : "-single"}.js`;
    //console.log("Using engine:", enginePath);
    const engineName = lite ? "Stockfish17Lite" : "Stockfish17";

    return UciEngine.create(enginePath, workersNb, engineName);
  }

  static isSupported() {
    return isWasmSupported();
  }
}
