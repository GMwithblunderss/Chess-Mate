/*import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getEvalFromFen(fen) {
  return new Promise((resolve, reject) => {
    const stockfishPath = path.join(__dirname, "stockfish.exe");
    const engine = spawn(stockfishPath);

    let evalCp = null;

    engine.stdin.write("uci\n");
    engine.stdin.write("isready\n");
    engine.stdin.write(`position fen ${fen}\n`);
    engine.stdin.write("go depth 15\n");
    //engine.stdin.write("go movetime 10\n");
    

    engine.stdout.on("data", (data) => {
      const output = data.toString();
      const lines = output.split("\n");

      for (const line of lines) {
        if (line.includes("score cp")) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) {
            evalCp = parseInt(match[1]);
          }
        }





          if (line.startsWith("bestmove")) {
          engine.kill();
          if (evalCp !== null) {
            resolve( evalCp);
          } else {
            reject("Eval not found.");
          }
        }





      }


      
    });

    engine.stderr.on("data", (err) => {
      console.error("Stockfish error:", err.toString());
    });

    engine.on("close", () => {
      if (evalCp === null) {
        reject("Stockfish closed before returning eval.");
      }
    });
  });
}

function normalizeEval(cp, moveIndex) {
  return (moveIndex % 2 === 0) ? cp : -cp;
}
*/
