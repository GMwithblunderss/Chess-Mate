/* import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function analyzefen(fen) {
  return new Promise((resolve, reject) => {
    const stockfishPath = path.join(__dirname, "stockfish.exe");
    const engine = spawn(stockfishPath);

    let bestmove = null;
    let pvhistory = [];

    engine.stdin.write("uci\n");
    engine.stdin.write("isready\n");
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write("go depth 15\n");
    //engine.stdin.write("go movetime 10\n");

    engine.stdout.on("data", (data) => {
      const output = data.toString();
      //console.log("stockfish says:", output);

      const lines = output.split("\n");

      for (const line of lines) {

        if (line.includes(" pv ")) {
          const parts = line.split(" pv");
          if (parts.length > 1) {
            const currentpv = parts[1].trim().split(" ");
            pvhistory = currentpv;
          }
          
        }

        if (line.startsWith("bestmove")) {
          const parts = line.split(" ");
          bestmove = parts[1];
          engine.kill();

          //console.log("Final pvhistory:", pvhistory);
          resolve({ bestmove, pvhistory }); 
        }
      }
    });


    engine.stderr.on("data", (err) => {
      console.error("stockfish error:", err.toString());
    });

    engine.on("close", (code) => {
      if (!bestmove) {
        reject(new Error("Stockfish exited before returning a best move."));
      }
    });
  });
} */
