import { supabase, setUserContext } from './supabase.js';

export const getUserChessAnalytics = async (username) => {
  try {
    await setUserContext(username);
    
    const { data: stats, error } = await supabase
      .from('aggregated_stats')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !stats) {
      return null;
    }

    const getOpeningMetricName = (piece) => {
      const names = {
        'pawn': 'Center Control',
        'knight': 'Development Speed', 
        'bishop': 'Diagonal Dominance',
        'rook': 'Castling Readiness',
        'queen': 'Queen Safety'
      };
      return names[piece] || 'Opening Performance';
    };

    const realData = {
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
          averageMovesPerGame: parseFloat(stats.pawn_avg_moves_per_game?.toFixed(1) || 0),
          earlyGameActivity: parseFloat(stats.pawn_avg_early_game_activity?.toFixed(1) || 0),
          endgameEfficiency: stats.pawn_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.pawn_avg_endgame_efficiency.toFixed(1)) : 0,
          centerControlContribution: parseFloat(stats.pawn_avg_center_control?.toFixed(1) || 0)
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
          averageMovesPerGame: parseFloat(stats.knight_avg_moves_per_game?.toFixed(1) || 0),
          earlyGameActivity: parseFloat(stats.knight_avg_early_game_activity?.toFixed(1) || 0),  
          endgameEfficiency: stats.knight_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.knight_avg_endgame_efficiency.toFixed(1)) : 0,
          centerControlContribution: parseFloat(stats.knight_avg_center_control?.toFixed(1) || 0)
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
          averageMovesPerGame: parseFloat(stats.bishop_avg_moves_per_game?.toFixed(1) || 0),
           earlyGameActivity: parseFloat(stats.bishop_avg_early_game_activity?.toFixed(1) || 0),
          endgameEfficiency: stats.bishop_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.bishop_avg_endgame_efficiency.toFixed(1)) : 0,
          centerControlContribution: parseFloat(stats.bishop_avg_center_control?.toFixed(1) || 0)
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
          averageMovesPerGame: parseFloat(stats.rook_avg_moves_per_game?.toFixed(1) || 0),
           earlyGameActivity: parseFloat(stats.rook_avg_early_game_activity?.toFixed(1) || 0),
          endgameEfficiency: stats.rook_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.rook_avg_endgame_efficiency.toFixed(1)) : 0,
          centerControlContribution: parseFloat(stats.rook_avg_center_control?.toFixed(1) || 0)
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
          averageMovesPerGame: parseFloat(stats.queen_avg_moves_per_game?.toFixed(1) || 0),
           earlyGameActivity: parseFloat(stats.queen_avg_early_game_activity?.toFixed(1) || 0),
          endgameEfficiency: stats.queen_avg_endgame_efficiency > 0 ? 
            parseFloat(stats.queen_avg_endgame_efficiency.toFixed(1)) : 0,
          centerControlContribution: parseFloat(stats.queen_avg_center_control?.toFixed(1) || 0)
        }
      }
    };

    return realData;
    
  } catch (error) {
    return null;
  }
};
