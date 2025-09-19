import { Chess } from "chess.js";
import { openings } from "./openings.js";
import dotenv from 'dotenv'
dotenv.config({ path: '../server/backend.env'});

function addDefaultPromotion(move, chess) {
  if (typeof move !== "string" || move.includes("=")) return move;
  try {
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    const piece = chess.get(from);
    if (piece?.type === "p" && (to[1] === "8" || to[1] === "1")) {
      return move + "=Q";
    }
  } catch (e) {
    console.warn("Promotion check failed for move:", move, e.message);
  }
  return move;
}





function getWinPercentageFromCp(cp) {
  if (typeof cp === "string" && cp.startsWith("mate in")) {
    const mateValue = parseInt(cp.split(" ")[2], 10);
    return mateValue > 0 ? 100 : 0;
  }
  const clamped = Math.max(-1000, Math.min(1000, cp));
  const MULTIPLIER = -0.00368208;
  const winChances = 2 / (1 + Math.exp(MULTIPLIER * clamped)) - 1;
  return 50 + 50 * winChances;
}

function toWhiteWinPercent(cp, isWhiteMove) {
  let wp = getWinPercentageFromCp(cp);
  return isWhiteMove ? wp : 100 - wp;
}



function getMaterialDifference(fen) {
  const game = new Chess(fen);
  const board = game.board().flat();
  const getPieceValue = (piece) => {
    switch (piece) {
      case "p": return 1;
      case "n":
      case "b": return 3;
      case "r": return 5;
      case "q": return 9;
      default: return 0;
    }
  };
  return board.reduce((acc, square) => {
    if (!square) return acc;
    return acc + (square.color === "w" ? getPieceValue(square.type) : -getPieceValue(square.type));
  }, 0);
}

function isUciMove(move) {
  return typeof move === "string" && /^[a-h][1-8][a-h][1-8](?:[qnrbQNRB])?$/.test(move);
}

function getIsPieceSacrifice(fen, playedMove, bestLinePvToPlay) {
  if (!bestLinePvToPlay || !bestLinePvToPlay.length) return false;

  const game = new Chess(fen);
  const whiteToPlay = game.turn() === "w";
  const startingMaterialDifference = getMaterialDifference(fen);

  let moves = [playedMove, ...bestLinePvToPlay];
  if (moves.length % 2 === 1) {
    moves = moves.slice(0, -1);
  }

  const capturedPieces = { w: [], b: [] };
  let nonCapturingMovesTemp = 0;

  for (const move of moves) {
    try {
      const fullMove = game.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move[4],
      });

      if (!fullMove) return false;

      if (fullMove.captured) {
        capturedPieces[fullMove.color].push(fullMove.captured);
        nonCapturingMovesTemp = 0;
      } else {
        nonCapturingMovesTemp--;
        if (nonCapturingMovesTemp < 0) break;
      }
    } catch {
      return false;
    }
  }

  for (const p of capturedPieces.w.slice(0)) {
    if (capturedPieces.b.includes(p)) {
      capturedPieces.b.splice(capturedPieces.b.indexOf(p), 1);
      capturedPieces.w.splice(capturedPieces.w.indexOf(p), 1);
    }
  }

  if (
    Math.abs(capturedPieces.w.length - capturedPieces.b.length) <= 1 &&
    capturedPieces.w.concat(capturedPieces.b).every(p => p === "p")
  ) {
    return false;
  }

  const endingMaterialDifference = getMaterialDifference(game.fen());
  const materialDiff = endingMaterialDifference - startingMaterialDifference;
  const materialDiffPlayerRelative = whiteToPlay ? materialDiff : -materialDiff;

  return materialDiffPlayerRelative < 0;
}

function isLosingOrAlternateCompletelyWinning(posWin, altWin, isWhiteMove) {
  const isLosing = isWhiteMove ? posWin < 50 : posWin > 50;
  const altWinDom = isWhiteMove ? altWin > 97 : altWin < 3;
  return isLosing || altWinDom;
}

function trimFen(fen) {
  if (!fen) return null;
  return fen.split(' ')[0];
}

export async function handlemovelist(mdata, username, sessionUser ,options = { userPGN: false }) {
  const chess = new Chess();
  const fens = [];
  let lastMove = Promise.resolve();

  function queueMove(move) {
    lastMove = lastMove.then(() => {
      try { return chess.move(move); }
      catch (err) { console.warn("Invalid move:", move, err.message); return null; }
    });
    return lastMove;
  }

  for (const move of mdata) {
    try {
      const appliedMove = await queueMove(move);
      if (appliedMove) fens.push(chess.fen());
      else fens.push(null);
    } catch (err) {
      console.warn("Invalid move:", move, err.message);
      fens.push(null);
    }
  }
  sessionUser.chess = chess;
  const API_URL = process.env.APP_API_URL;

  const endpoint = options.userPGN ? "/getuserAnalysis" : "/getAnalysis";
  //console.log("Endpoint called:", `http:/localhost:5000${endpoint}?username=${encodeURIComponent(username)}`);

  const res = await fetch(`${API_URL}${endpoint}?username=${encodeURIComponent(username)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  //console.log("Response status:", res.status);
  //console.log("Response text:", await res.text());
  const { results, bestresults } = await res.json();
  const bestMovesobj = results;

  const bestMovesRaw = bestMovesobj.map(r => r?.analysis?.bestmove || null);
  const pvhistoryRaw = bestMovesobj.map(r => r?.analysis?.pvhistory || null);
  const evalcp = bestMovesobj.map(r => r?.analysis?.evalCp ?? null);
  let userevals = [...evalcp];
  const bestEvalcp = bestresults.map(r => r?.analysis?.evalCp ?? null);
  let bestevalcp = [...bestEvalcp];

  function sanToUciMoves(movesSan) {
    const tmpChess = new Chess();
    const uciMoves = [];
    for (const san of movesSan) {
      try {
        const move = tmpChess.move(san);
        if (move) uciMoves.push(move.from + move.to + (move.promotion || ""));
        else console.warn("Invalid SAN:", san);
      } catch (e) {
        console.warn("Invalid SAN:", san);
      }
    }
    return uciMoves;
  }

  mdata = sanToUciMoves(mdata);

  let diff = [];
  let diffed = [];

  for (let i = 0; i < userevals.length; i++) {
    if (typeof userevals[i + 1] === "number" && typeof bestevalcp[i] === "number") {
      const differ = Math.abs(bestevalcp[i] - userevals[i + 1]);
      diff.push(differ);
      diffed.push(differ);
    } else if (typeof userevals[i + 1] === "string" && typeof bestevalcp[i] === "number") {
      diff.push(bestevalcp[i]);
    } else {
      diff.push(null);
      diffed.push(null);
    }
  }

  const cleaneddiff = diff.filter(val => val !== null && !isNaN(val));

  let pvfen = [];
  for (let i = 0; i < pvhistoryRaw.length; i++) {
    const pvchess = new Chess(fens[i] || new Chess().fen());
    const pvline = Array.isArray(pvhistoryRaw[i]) ? pvhistoryRaw[i] : [];
    const thisLineFens = [pvchess.fen()];
    for (const move of pvline) {
      try {
        const applied = pvchess.move(move);
        if (applied) thisLineFens.push(pvchess.fen());
      } catch (err) {}
    }
    pvfen.push(thisLineFens);
  }

  const userwinpercents = userevals.map(cp => {
    if (typeof cp === "number") return getWinPercentageFromCp(cp);
    if (typeof cp === "string" && cp.startsWith("mate in")) {
      const mateValue = parseInt(cp.split(" ")[2], 10);
      return mateValue > 0 ? 100 : 0;
    }
    return null;
  });

  for (let i = 0; i < userwinpercents.length - 1; i++) {
    if (userwinpercents[i] !== null) {
      if (i % 2 === 0) userwinpercents[i] = 100 - userwinpercents[i];
    } else if (i % 2 === 1) userwinpercents[i] = 100;
    else userwinpercents[i] = 0;
  }
  if (userwinpercents.length >= 2) userwinpercents[userwinpercents.length - 1] = userwinpercents[userwinpercents.length - 2];

  const pvUciHistory = pvhistoryRaw.map((pv, idx) => {
    const startFen = fens[idx] || new Chess().fen();
    const g = new Chess(startFen);
    const line = Array.isArray(pv) ? pv : [];
    const uci = [];
    for (const mv of line) {
      if (!mv) break;
      if (isUciMove(mv)) {
        try { g.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] }); }
        catch (e) { break; }
        uci.push(mv);
      } else {
        try {
          const applied = g.move(mv);
          if (!applied) break;
          uci.push(applied.from + applied.to + (applied.promotion || ""));
        } catch (e) { break; }
      }
    }
    return uci;
  });


  const bestUciMoves = bestMovesRaw.map((mv, idx) => {
    if (!mv) return null;
    if (isUciMove(mv)) return mv;
    const startFen = fens[idx] || new Chess().fen();
    const g = new Chess(startFen);
    try {
      const applied = g.move(mv);
      if (applied) return applied.from + applied.to + (applied.promotion || "");
    } catch (e) {}
    return null;
  });

  const actualgrading = [];
  let mateThreatActive = false;

for (let i = 1; i < userevals.length - 1; i++) {
    try {
      const fenBefore = fens[i -1];
      const playedMove = mdata[i];
      const bestLine = pvUciHistory[i] || [];
const lastWin = toWhiteWinPercent(bestevalcp[i - 1], (i - 1) % 2 === 0);
const currentWin = toWhiteWinPercent(bestevalcp[i], i % 2 === 0);
const isWhiteMove = i % 2 === 0;

          const isSacrifice = getIsPieceSacrifice(fenBefore, playedMove, bestLine);
    const winDropOk = isWhiteMove ? currentWin - lastWin >= -0.2 : lastWin - currentWin >=0.2;
    /*console.log(`Move ${i}:`, {
      playedMove,
      isSacrifice,
      winDropOk,
      lastWin,
      currentWin,
      isWhiteMove
    }); */
function skipBrilliant(winPercentBefore, winPercentAfter) {
  if (winPercentBefore <= 5 || winPercentBefore >= 95) return true;
  if (winPercentAfter <= 5 || winPercentAfter >= 95) return true;
  return false;
}
    const skipbrilliant =skipBrilliant(lastWin ,currentWin);
    if (isSacrifice && winDropOk && !skipbrilliant) {
      //console.log(`✅ Brilliant triggered at move ${i}`);
      actualgrading[i -1] = "Brilliant";
      continue;
    }

      if (
        getIsPieceSacrifice(fenBefore, playedMove, bestLine) &&
        ((currentWin - lastWin) * (isWhiteMove ? 1 : -1)) >= -2
      ) {
        actualgrading[i] = "Brilliant";
        continue;
      }

      if (typeof bestevalcp[i] === "string" && bestevalcp[i].startsWith("mate in")) {
        if (!mateThreatActive && i - 1 >= 0) {
          actualgrading[i - 1] = "Mate";
        }
        mateThreatActive = true;
      }

      if (typeof userevals[i + 1] === "string" && userevals[i + 1].startsWith("mate in")) {
        const mateValue = parseInt(userevals[i + 1].split(" ")[2], 10);
        actualgrading[i] = mateValue > 0 ? "Mate" : "Lost Mate";
        continue;
      }

      if (mateThreatActive && Math.abs(userevals[i + 1]) < 50) {
        mateThreatActive = false;
      }

      const cpDiff = typeof bestevalcp[i] === "number" && typeof userevals[i + 1] === "number"
        ? Math.abs(bestevalcp[i] - userevals[i + 1])
        : Infinity;
      const winDiff = (typeof userwinpercents[i] === "number" && typeof userwinpercents[i + 1] === "number")
        ? Math.abs(userwinpercents[i] - userwinpercents[i + 1])
        : Infinity;
      const useWin = typeof userwinpercents[i] === "number" && (userwinpercents[i] > 90 || userwinpercents[i] < 10);
      const gradingValue = useWin ? winDiff : cpDiff;

      if (useWin) {
        if (gradingValue >= 30) actualgrading[i] = "Blunder";
        else if (gradingValue >= 20) actualgrading[i] = "Mistake";
        else if (gradingValue >= 10) actualgrading[i] = "Inaccuracy";
        else if (gradingValue >= 3.5) actualgrading[i] = "Okay";
        else if (gradingValue >= 1.5) actualgrading[i] = "Good";
        else actualgrading[i] = "Best";
      } else {
        if (gradingValue >= 300) actualgrading[i] = "Blunder";
        else if (gradingValue >= 200) actualgrading[i] = "Mistake";
        else if (gradingValue >= 100) actualgrading[i] = "Inaccuracy";
        else if (gradingValue >= 35) actualgrading[i] = "Okay";
        else if (gradingValue >= 5) actualgrading[i] = "Good";
        else actualgrading[i] = "Best";
      }
    } catch (error) {
      console.log("error grading move", error);
    }
  }

  for (let i = 0; i < actualgrading.length - 1; i++) {
const isWhiteMove = i % 2 === 0;
const delta = (userwinpercents[i + 1] || 0) - (userwinpercents[i] || 0);
if (
  diff[i] === 0 &&
  ((isWhiteMove && delta > 0) || (!isWhiteMove && delta < 0)) &&
  actualgrading[i] === "Best"
) {
  actualgrading[i] = "Great";
}
  }

  
 for (let i = 0; i < actualgrading.length - 1; i++){
if ((actualgrading[i] === 'Blunder' || actualgrading[i] === "Mate" || actualgrading[i] === "Mistake") &&
    (actualgrading[i+1] === "Blunder" || actualgrading[i+1] === "Mistake" || actualgrading[i+1] === "Inaccuracy")) {
  actualgrading[i+1] = "Miss";
}
 }





  /*function convertLostMateToBlunder(gradingArray) {
    for (let i = 0; i < gradingArray.length; i++) {
      if (gradingArray[i] === "Mate") gradingArray[i] = "Blunder";
    }
  }
  convertLostMateToBlunder(actualgrading);*/

  for (let i = 0; i < mdata.length; i++) {
    const nextMove = mdata[i + 1];
    if (nextMove && bestUciMoves[i] === nextMove && actualgrading[i] !== "Great" && actualgrading[i] !== "Brilliant") {
      actualgrading[i] = "Best";
    }
  }

  const bookfens = openings.map(o => o.fen);
  const openingname = openings.map(o => o.name);
  const booknames = [];

  for (let i = 0; i < fens.length; i++) {
    const trimmedfen = trimFen(fens[i]);
    const bookIndex = bookfens.indexOf(trimmedfen);
    if (bookIndex !== -1) {
      actualgrading[i] = "Book";
      booknames.push(openingname[bookIndex]);
    }
  }


     for (let i = 0; i < actualgrading.length - 1; i++) {
    if (actualgrading[i+1] === "Book") {
      actualgrading[i] = "Book";
    }
  }


  let whiteCP = 0, blackCP = 0, whitemoves = 1, blackmoves = 0;

  function ratings(diffArray) {
    for (let i = 1; i < diffArray.length - 1; i++) {
      const iswhite = (i % 2 === 1);
      if (!iswhite) {
        blackCP += diffArray[i];
        blackmoves++;
      } else {
        whiteCP += diffArray[i];
        whitemoves++;
      }
    }
  }

  ratings(cleaneddiff);

  const whiteACPL = whiteCP / whitemoves;
  const blackACPL = blackCP / (blackmoves || 1);

  function acplToRating(acpl) {
    if (acpl === null) return "N/A";
    if (acpl < 15) return 2700;
    if (acpl < 25) return 2500;
    if (acpl < 35) return 2200;
    if (acpl < 45) return 2000;
    if (acpl < 60) return 1800;
    if (acpl < 80) return 1600;
    if (acpl < 70) return 1500;
    if (acpl < 100) return 1400;
    if (acpl < 125) return 1200;
    if (acpl < 150) return 1000;
    if (acpl < 175) return 900;
    if (acpl < 200) return 800;
    if (acpl < 250) return 500;
    if (acpl < 300) return 300;
    return 100;
  }

  const whiterating = acplToRating(whiteACPL);
  const blackrating = acplToRating(blackACPL);

  let whitebest = 0, whitegood = 0, whiteblunder = 0, whitemistake = 0, whiteokay = 0, whiteInaccuracy = 0, whitegreat = 0,whitebrilliant =0,whitemiss =0,whitemate=0;
  for (let i = 0; i < actualgrading.length - 1; i++) {
    if (i % 2 === 1) {
      const grade = actualgrading[i];
      if (typeof grade === "string" && grade.length > 3) {
        if (grade.includes("Best")) whitebest++;
        if (grade.includes("Blunder")) whiteblunder++;
        if (grade.includes("Mistake")) whitemistake++;
        if (grade.includes("Inaccuracy")) whiteInaccuracy++;
        if (grade.includes("Okay")) whiteokay++;
        if (grade.includes("Great")) whitegreat++;
        if (grade.includes("Good")) whitegood++;
        if (grade.includes("Brilliant")) whitebrilliant++;
        if (grade.includes("Miss")) whitemiss++;
        if (grade === "Mate") whitemate++;
      }
    }
  }

  const grademovenumbers = [whitebest, whitemistake, whiteblunder, whiteokay, whitegood, whitegreat, whiteInaccuracy ,whitebrilliant,whitemiss,whitemate];

  let blackbest = 0, blackgood = 0, blackblunder = 0, blackmistake = 0, blackokay = 0, blackInaccuracy = 0, blackgreat = 0 ,blackbrilliant =0,blackmiss =0,blackmate =0;
  for (let i = 0; i < actualgrading.length - 1; i++) {
    if (i % 2 === 0) {
      const grade = actualgrading[i];
      if (typeof grade === "string" && grade.length > 3) {
        if (grade.includes("Best")) blackbest++;
        if (grade.includes("Blunder")) blackblunder++;
        if (grade.includes("Mistake")) blackmistake++;
        if (grade.includes("Inaccuracy")) blackInaccuracy++;
        if (grade.includes("Okay")) blackokay++;
        if (grade.includes("Great")) blackgreat++;
        if (grade.includes("Good")) blackgood++;
        if (grade.includes("Brilliant")) blackbrilliant++;
        if (grade.includes("Miss")) blackmiss++;
        if (grade === "Mate") blackmate++;
      }
    }
  }

  const blackgradeno = [blackbest, blackmistake, blackblunder, blackokay, blackgood, blackgreat, blackInaccuracy,blackbrilliant,blackmiss,blackmate];

/*  console.log("userwin percetn ", userwinpercents);
  console.log("cploss", diff);
  console.log("user move evals", userevals);
  console.log("best eval cp ", bestevalcp);
  console.log("Best moves:", bestUciMoves);
  
  console.log("black ACPL", blackACPL);
  console.log("white ACPL", whiteACPL);
  console.log("white rating ", acplToRating(whiteACPL));
  console.log("black rating ", acplToRating(blackACPL));*/
  //console.log("actual Grades ", actualgrading);

  return { bestMoves: bestUciMoves, actualgrading, blackACPL, whiteACPL, blackrating, whiterating, userevals, diffed, grademovenumbers, userwinpercents, blackgradeno, pvfen, booknames };
}
