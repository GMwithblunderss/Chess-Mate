import axios from "axios"
import { supabase, setUserContext } from './utils/supabase.js'
import { Chess } from "chess.js";
import { Ecoopenings } from "./ecocompletebaseOpenings.js";
import { wikiopening } from "./cleanWikipediaOpenings.js";
import { cleanopenings } from "./ecoOpenings.js";

let statsweget;

const stats = async(username ,Sessionuser) => {
    try{
        await setUserContext(username);
        const reply = await axios.get(`http://localhost:5000/pgnd?username=${encodeURIComponent(username)}`)
        statsweget =  reply.data;

        if (statsweget && statsweget.cachedPGNData ) {
            return dataextraction(username,Sessionuser); 
        } else {
            console.log("Data not yet available. Retrying...");
        }
    }
    catch(err) {
        console.log("error in stats is ",err);
    }
}

const validateUserInPGN = (pgn, requestingUsername) => {
    const whiteMatch = pgn.match(/\[White\s+"([^"]+)"\]/);
    const blackMatch = pgn.match(/\[Black\s+"([^"]+)"\]/);
    
    if (!whiteMatch || !blackMatch) {
        throw new Error("Invalid PGN: Cannot extract player names");
    }
    
    const whitePlayer = whiteMatch[1].toLowerCase().trim();
    const blackPlayer = blackMatch[1].toLowerCase().trim();
    const requestingUser = requestingUsername.toLowerCase().trim();
    
    const isAuthorized = (whitePlayer === requestingUser || blackPlayer === requestingUser);
    
    if (!isAuthorized) {
        throw new Error(`Security violation: User '${requestingUsername}' not found in PGN. Players are: ${whiteMatch[1]} vs ${blackMatch[1]}`);
    }
    
    return {
        isAuthorized: true,
        whitePlayer: whiteMatch[1],
        blackPlayer: blackMatch[1],
        userIsWhite: whitePlayer === requestingUser
    };
};

const getGamePhaseBoundaries = (moves) => {
    let xCount = 0;
    const boundaries = { openingEnd: -1, middlegameEnd: -1 };
    
    moves.forEach((move, idx) => {
        if (move.includes("x")) xCount++;
        
        if ((idx >= 15 || xCount >= 6) && boundaries.openingEnd === -1) {
            boundaries.openingEnd = idx;
        }

        if ((idx >= 59 || xCount >= 16) && boundaries.middlegameEnd === -1) {
            boundaries.middlegameEnd = idx;
        }
    });
    
    if (boundaries.openingEnd === -1) boundaries.openingEnd = moves.length;
    if (boundaries.middlegameEnd === -1) boundaries.middlegameEnd = moves.length;
    
    return boundaries;
};

const getUserMovesInPhases = (moves, grades, cploss, captures, isWhite) => {
    const boundaries = getGamePhaseBoundaries(moves);
    const phases = { opening: [], middlegame: [], endgame: [] };
    const startIndex = isWhite ? 0 : 1;
    
    for (let i = startIndex; i < moves.length; i += 2) {
        const moveData = {
            move: moves[i],
            grade: grades[i - 1] || 'Good',
            index: i,
            cpLoss: Math.abs(cploss[i] || 0),
            capture: captures[i] || 'no capture'
        };
        
        if (i <= boundaries.openingEnd) phases.opening.push(moveData);
        else if (i <= boundaries.middlegameEnd) phases.middlegame.push(moveData);
        else phases.endgame.push(moveData);
    }

    return phases;
};

const calculatePiecePhaseEfficiency = (targetPiece, userMovesInPhase, phaseName) => {
    const pieceMoves = userMovesInPhase.filter(moveData => {
        let piece = moveData.move[0];
        if (!['N','B','R','Q','K'].includes(piece)) piece = 'P';
        return piece === targetPiece || (targetPiece === 'P' && piece === 'P');
    });
    
    if (phaseName === 'endgame' && userMovesInPhase.length === 0) {
        return null;
    }
    
    if (phaseName === 'endgame' && userMovesInPhase.length < 5) {
        return null;
    }
    
    if (pieceMoves.length === 0) {
        if (phaseName === 'endgame') return null;
        return 50;
    }
    
    const goodMoves = pieceMoves.filter(m => 
        ['Brilliant', 'Great', 'Best', 'Good','Book','Okay'].includes(m.grade)
    ).length;
    
    const baseEfficiency = (goodMoves / pieceMoves.length) * 100;
    
    if (phaseName === 'endgame') {
        const phaseWeight = Math.min(userMovesInPhase.length / 10, 1.5);
        return Math.min(baseEfficiency * phaseWeight, 100);
    }
    
    return baseEfficiency;
};





const extractAdvancedMetrics = (moves, grades, cploss, captures, isWhite, captureMetrics) => {
    const getGamePhases = () => {
        const phases = { opening: [], middlegame: [], endgame: [] };
        let xCount = 0;

        moves.forEach((move, idx) => {
            if (move.includes("x")) xCount++;

            const moveData = {
                move,
                grade: grades[idx - 1] || 'Good',
                index: idx,
                cpLoss: Math.abs(cploss[idx] || 0),
                capture: captures[idx] || 'no capture'
            };

            if (xCount <= 6) phases.opening.push(moveData);
            else if (xCount <= 12) phases.middlegame.push(moveData);
            else phases.endgame.push(moveData);
        });

        return phases;
    };

    const extractPieceMoves = (targetPiece) => {
        const pieceMoves = [];
        const startIndex = isWhite ? 0 : 1;

        for (let i = startIndex; i < moves.length; i += 2) {
            let piece = moves[i][0];
            if (!['N','B','R','Q','K'].includes(piece)) piece = 'P';
            if (piece === 'K') continue;

            if (piece === targetPiece || (targetPiece === 'P' && piece === 'P')) {
                pieceMoves.push({
                    move: moves[i],
                    grade: grades[i - 1] || 'Good',
                    index: i,
                    cpLoss: Math.abs(cploss[i] || 0),
                    capture: captures[i] || 'no capture'
                });
            }
        }

        return pieceMoves;
    };

    const calculateDecisiveMoves = (pieceMoves) => {
        return pieceMoves.filter(moveData => {
            const { grade, index } = moveData;

            if (index < 2) return false;

            const opponentPrevGrade = grades[index - 2];
            const opponentMadeError = opponentPrevGrade && 
                ['Blunder', 'Mistake', 'Inaccuracy'].includes(opponentPrevGrade);

            const myMoveConverted = ['Best', 'Great', 'Good'].includes(grade);
            const opponentCpLoss = Math.abs(cploss[index - 1] || 0);

            const strongConversion = opponentMadeError && myMoveConverted && opponentCpLoss > 20;
            const excellentAfterError = opponentMadeError && ['Best', 'Great'].includes(grade) && opponentCpLoss > 10;
            const bigPunishment = opponentMadeError && opponentCpLoss > 80;

            return strongConversion || excellentAfterError || bigPunishment;
        });
    };

    const calculateTacticalMoves = (pieceMoves, allMoves) => {
        return pieceMoves.filter(moveData => {
            const { move, grade, capture, index } = moveData;

            if (['Blunder', 'Mistake'].includes(grade)) return false;

            const excellentTactical = ['Brilliant', 'Great', 'Best'].includes(grade) && 
                (capture !== 'no capture' || Math.abs(cploss[index] || 0) < 20);

            const highValueCapture = capture && ['q', 'r'].includes(capture);
            const tacticalCheck = move.includes('+') && !['Blunder', 'Mistake'].includes(grade);
            const promotion = move.includes('=');
            const tacticalSacrifice = capture && ['Brilliant', 'Great'].includes(grade);

            const createsThreat = index < cploss.length - 1 && 
                Math.abs(cploss[index + 1] || 0) > 100 && 
                ['Best', 'Great'].includes(grade);

            return excellentTactical || highValueCapture || tacticalCheck || 
                   promotion || tacticalSacrifice || createsThreat;
        });
    };

    const calculatePhasePerformance = (targetPiece) => {
        const userPhases = getUserMovesInPhases(moves, grades, cploss, captures, isWhite);
        
        return {
            earlyGameActivity: calculatePiecePhaseEfficiency(targetPiece, userPhases.opening, 'opening'),
            middlegameEfficiency: calculatePiecePhaseEfficiency(targetPiece, userPhases.middlegame, 'middlegame'),
            endgameEfficiency: calculatePiecePhaseEfficiency(targetPiece, userPhases.endgame, 'endgame')
        };
    };

    const calculateStockfishLevelCenterControl = (pieceMoves, piece, allMoves) => {
        if (pieceMoves.length === 0) return 0;

        const centerSquares = ['d4', 'd5', 'e4', 'e5'];
        const extendedCenter = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];

        let totalCenterControl = 0;
        const maxControlPerMove = 100;

        pieceMoves.forEach((moveData) => {
            let controlValue = 0;
            const move = moveData.move;
            const destination = move.slice(-2);

            if (centerSquares.includes(destination)) {
                controlValue += 40;
            }

            if (extendedCenter.includes(destination)) {
                controlValue += 15;
            }

            if (piece === 'P') {
                if (['c4', 'd4', 'e4', 'f4'].includes(destination)) controlValue += 25;
                if (['c5', 'd5', 'e5', 'f5'].includes(destination)) controlValue += 25;
                if (move.includes('x') && (move.includes('d') || move.includes('e'))) {
                    controlValue += 20;
                }
                if (destination.includes('5') || destination.includes('4')) controlValue += 10;

            } else if (piece === 'N') {
                const knightOutposts = ['c3', 'c6', 'f3', 'f6', 'd2', 'e2'];
                if (knightOutposts.includes(destination)) controlValue += 30;
                if (centerSquares.includes(destination)) controlValue += 35;
                const advancedKnightSquares = ['c4', 'c5', 'f4', 'f5', 'e3', 'd3'];
                if (advancedKnightSquares.includes(destination)) controlValue += 20;

            } else if (piece === 'B') {
                const longDiagonalSquares = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8',
                                           'h1', 'g2', 'f3', 'e4', 'd5', 'c6', 'b7', 'a8'];
                if (longDiagonalSquares.includes(destination)) {
                    if (centerSquares.includes(destination)) controlValue += 35;
                    else controlValue += 20;
                }
                if (['g2', 'b2', 'g7', 'b7'].includes(destination)) controlValue += 25;
                if (['c4', 'f4', 'c5', 'f5'].includes(destination)) controlValue += 30;

            } else if (piece === 'R') {
                if (['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'].includes(destination)) {
                    controlValue += 25;
                }
                if (['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'].includes(destination)) {
                    controlValue += 25;
                }
                if (destination.includes('7') || destination.includes('2')) controlValue += 15;
                if (centerSquares.includes(destination)) controlValue += 30;

            } else if (piece === 'Q') {
                if (centerSquares.includes(destination)) controlValue += 40;
                if (destination.includes('d') || destination.includes('e') || 
                    destination.includes('4') || destination.includes('5')) {
                    controlValue += 20;
                }
                if (['c4', 'c5', 'f4', 'f5', 'd3', 'e3', 'd6', 'e6'].includes(destination)) {
                    controlValue += 25;
                }
            }

            if (['Brilliant', 'Great', 'Best'].includes(moveData.grade) && controlValue > 0) {
                controlValue *= 1.3;
            }

            if (move.includes('x') && (move.includes('d') || move.includes('e'))) {
                controlValue += 15;
            }

            controlValue = Math.min(controlValue, maxControlPerMove);
            totalCenterControl += controlValue;
        });

        const maxPossibleControl = pieceMoves.length * maxControlPerMove;
        return maxPossibleControl > 0 ? (totalCenterControl / maxPossibleControl) * 100 : 0;
    };

    const calculatePreciseSurvivalRate = (pieceKey, pieceMoves, allMoves, captures) => {
        if (pieceKey === 'Pawn') {
            const totalPawnMoves = pieceMoves.length;
            if (totalPawnMoves === 0) return 75;

            const survivedPawns = pieceMoves.filter(m => {
                const dest = m.move.slice(-2);
                const rank = parseInt(dest[1]);
                const promoted = m.move.includes('=');
                return rank >= 6 || promoted;
            }).length;

            const pawnsCapturedEarly = pieceMoves.filter(m => {
                const dest = m.move.slice(-2);
                const rank = parseInt(dest[1]);
                return rank <= 4 && m.capture !== 'no capture';
            }).length;

            let survivalRate = 70;
            survivalRate += (survivedPawns / totalPawnMoves) * 25;
            survivalRate -= (pawnsCapturedEarly / totalPawnMoves) * 15;

            return Math.max(60, Math.min(95, survivalRate));
        }

        const pieceSymbols = { Knight: 'n', Bishop: 'b', Rook: 'r', Queen: 'q' };
        const pieceSymbol = pieceSymbols[pieceKey];

        if (!pieceSymbol) return 75;

        let timesCaptured = 0;
        const opponentStartIndex = isWhite ? 1 : 0;

        for (let i = opponentStartIndex; i < allMoves.length; i += 2) {
            if (captures[i] === pieceSymbol) {
                timesCaptured++;
            }
        }

        const startingPieces = { Knight: 2, Bishop: 2, Rook: 2, Queen: 1 };
        const expected = startingPieces[pieceKey] || 1;

        const piecesRemaining = expected - timesCaptured;
        const baseSurvivalRate = (piecesRemaining / expected) * 100;

        const activityMultiplier = Math.min(pieceMoves.length / 5, 2);
        const activityBonus = activityMultiplier * 5;

        const goodMoveRatio = pieceMoves.filter(m => 
            ['Brilliant', 'Great', 'Best', 'Good','Okay'].includes(m.grade)
        ).length / pieceMoves.length;
        const qualityBonus = goodMoveRatio * 10;

        const finalRate = Math.max(0, Math.min(100, baseSurvivalRate + activityBonus + qualityBonus));
        return finalRate;
    };

    const calculateFavorableExchanges = (pieceKey, captureMetrics) => {
        const pieceValues = { Pawn: 1, Knight: 3, Bishop: 3, Rook: 5, Queen: 9 };
        const myValue = pieceValues[pieceKey];

        let favorableCount = 0;

        ['Queen', 'Rook', 'Bishop', 'Knight', 'Pawn'].forEach(target => {
            const targetValue = pieceValues[target];
            const goodCaptures = captureMetrics[`good${pieceKey}_x_${target}`] || 0;

            if (targetValue >= myValue || (target === 'Queen' || target === 'Rook')) {
                favorableCount += goodCaptures;
            } else if (targetValue === myValue) {
                favorableCount += Math.floor(goodCaptures * 0.7);
            }
        });

        return favorableCount;
    };

    const calculatePieceMetrics = (pieceSymbol) => {
        const pieceMoves = extractPieceMoves(pieceSymbol);
        const decisiveMoves = calculateDecisiveMoves(pieceMoves);
        const tacticalMoves = calculateTacticalMoves(pieceMoves, moves);
        const phaseStats = calculatePhasePerformance(pieceSymbol);
        const pieceKey = pieceSymbol === 'P' ? 'Pawn' : 
                        pieceSymbol === 'N' ? 'Knight' :
                        pieceSymbol === 'B' ? 'Bishop' :
                        pieceSymbol === 'R' ? 'Rook' : 'Queen';

        const initiatedGood = ['Queen', 'Rook', 'Bishop', 'Knight', 'Pawn'].reduce((sum, target) => {
            return sum + (captureMetrics[`good${pieceKey}_x_${target}`] || 0);
        }, 0);

        const initiatedBad = ['Queen', 'Rook', 'Bishop', 'Knight', 'Pawn'].reduce((sum, target) => {
            return sum + (captureMetrics[`bad${pieceKey}_x_${target}`] || 0);
        }, 0);

        const totalInitiatedTrades = initiatedGood + initiatedBad;
        const tradeSuccessRate = totalInitiatedTrades > 0 ? (initiatedGood / totalInitiatedTrades) * 100 : 0;

        const moveQuality = pieceMoves.reduce((acc, moveData) => {
            const grade = moveData.grade;
            if (['Brilliant', 'Great', 'Best'].includes(grade)) acc.excellent++;
            else if (['Good','Okay'].includes(grade)) acc.good++;
            else acc.poor++;
            return acc;
        }, { excellent: 0, good: 0, poor: 0 });

        const totalMoves = pieceMoves.length;
        const moveQualityScore = totalMoves > 0 ? 
            ((moveQuality.excellent * 2 + moveQuality.good * 1) / (totalMoves * 2)) * 100 : 0;

        const favorableExchanges = calculateFavorableExchanges(pieceKey, captureMetrics);
        const centerControlContribution = calculateStockfishLevelCenterControl(pieceMoves, pieceSymbol, moves);
        const survivalRate = calculatePreciseSurvivalRate(pieceKey, pieceMoves, moves, captures);

        let impactScore = 0;
        if (totalMoves > 0) {
            const baseImpact = ((decisiveMoves.length * 5 + tacticalMoves.length * 2) / totalMoves) * 8;
            const tradeBonus = (initiatedGood > 0) ? (initiatedGood * 0.8) : 0;
            const qualityBonus = (moveQualityScore / 100) * 3;

            impactScore = Math.min(baseImpact + tradeBonus + qualityBonus, 40);
        }

        return {
            initiatedCaptures: { 
                good: initiatedGood, 
                bad: initiatedBad 
            },
            favorableExchanges,
            totalMoves,
            moveQuality,
            gamesPlayed: 1,
            timesCaptured: Math.max(0, 2 - Math.floor(survivalRate / 50)),
            decisiveMoves: decisiveMoves.length,
            tacticalMoves: tacticalMoves.length,
            averageMovesPerGame: totalMoves,
            tradeSuccessRate,
            moveQualityScore,
            earlyGameActivity: phaseStats.earlyGameActivity,
            endgameEfficiency: phaseStats.endgameEfficiency,
            centerControlContribution,
            impactScore,
            survivalRate,
            captureRate: totalMoves > 0 ? (pieceMoves.filter(m => m.capture !== 'no capture').length / totalMoves) * 100 : 0
        };
    };

    return {
        pawn: calculatePieceMetrics('P'),
        knight: calculatePieceMetrics('N'),
        bishop: calculatePieceMetrics('B'),
        rook: calculatePieceMetrics('R'),
        queen: calculatePieceMetrics('Q')
    };
};

const identifyUserInitiatedTrades = (moves, captures, grades, isWhite) => {
    const userInitiatedTrades = {
        goodKnight_x_Queen: 0, badKnight_x_Queen: 0,
        goodKnight_x_Rook: 0, badKnight_x_Rook: 0,
        goodKnight_x_Bishop: 0, badKnight_x_Bishop: 0,
        goodKnight_x_Knight: 0, badKnight_x_Knight: 0,
        goodKnight_x_Pawn: 0, badKnight_x_Pawn: 0,

        goodBishop_x_Queen: 0, badBishop_x_Queen: 0,
        goodBishop_x_Rook: 0, badBishop_x_Rook: 0,
        goodBishop_x_Bishop: 0, badBishop_x_Bishop: 0,
        goodBishop_x_Knight: 0, badBishop_x_Knight: 0,
        goodBishop_x_Pawn: 0, badBishop_x_Pawn: 0,

        goodRook_x_Queen: 0, badRook_x_Queen: 0,
        goodRook_x_Rook: 0, badRook_x_Rook: 0,
        goodRook_x_Bishop: 0, badRook_x_Bishop: 0,
        goodRook_x_Knight: 0, badRook_x_Knight: 0,
        goodRook_x_Pawn: 0, badRook_x_Pawn: 0,

        goodQueen_x_Queen: 0, badQueen_x_Queen: 0,
        goodQueen_x_Rook: 0, badQueen_x_Rook: 0,
        goodQueen_x_Bishop: 0, badQueen_x_Bishop: 0,
        goodQueen_x_Knight: 0, badQueen_x_Knight: 0,
        goodQueen_x_Pawn: 0, badQueen_x_Pawn: 0,

        goodPawn_x_Queen: 0, badPawn_x_Queen: 0,
        goodPawn_x_Rook: 0, badPawn_x_Rook: 0,
        goodPawn_x_Bishop: 0, badPawn_x_Bishop: 0,
        goodPawn_x_Knight: 0, badPawn_x_Knight: 0,
        goodPawn_x_Pawn: 0, badPawn_x_Pawn: 0
    };

    const userStartIndex = isWhite ? 0 : 1;
    const opponentStartIndex = isWhite ? 1 : 0;

    for (let i = userStartIndex; i < moves.length; i += 2) {
        const userMove = moves[i];
        const userCapture = captures[i];

        if (userCapture === 'no capture') continue;

        const userMoveSquare = userMove.slice(-2);
        let isRecapture = false;

        for (let j = i - 2; j >= Math.max(0, i - 8) && j >= opponentStartIndex; j -= 2) {
            if (j % 2 === opponentStartIndex) {
                const oppMove = moves[j];
                const oppCapture = captures[j];

                if (oppCapture !== 'no capture') {
                    const oppMoveSquare = oppMove.slice(-2);

                    if (oppMoveSquare === userMoveSquare) {
                        isRecapture = true;
                        break;
                    }
                }
            }
        }

        if (!isRecapture) {
            const userPiece = userMove[0];
            const normalizedPiece = ['N','B','R','Q','K'].includes(userPiece) ? userPiece : 'P';

            if (normalizedPiece === 'K') continue;

            const grade = grades[i - 1] || 'Good';
            const isGood = ['Best', 'Great', 'Good', 'Brilliant'].includes(grade);
            const isBad = ['Blunder', 'Mistake', 'Inaccuracy'].includes(grade);

            const pieceKey = normalizedPiece === 'P' ? 'Pawn' : 
                           normalizedPiece === 'N' ? 'Knight' :
                           normalizedPiece === 'B' ? 'Bishop' :
                           normalizedPiece === 'R' ? 'Rook' : 'Queen';

            const targetKey = userCapture === 'p' ? 'Pawn' :
                            userCapture === 'n' ? 'Knight' :
                            userCapture === 'b' ? 'Bishop' :
                            userCapture === 'r' ? 'Rook' : 'Queen';

            if (isGood) {
                userInitiatedTrades[`good${pieceKey}_x_${targetKey}`]++;
            } else if (isBad) {
                userInitiatedTrades[`bad${pieceKey}_x_${targetKey}`]++;
            }
        }
    }

    return userInitiatedTrades;
};

const generateGameHash = (gameInfo, username, moves) => {
  const moveString = moves.slice(0, 10).join('');
  const gameString = [
    username,
    gameInfo.opponent,
    moveString, 
    gameInfo.total_moves
  ].join('|');
  
  let hash = 0;
  for (let i = 0; i < gameString.length; i++) {
    const char = gameString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16);
};

const saveAnalyticsToSupabase = async (username, analyticsData, gameInfo, moves) => {
  try {
    await setUserContext(username);
    
    const gameHash = generateGameHash(gameInfo, username, moves);
    
    const { data: existingGame, error: checkError } = await supabase
      .from('games')
      .select('id, username')
      .eq('game_hash', gameHash)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existingGame) {
      return { 
        success: false, 
        message: 'Game already analyzed',
        existingAnalysis: true 
      };
    }
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({ username: username }, { onConflict: 'username' })
      .select()
      .single();

    if (userError) throw userError;

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        user_id: user.id,
        username: username,
        game_hash: gameHash,
        opponent: gameInfo.opponent,
        result: gameInfo.result,
        color: gameInfo.color,
        opening_eco: gameInfo.eco,
        opening_name: gameInfo.opening_name,
        total_moves: gameInfo.total_moves
      })
      .select()
      .single();

    if (gameError) throw gameError;

    const pieceData = analyticsData.pieceAnalytics;
    
    const analyticsInsert = {
      game_id: game.id,
      user_id: user.id,
      username: username,
      
      pawn_initiated_captures_good: pieceData.pawn.initiatedCaptures.good,
      pawn_initiated_captures_bad: pieceData.pawn.initiatedCaptures.bad,
      pawn_favorable_exchanges: pieceData.pawn.favorableExchanges,
      pawn_total_moves: pieceData.pawn.totalMoves,
      pawn_excellent_moves: pieceData.pawn.moveQuality.excellent,
      pawn_good_moves: pieceData.pawn.moveQuality.good,
      pawn_decent_moves: pieceData.pawn.moveQuality.decent || 0,
      pawn_poor_moves: pieceData.pawn.moveQuality.poor,
      pawn_decisive_moves: pieceData.pawn.decisiveMoves,
      pawn_tactical_moves: pieceData.pawn.tacticalMoves,
      pawn_early_game_activity: pieceData.pawn.earlyGameActivity,
      pawn_endgame_efficiency: pieceData.pawn.endgameEfficiency ?? -1,
      pawn_center_control: pieceData.pawn.centerControlContribution,
      pawn_survival_rate: pieceData.pawn.survivalRate,
      pawn_trade_success_rate: pieceData.pawn.tradeSuccessRate,
      pawn_impact_score: pieceData.pawn.impactScore,
      pawn_move_quality_score: pieceData.pawn.moveQualityScore,
      pawn_capture_rate: pieceData.pawn.captureRate,
      
      knight_initiated_captures_good: pieceData.knight.initiatedCaptures.good,
      knight_initiated_captures_bad: pieceData.knight.initiatedCaptures.bad,
      knight_favorable_exchanges: pieceData.knight.favorableExchanges,
      knight_total_moves: pieceData.knight.totalMoves,
      knight_excellent_moves: pieceData.knight.moveQuality.excellent,
      knight_good_moves: pieceData.knight.moveQuality.good,
      knight_decent_moves: pieceData.knight.moveQuality.decent || 0,
      knight_poor_moves: pieceData.knight.moveQuality.poor,
      knight_decisive_moves: pieceData.knight.decisiveMoves,
      knight_tactical_moves: pieceData.knight.tacticalMoves,
      knight_early_game_activity: pieceData.knight.earlyGameActivity,
      knight_endgame_efficiency: pieceData.knight.endgameEfficiency ?? -1,
      knight_center_control: pieceData.knight.centerControlContribution,
      knight_survival_rate: pieceData.knight.survivalRate,
      knight_trade_success_rate: pieceData.knight.tradeSuccessRate,
      knight_impact_score: pieceData.knight.impactScore,
      knight_move_quality_score: pieceData.knight.moveQualityScore,
      knight_capture_rate: pieceData.knight.captureRate,
      
      bishop_initiated_captures_good: pieceData.bishop.initiatedCaptures.good,
      bishop_initiated_captures_bad: pieceData.bishop.initiatedCaptures.bad,
      bishop_favorable_exchanges: pieceData.bishop.favorableExchanges,
      bishop_total_moves: pieceData.bishop.totalMoves,
      bishop_excellent_moves: pieceData.bishop.moveQuality.excellent,
      bishop_good_moves: pieceData.bishop.moveQuality.good,
      bishop_decent_moves: pieceData.bishop.moveQuality.decent || 0,
      bishop_poor_moves: pieceData.bishop.moveQuality.poor,
      bishop_decisive_moves: pieceData.bishop.decisiveMoves,
      bishop_tactical_moves: pieceData.bishop.tacticalMoves,
      bishop_early_game_activity: pieceData.bishop.earlyGameActivity,
      bishop_endgame_efficiency: pieceData.bishop.endgameEfficiency ?? -1,
      bishop_center_control: pieceData.bishop.centerControlContribution,
      bishop_survival_rate: pieceData.bishop.survivalRate,
      bishop_trade_success_rate: pieceData.bishop.tradeSuccessRate,
      bishop_impact_score: pieceData.bishop.impactScore,
      bishop_move_quality_score: pieceData.bishop.moveQualityScore,
      bishop_capture_rate: pieceData.bishop.captureRate,
      
      rook_initiated_captures_good: pieceData.rook.initiatedCaptures.good,
      rook_initiated_captures_bad: pieceData.rook.initiatedCaptures.bad,
      rook_favorable_exchanges: pieceData.rook.favorableExchanges,
      rook_total_moves: pieceData.rook.totalMoves,
      rook_excellent_moves: pieceData.rook.moveQuality.excellent,
      rook_good_moves: pieceData.rook.moveQuality.good,
      rook_decent_moves: pieceData.rook.moveQuality.decent || 0,
      rook_poor_moves: pieceData.rook.moveQuality.poor,
      rook_decisive_moves: pieceData.rook.decisiveMoves,
      rook_tactical_moves: pieceData.rook.tacticalMoves,
      rook_early_game_activity: pieceData.rook.earlyGameActivity,
      rook_endgame_efficiency: pieceData.rook.endgameEfficiency ?? -1,
      rook_center_control: pieceData.rook.centerControlContribution,
      rook_survival_rate: pieceData.rook.survivalRate,
      rook_trade_success_rate: pieceData.rook.tradeSuccessRate,
      rook_impact_score: pieceData.rook.impactScore,
      rook_move_quality_score: pieceData.rook.moveQualityScore,
      rook_capture_rate: pieceData.rook.captureRate,
      
      queen_initiated_captures_good: pieceData.queen.initiatedCaptures.good,
      queen_initiated_captures_bad: pieceData.queen.initiatedCaptures.bad,
      queen_favorable_exchanges: pieceData.queen.favorableExchanges,
      queen_total_moves: pieceData.queen.totalMoves,
      queen_excellent_moves: pieceData.queen.moveQuality.excellent,
      queen_good_moves: pieceData.queen.moveQuality.good,
      queen_decent_moves: pieceData.queen.moveQuality.decent || 0,
      queen_poor_moves: pieceData.queen.moveQuality.poor,
      queen_decisive_moves: pieceData.queen.decisiveMoves,
      queen_tactical_moves: pieceData.queen.tacticalMoves,
      queen_early_game_activity: pieceData.queen.earlyGameActivity,
      queen_endgame_efficiency: pieceData.queen.endgameEfficiency ?? -1,
      queen_center_control: pieceData.queen.centerControlContribution,
      queen_survival_rate: pieceData.queen.survivalRate,
      queen_trade_success_rate: pieceData.queen.tradeSuccessRate,
      queen_impact_score: pieceData.queen.impactScore,
      queen_move_quality_score: pieceData.queen.moveQualityScore,
      queen_capture_rate: pieceData.queen.captureRate
    };

    const { error: analyticsError } = await supabase
      .from('piece_analytics')
      .insert(analyticsInsert);

    if (analyticsError) throw analyticsError;

    await updateAggregatedStats(username);
    
    return { 
      success: true, 
      message: 'New game analyzed successfully',
      gameId: game.id 
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: error.message 
    };
  }
};

const updateAggregatedStats = async (username) => {
  try {
    await setUserContext(username);
    
    const { data: allAnalytics, error } = await supabase
      .from('piece_analytics')
      .select('*')
      .eq('username', username)

    if (error) throw error

    const gameCount = allAnalytics.length
    if (gameCount === 0) return

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    const validEndgameGames = allAnalytics.filter(a => 
      (a.pawn_endgame_efficiency || 0) > 0 && a.pawn_endgame_efficiency !== -1
    );
    const endgameCount = validEndgameGames.length;

    const aggregated = {
      user_id: user.id,
      username: username,
      games_analyzed: gameCount,
      last_updated: new Date().toISOString(),
      
      pawn_total_initiated_captures_good: allAnalytics.reduce((sum, a) => sum + (a.pawn_initiated_captures_good || 0), 0),
      pawn_total_initiated_captures_bad: allAnalytics.reduce((sum, a) => sum + (a.pawn_initiated_captures_bad || 0), 0),
      pawn_total_favorable_exchanges: allAnalytics.reduce((sum, a) => sum + (a.pawn_favorable_exchanges || 0), 0),
      pawn_total_moves: allAnalytics.reduce((sum, a) => sum + (a.pawn_total_moves || 0), 0),
      pawn_total_excellent_moves: allAnalytics.reduce((sum, a) => sum + (a.pawn_excellent_moves || 0), 0),
      pawn_total_good_moves: allAnalytics.reduce((sum, a) => sum + (a.pawn_good_moves || 0), 0),
      pawn_total_decent_moves: allAnalytics.reduce((sum, a) => sum + (a.pawn_decent_moves || 0), 0),
      pawn_total_poor_moves: allAnalytics.reduce((sum, a) => sum + (a.pawn_poor_moves || 0), 0),
      pawn_total_decisive_moves: allAnalytics.reduce((sum, a) => sum + (a.pawn_decisive_moves || 0), 0),
      pawn_avg_moves_per_game: allAnalytics.reduce((sum, a) => sum + (a.pawn_total_moves || 0), 0) / gameCount,
      pawn_avg_early_game_activity: allAnalytics.reduce((sum, a) => sum + (a.pawn_early_game_activity || 0), 0) / gameCount,
     pawn_avg_endgame_efficiency: (() => {
  const validValues = allAnalytics.filter(a => (a.pawn_endgame_efficiency || 0) > 0);
  return validValues.length > 0 ? validValues.reduce((sum, a) => sum + a.pawn_endgame_efficiency, 0) / validValues.length : 0;
})(),
      pawn_avg_center_control: allAnalytics.reduce((sum, a) => sum + (a.pawn_center_control || 0), 0) / gameCount,
      
      knight_total_initiated_captures_good: allAnalytics.reduce((sum, a) => sum + (a.knight_initiated_captures_good || 0), 0),
      knight_total_initiated_captures_bad: allAnalytics.reduce((sum, a) => sum + (a.knight_initiated_captures_bad || 0), 0),
      knight_total_favorable_exchanges: allAnalytics.reduce((sum, a) => sum + (a.knight_favorable_exchanges || 0), 0),
      knight_total_moves: allAnalytics.reduce((sum, a) => sum + (a.knight_total_moves || 0), 0),
      knight_total_excellent_moves: allAnalytics.reduce((sum, a) => sum + (a.knight_excellent_moves || 0), 0),
      knight_total_good_moves: allAnalytics.reduce((sum, a) => sum + (a.knight_good_moves || 0), 0),
      knight_total_decent_moves: allAnalytics.reduce((sum, a) => sum + (a.knight_decent_moves || 0), 0),
      knight_total_poor_moves: allAnalytics.reduce((sum, a) => sum + (a.knight_poor_moves || 0), 0),
      knight_total_decisive_moves: allAnalytics.reduce((sum, a) => sum + (a.knight_decisive_moves || 0), 0),
      knight_avg_moves_per_game: allAnalytics.reduce((sum, a) => sum + (a.knight_total_moves || 0), 0) / gameCount,
      knight_avg_early_game_activity: allAnalytics.reduce((sum, a) => sum + (a.knight_early_game_activity || 0), 0) / gameCount,
      knight_avg_endgame_efficiency: (() => {
  const validValues = allAnalytics.filter(a => (a.knight_endgame_efficiency || 0) > 0);
  return validValues.length > 0 ? validValues.reduce((sum, a) => sum + a.knight_endgame_efficiency, 0) / validValues.length : 0;
})(),
      knight_avg_center_control: allAnalytics.reduce((sum, a) => sum + (a.knight_center_control || 0), 0) / gameCount,
      
      bishop_total_initiated_captures_good: allAnalytics.reduce((sum, a) => sum + (a.bishop_initiated_captures_good || 0), 0),
      bishop_total_initiated_captures_bad: allAnalytics.reduce((sum, a) => sum + (a.bishop_initiated_captures_bad || 0), 0),
      bishop_total_favorable_exchanges: allAnalytics.reduce((sum, a) => sum + (a.bishop_favorable_exchanges || 0), 0),
      bishop_total_moves: allAnalytics.reduce((sum, a) => sum + (a.bishop_total_moves || 0), 0),
      bishop_total_excellent_moves: allAnalytics.reduce((sum, a) => sum + (a.bishop_excellent_moves || 0), 0),
      bishop_total_good_moves: allAnalytics.reduce((sum, a) => sum + (a.bishop_good_moves || 0), 0),
      bishop_total_decent_moves: allAnalytics.reduce((sum, a) => sum + (a.bishop_decent_moves || 0), 0),
      bishop_total_poor_moves: allAnalytics.reduce((sum, a) => sum + (a.bishop_poor_moves || 0), 0),
      bishop_total_decisive_moves: allAnalytics.reduce((sum, a) => sum + (a.bishop_decisive_moves || 0), 0),
      bishop_avg_moves_per_game: allAnalytics.reduce((sum, a) => sum + (a.bishop_total_moves || 0), 0) / gameCount,
      bishop_avg_early_game_activity: allAnalytics.reduce((sum, a) => sum + (a.bishop_early_game_activity || 0), 0) / gameCount,
     bishop_avg_endgame_efficiency: (() => {
  const validValues = allAnalytics.filter(a => (a.bishop_endgame_efficiency || 0) > 0);
  return validValues.length > 0 ? validValues.reduce((sum, a) => sum + a.bishop_endgame_efficiency, 0) / validValues.length : 0;
})(),
      bishop_avg_center_control: allAnalytics.reduce((sum, a) => sum + (a.bishop_center_control || 0), 0) / gameCount,
      
      rook_total_initiated_captures_good: allAnalytics.reduce((sum, a) => sum + (a.rook_initiated_captures_good || 0), 0),
      rook_total_initiated_captures_bad: allAnalytics.reduce((sum, a) => sum + (a.rook_initiated_captures_bad || 0), 0),
      rook_total_favorable_exchanges: allAnalytics.reduce((sum, a) => sum + (a.rook_favorable_exchanges || 0), 0),
      rook_total_moves: allAnalytics.reduce((sum, a) => sum + (a.rook_total_moves || 0), 0),
      rook_total_excellent_moves: allAnalytics.reduce((sum, a) => sum + (a.rook_excellent_moves || 0), 0),
      rook_total_good_moves: allAnalytics.reduce((sum, a) => sum + (a.rook_good_moves || 0), 0),
      rook_total_decent_moves: allAnalytics.reduce((sum, a) => sum + (a.rook_decent_moves || 0), 0),
      rook_total_poor_moves: allAnalytics.reduce((sum, a) => sum + (a.rook_poor_moves || 0), 0),
      rook_total_decisive_moves: allAnalytics.reduce((sum, a) => sum + (a.rook_decisive_moves || 0), 0),
      rook_avg_moves_per_game: allAnalytics.reduce((sum, a) => sum + (a.rook_total_moves || 0), 0) / gameCount,
      rook_avg_early_game_activity: allAnalytics.reduce((sum, a) => sum + (a.rook_early_game_activity || 0), 0) / gameCount,
      rook_avg_endgame_efficiency: (() => {
  const validValues = allAnalytics.filter(a => (a.rook_endgame_efficiency || 0) > 0);
  return validValues.length > 0 ? validValues.reduce((sum, a) => sum + a.rook_endgame_efficiency, 0) / validValues.length : 0;
})(),
      rook_avg_center_control: allAnalytics.reduce((sum, a) => sum + (a.rook_center_control || 0), 0) / gameCount,
      
      queen_total_initiated_captures_good: allAnalytics.reduce((sum, a) => sum + (a.queen_initiated_captures_good || 0), 0),
      queen_total_initiated_captures_bad: allAnalytics.reduce((sum, a) => sum + (a.queen_initiated_captures_bad || 0), 0),
      queen_total_favorable_exchanges: allAnalytics.reduce((sum, a) => sum + (a.queen_favorable_exchanges || 0), 0),
      queen_total_moves: allAnalytics.reduce((sum, a) => sum + (a.queen_total_moves || 0), 0),
      queen_total_excellent_moves: allAnalytics.reduce((sum, a) => sum + (a.queen_excellent_moves || 0), 0),
      queen_total_good_moves: allAnalytics.reduce((sum, a) => sum + (a.queen_good_moves || 0), 0),
      queen_total_decent_moves: allAnalytics.reduce((sum, a) => sum + (a.queen_decent_moves || 0), 0),
      queen_total_poor_moves: allAnalytics.reduce((sum, a) => sum + (a.queen_poor_moves || 0), 0),
      queen_total_decisive_moves: allAnalytics.reduce((sum, a) => sum + (a.queen_decisive_moves || 0), 0),
      queen_avg_moves_per_game: allAnalytics.reduce((sum, a) => sum + (a.queen_total_moves || 0), 0) / gameCount,
      queen_avg_early_game_activity: allAnalytics.reduce((sum, a) => sum + (a.queen_early_game_activity || 0), 0) / gameCount,
      queen_avg_endgame_efficiency: (() => {
  const validValues = allAnalytics.filter(a => (a.queen_endgame_efficiency || 0) > 0);
  return validValues.length > 0 ? validValues.reduce((sum, a) => sum + a.queen_endgame_efficiency, 0) / validValues.length : 0;
})(),
      queen_avg_center_control: allAnalytics.reduce((sum, a) => sum + (a.queen_center_control || 0), 0) / gameCount
    }

    const { error: upsertError } = await supabase
      .from('aggregated_stats')
      .upsert(aggregated, { onConflict: 'username' })

    if (upsertError) throw upsertError

  } catch (error) {
    console.error(`Error updating aggregated stats for ${username}:`, error)
  }
}

const getAggregatedData = async (username) => {
  try {
    await setUserContext(username);
    
    const { data: stats, error } = await supabase
      .from('aggregated_stats')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !stats) {
      return null
    }

    return {
      pieceAnalytics: {
        pawn: {
          initiatedCaptures: { 
            good: stats.pawn_total_initiated_captures_good, 
            bad: stats.pawn_total_initiated_captures_bad 
          },
          favorableExchanges: stats.pawn_total_favorable_exchanges,
          totalMoves: stats.pawn_total_moves,
          moveQuality: { 
            excellent: stats.pawn_total_excellent_moves, 
            good: stats.pawn_total_good_moves, 
            decent: stats.pawn_total_decent_moves, 
            poor: stats.pawn_total_poor_moves 
          },
          gamesPlayed: stats.games_analyzed,
          timesCaptured: Math.round(stats.games_analyzed * 0.7),
          decisiveMoves: stats.pawn_total_decisive_moves,
          averageMovesPerGame: parseFloat(stats.pawn_avg_moves_per_game.toFixed(1)),
          earlyGameActivity: parseFloat(stats.pawn_avg_early_game_activity.toFixed(1)),
          endgameEfficiency: stats.pawn_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.pawn_avg_endgame_efficiency.toFixed(1)) : "Insufficient endgame data",
          centerControlContribution: parseFloat(stats.pawn_avg_center_control.toFixed(1))
        },
        knight: {
          initiatedCaptures: { 
            good: stats.knight_total_initiated_captures_good, 
            bad: stats.knight_total_initiated_captures_bad 
          },
          favorableExchanges: stats.knight_total_favorable_exchanges,
          totalMoves: stats.knight_total_moves,
          moveQuality: { 
            excellent: stats.knight_total_excellent_moves, 
            good: stats.knight_total_good_moves, 
            decent: stats.knight_total_decent_moves, 
            poor: stats.knight_total_poor_moves 
          },
          gamesPlayed: stats.games_analyzed,
          timesCaptured: Math.round(stats.games_analyzed * 0.36),
          decisiveMoves: stats.knight_total_decisive_moves,
          averageMovesPerGame: parseFloat(stats.knight_avg_moves_per_game.toFixed(1)),
          earlyGameActivity: parseFloat(stats.knight_avg_early_game_activity.toFixed(1)),
          endgameEfficiency: stats.knight_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.knight_avg_endgame_efficiency.toFixed(1)) : "Insufficient endgame data",
          centerControlContribution: parseFloat(stats.knight_avg_center_control.toFixed(1))
        },
        bishop: {
          initiatedCaptures: { 
            good: stats.bishop_total_initiated_captures_good, 
            bad: stats.bishop_total_initiated_captures_bad 
          },
          favorableExchanges: stats.bishop_total_favorable_exchanges,
          totalMoves: stats.bishop_total_moves,
          moveQuality: { 
            excellent: stats.bishop_total_excellent_moves, 
            good: stats.bishop_total_good_moves, 
            decent: stats.bishop_total_decent_moves, 
            poor: stats.bishop_total_poor_moves 
          },
          gamesPlayed: stats.games_analyzed,
          timesCaptured: Math.round(stats.games_analyzed * 0.36),
          decisiveMoves: stats.bishop_total_decisive_moves,
          averageMovesPerGame: parseFloat(stats.bishop_avg_moves_per_game.toFixed(1)),
          earlyGameActivity: parseFloat(stats.bishop_avg_early_game_activity.toFixed(1)),
          endgameEfficiency: stats.bishop_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.bishop_avg_endgame_efficiency.toFixed(1)) : "Insufficient endgame data",
          centerControlContribution: parseFloat(stats.bishop_avg_center_control.toFixed(1))
        },
        rook: {
          initiatedCaptures: { 
            good: stats.rook_total_initiated_captures_good, 
            bad: stats.rook_total_initiated_captures_bad 
          },
          favorableExchanges: stats.rook_total_favorable_exchanges,
          totalMoves: stats.rook_total_moves,
          moveQuality: { 
            excellent: stats.rook_total_excellent_moves, 
            good: stats.rook_total_good_moves, 
            decent: stats.rook_total_decent_moves, 
            poor: stats.rook_total_poor_moves 
          },
          gamesPlayed: stats.games_analyzed,
          timesCaptured: Math.round(stats.games_analyzed * 0.36),
          decisiveMoves: stats.rook_total_decisive_moves,
          averageMovesPerGame: parseFloat(stats.rook_avg_moves_per_game.toFixed(1)),
          earlyGameActivity: parseFloat(stats.rook_avg_early_game_activity.toFixed(1)),
          endgameEfficiency: stats.rook_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.rook_avg_endgame_efficiency.toFixed(1)) : "Insufficient endgame data",
          centerControlContribution: parseFloat(stats.rook_avg_center_control.toFixed(1))
        },
        queen: {
          initiatedCaptures: { 
            good: stats.queen_total_initiated_captures_good, 
            bad: stats.queen_total_initiated_captures_bad 
          },
          favorableExchanges: stats.queen_total_favorable_exchanges,
          totalMoves: stats.queen_total_moves,
          moveQuality: { 
            excellent: stats.queen_total_excellent_moves, 
            good: stats.queen_total_good_moves, 
            decent: stats.queen_total_decent_moves, 
            poor: stats.queen_total_poor_moves 
          },
          gamesPlayed: stats.games_analyzed,
          timesCaptured: Math.round(stats.games_analyzed * 0.18),
          decisiveMoves: stats.queen_total_decisive_moves,
          averageMovesPerGame: parseFloat(stats.queen_avg_moves_per_game.toFixed(1)),
          earlyGameActivity: parseFloat(stats.queen_avg_early_game_activity.toFixed(1)),
          endgameEfficiency: stats.queen_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.queen_avg_endgame_efficiency.toFixed(1)) : "Insufficient endgame data",
          centerControlContribution: parseFloat(stats.queen_avg_center_control.toFixed(1))
        }
      }
    }
    
  } catch (error) {
    console.error(`Error getting aggregated data for ${username}:`, error)
    return null
  }
}

const dataextraction = async(username, sessionUser) => {
    const uname = username;
    const pgn = statsweget.cachedPGNData.pgn.pgn;
    
    const validation = validateUserInPGN(pgn, username);
    
    if (!validation.isAuthorized) {
        throw new Error("Unauthorized: User not found in PGN");
    }
    
    const white = validation.whitePlayer;
    const black = validation.blackPlayer;
    const isWhite = validation.userIsWhite;
    const opponent = isWhite ? black : white;
    
    const moves = statsweget.cachedPGNData.moves;
    const grades = statsweget.cachedPGNData.grades;
    const cploss = statsweget.cachedPGNData.cpbar;
    
    let captures = [];
    const chess = new Chess();
    for(const move of moves) {
        const result = chess.move(move);
        if(!result.captured) {
            captures.push("no capture");
        } else {
            captures.push(result.captured);
        }
    }

    const captureMetrics = identifyUserInitiatedTrades(moves, captures, grades, isWhite);
    const advancedMetrics = extractAdvancedMetrics(moves, grades, cploss, captures, isWhite, captureMetrics);

    const analyticsData = {
        pieceAnalytics: advancedMetrics
    };

    const piecemovenumber = () => {
        let opening = [];
        let middlegame = [];
        let endgame = [];
        let openinggrades = [];
        let middlegamegrades = [];
        let endgamegrades = [];
        let xCount = 0;
        
        moves.forEach((move, idx) => {
            if (move.includes("x")) {
                xCount++;
            }

            if (xCount <= 6 && idx <= 18) {
                opening.push(move);
                openinggrades.push(grades[idx]);
            } else if (xCount <= 12) {
                middlegame.push(move);
                middlegamegrades.push(grades[idx]);
            } else {
                endgame.push(move);
                endgamegrades.push(grades[idx]);
            }


        });

        let openingcpsum = 0;
        let openingcount = 0;
        for(let i = isWhite ? 1 : 0; i < opening.length; i += 2) {
            if(cploss[i] !== null && cploss[i] !== undefined && !isNaN(cploss[i])) {
                openingcpsum += Math.abs(cploss[i]);
                openingcount++;
            }
        }
        let avgopeningcp = opening.length > 0 ? openingcpsum / openingcount : 0;

        let midgamecpsum = 0;
        let middlegamecount = 0;
        for(let i = isWhite && opening.length % 2 === 0 ? opening.length + 1 : opening.length + 2; i < opening.length + middlegame.length; i += 2) {
            if(cploss[i] !== null && cploss[i] !== undefined && !isNaN(cploss[i])) {
                midgamecpsum += Math.abs(cploss[i]);
                middlegamecount++;
            }
        }
        let avgmidgamecp = middlegame.length > 0 ? midgamecpsum / middlegamecount : 0;

        let endgamecpsum = 0;
        let endgamecount = 0;
        for(let i = isWhite && (opening.length + middlegame.length) % 2 === 0 ? opening.length + middlegame.length + 1 : opening.length + middlegame.length + 2; i < opening.length + middlegame.length + endgame.length; i += 2) {
            if(cploss[i] !== null && cploss[i] !== undefined && !isNaN(cploss[i])) {
                endgamecpsum += Math.abs(cploss[i]);
                endgamecount++;
            }
        }
        let avgendgamecp = endgame.length > 0 ? endgamecpsum / endgamecount : 0;

        let openingBlunders =0;
        for(let i = isWhite ? 1 : 0; i < openinggrades.length; i += 2)
        {
        const grade = openinggrades[i] || 'Good';
        if (grade === 'Blunder') {
            openingBlunders++;
        }
        }


        function acplToAccuracy(acpl) {
        const k = 0.004;
        let acc = 100 * Math.exp(-k * acpl);
        return parseFloat(acc.toFixed(2));
    }

    const openingAccuracy = acplToAccuracy(avgopeningcp);




        console.log("openingcp",avgopeningcp);
        console.log("midgame",avgmidgamecp);
        console.log("endgame",avgendgamecp);
        console.log("opening grades",openinggrades);
        console.log("endgame",endgame);
        console.log("avgopening blunders ",openingBlunders);
        console.log("opening accuracy",openingAccuracy);

        return {
        avgOpeningCP: avgopeningcp,
        openingAccuracy: openingAccuracy,
        openingBlunders: openingBlunders
    };


        
    }

    piecemovenumber();

    function parseheader(pgntext) {
        const headers = {};
        const regex = /\[(\w+)\s+"([^"]+)"\]/g;
        let match;
        while ((match = regex.exec(pgntext)) !== null) {
            headers[match[1]] = match[2];
        }
        return headers;
    }

    function getBaseOpening(headers) {
        if (!headers.ECO) return null;
        return headers.ECO;
    }

    function getWinner(headers) {
        const result = headers.Result;
        if (result === "1-0") return headers.White;
        if (result === "0-1") return headers.Black;
        if (result === "1/2-1/2") return "Draw";
        return "Unknown";
    }

    function openingstats() {
        const headers = parseheader(pgn);
        const ECOcodepgn = getBaseOpening(headers);
        const opening = cleanopenings.filter(o => o.eco === ECOcodepgn);

        if (opening.length > 0) {
            console.log("opening(s) played:", opening.map(o => o.name));
        } else {
            console.log("unknown opening (eco:", ECOcodepgn, ")");
        }

        const resultofgame = getWinner(headers);
        if(resultofgame.toLowerCase() === uname.toLowerCase()) {
            console.log("user won");
        }
    }

    openingstats();




const extractOpeningName = (pgn) => {
    const ecoUrlMatch = pgn.match(/\[ECOUrl\s+"([^"]+)"\]/);
    if (ecoUrlMatch) {
        const url = ecoUrlMatch[1];
        const openingPart = url.split('/openings/')[1];
        if (openingPart) {
            let name = openingPart
                .split('-')
                .slice(0, 3) 
                .join(' ')
                .replace(/\d+.*$/, '') 
                .replace(/\.\.\.$/, '') 
                .trim();
            
            if (name && name.length > 3) {
                
                return name;
            }
        }
    }
    
    const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
    if (ecoMatch) {
        const ecoCode = ecoMatch[1];
        const opening = cleanopenings.find(o => o.eco === ecoCode);
        if (opening) {
            return opening.name;
        }
    }
    
    
    return 'Unknown Opening';
    
};






    const headers = parseheader(pgn);
    
    const resultMatch = pgn.match(/\[Result\s+"([^"]+)"\]/);
    const gameResult = resultMatch ? resultMatch[1] : "Unknown";
    let result;
    if (gameResult === "1-0") {
        result = isWhite ? "win" : "loss";
    } else if (gameResult === "0-1") {
        result = isWhite ? "loss" : "win";
    } else if (gameResult === "1/2-1/2") {
        result = "draw";
    } else {
        result = "unknown";
    }

    const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/);
    const ECOcodepgn = ecoMatch ? ecoMatch[1] : null;
    const opening = cleanopenings.filter(o => o.eco === ECOcodepgn);

    const gameInfo = {
        opponent: opponent,
        result: result,
        color: isWhite ? "white" : "black",
        eco: ECOcodepgn,
        opening_name: extractOpeningName(pgn),
        total_moves: moves.length
    };
    console.log("gameinfo",gameInfo);




const saveOpeningMetrics = async (username, openingName, openingData, gameInfo, gameId) => {
    try {
        await setUserContext(username);
        
        if (!openingData || typeof openingData.avgOpeningCP === 'undefined') {
            console.error("Invalid opening data:", openingData);
            return { success: false, error: "Invalid opening data" };
        }

        // Check if this specific game was already processed
        const { data: existingGameOpening, error: checkError } = await supabase
            .from('opening_stats')
            .select('*')  // Get all fields
            .eq('username', username)
            .eq('opening_name', openingName)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        if (existingGameOpening) {
            const processedGames = existingGameOpening.processed_games || [];
            if (processedGames.includes(String(gameId))) {
                return { success: true, message: 'Game already processed for this opening' };
            }
        }

        const existingStats = existingGameOpening || {
            total_games: 0,
            total_wins: 0,
            total_white_wins: 0,
            total_black_wins: 0,
            total_draws: 0,
            total_losses: 0,
            total_opening_acpl: 0,
            total_opening_blunders: 0,
            opening_accuracy: 0,
            processed_games: []
        };

        // Calculate new aggregated stats
        const newTotalGames = existingStats.total_games + 1;
        const newTotalWins = existingStats.total_wins + (gameInfo.result === 'win' ? 1 : 0);
        const newTotalWhiteWins = existingStats.total_white_wins + 
            ((gameInfo.color === 'white' && gameInfo.result === 'win') ? 1 : 0);
        const newTotalBlackWins = existingStats.total_black_wins + 
            ((gameInfo.color === 'black' && gameInfo.result === 'win') ? 1 : 0);
        const newTotalDraws = existingStats.total_draws + (gameInfo.result === 'draw' ? 1 : 0);
        const newTotalLosses = existingStats.total_losses + (gameInfo.result === 'loss' ? 1 : 0);
        const newTotalACPL = existingStats.total_opening_acpl + openingData.avgOpeningCP;
        const newTotalBlunders = existingStats.total_opening_blunders + openingData.openingBlunders;
        
        // Convert gameId to string and add to processed games
        const newProcessedGames = [...existingStats.processed_games, String(gameId)];

        const upsertData = {
            username: username,
            opening_name: openingName,
            total_games: newTotalGames,
            total_wins: newTotalWins,
            total_white_wins: newTotalWhiteWins,
            total_black_wins: newTotalBlackWins,
            total_draws: newTotalDraws,
            total_losses: newTotalLosses,
            total_opening_acpl: newTotalACPL,
            avg_opening_acpl: newTotalACPL / newTotalGames,
            opening_accuracy: (existingStats.opening_accuracy * existingStats.total_games + openingData.openingAccuracy) / newTotalGames,
            total_opening_blunders: newTotalBlunders,
            avg_opening_blunders: newTotalBlunders / newTotalGames,
            win_rate: (newTotalWins / newTotalGames) * 100,
            white_win_rate: newTotalWhiteWins > 0 ? (newTotalWhiteWins / Math.max(1, newTotalGames)) * 100 : 0,
            black_win_rate: newTotalBlackWins > 0 ? (newTotalBlackWins / Math.max(1, newTotalGames)) * 100 : 0,
            // Remove processed_games temporarily to avoid the error
            // processed_games: newProcessedGames,
            last_updated: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
            .from('opening_stats')
            .upsert(upsertData, { 
                onConflict: 'username,opening_name',
                ignoreDuplicates: false 
            });

        if (upsertError) {
            console.error("Upsert error:", upsertError);
            throw upsertError;
        }

        return { success: true };
    } catch (error) {
        console.error(`Error saving opening metrics for ${username}:`, error);
        return { success: false, error: error.message };
    }
};





















    

    const saveResult = await saveAnalyticsToSupabase(username, analyticsData, gameInfo, moves);

    if (saveResult.existingAnalysis) {
        return { 
            duplicate: true, 
            message: 'Game already in database',
            data: analyticsData 
        };
    }

    if (saveResult.success) {
        console.log(`New game added to ${username}'s stats!`);
    }





    
try {
    const openingName = extractOpeningName(pgn);
    const openingData = piecemovenumber();

    //console.log("Opening data being saved:", openingData);
    
    if (saveResult.success && saveResult.gameId) {
        const openingMetricsResult = await saveOpeningMetrics(username, openingName, openingData, gameInfo, saveResult.gameId);
        
        if (openingMetricsResult.success) {
            console.log(`Successfully saved opening metrics for ${username} - Opening: ${openingName}`);
        } else {
            console.error(`Failed to save opening metrics: ${openingMetricsResult.error}`);
        }
    }
} catch (error) {
    console.error('Error processing opening metrics:', error);
}



    return analyticsData;
}

export default stats;
export { getAggregatedData };