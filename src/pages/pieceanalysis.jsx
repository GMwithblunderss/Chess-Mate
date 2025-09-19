import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './pages-css/piece.css';
import { getUserChessAnalytics } from '../utils/chessData.js';

const Piece = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(storedUser);
    } else {
      setLoading(false);
      setError('No user found in localStorage');
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchChessData();
    }
  }, [currentUser]);

  const fetchChessData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const realData = await getUserChessAnalytics(currentUser);

      if (realData && realData.pieceAnalytics) {
        setData(realData);
      } else {
        setData(mockData);
      }

    } catch (err) {
      setError('Failed to load chess analysis data');
      setData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const pieceTypes = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen'];

  const calculatePieceStats = (piece) => {
    if (!data) return null;

    const pieceData = data.pieceAnalytics[piece.toLowerCase()];
    if (!pieceData) return null;

    const totalInitiatedTrades = (pieceData.initiatedCaptures.good || 0) + (pieceData.initiatedCaptures.bad || 0);
    const tradeSuccessRate = totalInitiatedTrades > 0 ? 
      ((pieceData.initiatedCaptures.good || 0) / totalInitiatedTrades) * 100 : 0;

    const totalMoves = pieceData.totalMoves || 0;
    const excellent = pieceData.moveQuality.excellent || 0;
    const good = pieceData.moveQuality.good || 0;
    const decent = pieceData.moveQuality.decent || 0;
    const poor = pieceData.moveQuality.poor || 0;

    const totalQualityMoves = excellent + good + poor;
    const moveQualityScore = totalQualityMoves > 0 ? 
      ((excellent * 5 + good * 4   + poor * 1) / (totalQualityMoves * 5)) * 100 : 0;

    const gamesPlayed = pieceData.gamesPlayed || 0;
    const timesCaptured = pieceData.timesCaptured || 0;
    const survivalRate = gamesPlayed > 0 ? 
      Math.max(0, Math.min(100, ((gamesPlayed - timesCaptured) / gamesPlayed) * 100)) : 0;

    const decisiveMoves = pieceData.decisiveMoves || 0;
    
    let baseImpactScore = totalMoves > 0 ? (decisiveMoves / totalMoves) * 100 : 0;
    
    let pieceImpactMultiplier = 1.0;
    let pieceImpactBonus = 0;
    
    switch(piece) {
      case 'Queen':
        pieceImpactMultiplier = 1.05;
        pieceImpactBonus = 3;
        break;
      case 'Rook':
        pieceImpactMultiplier = 1.04;
        pieceImpactBonus = 2;
        break;
      case 'Bishop':
        pieceImpactMultiplier = 1.02;
        pieceImpactBonus = 1;
        break;
      case 'Knight':
        pieceImpactMultiplier = 1.02;
        pieceImpactBonus = 1;
        break;
      case 'Pawn':
        pieceImpactMultiplier = 1.0;
        pieceImpactBonus = 0;
        break;
    }

    let enhancedImpactScore = (baseImpactScore * pieceImpactMultiplier) + pieceImpactBonus;
    
    const favorableExchanges = pieceData.favorableExchanges || 0;
    
    if (piece === 'Queen' && favorableExchanges > 5) {
      enhancedImpactScore += 2;
    }
    
    if (piece === 'Rook' && favorableExchanges > 3) {
      enhancedImpactScore += 1.5;
    }

    const tacticalContributionBonus = Math.min(3, (favorableExchanges * 0.5));
    
    if (piece === 'Queen' || piece === 'Rook') {
      enhancedImpactScore += tacticalContributionBonus;
    }

    const finalImpactScore = Math.min(100, Math.max(0, enhancedImpactScore));

    const earlyGameActivity = Math.max(0, Math.min(100, pieceData.earlyGameActivity || 0));
    const endgameEfficiency = Math.max(0, Math.min(100, pieceData.endgameEfficiency || 0));
    const centerControlContribution = Math.max(0, Math.min(100, pieceData.centerControlContribution || 0));
    const averageMovesPerGame = pieceData.averageMovesPerGame || 0;

    return {
      ...pieceData,
      tradeSuccessRate: Math.max(0, Math.min(100, tradeSuccessRate)),
      moveQualityScore: Math.max(0, Math.min(100, moveQualityScore)),
      totalInitiatedTrades,
      survivalRate,
      impactScore: finalImpactScore,
      earlyGameActivity,       
      endgameEfficiency,        
      centerControlContribution,
      averageMovesPerGame,
      totalMoves,
      gamesPlayed,
      timesCaptured,
      decisiveMoves,
      favorableExchanges: pieceData.favorableExchanges || 0,
      moveQuality: {
        excellent,
        good,
        poor
      },
      initiatedCaptures: {
        good: pieceData.initiatedCaptures.good || 0,
        bad: pieceData.initiatedCaptures.bad || 0
      }
    };
  };

  const getBestPerformingPiece = () => {
    let bestPiece = null;
    let bestScore = 0;

    pieceTypes.forEach(piece => {
      const stats = calculatePieceStats(piece);
      if (stats && stats.totalMoves > 0) {
        const overallScore = (stats.tradeSuccessRate*0.25 + stats.moveQualityScore*0.45 + stats.survivalRate*0.10  + stats.endgameEfficiency*0.20);
        if (overallScore > bestScore) {
          bestScore = overallScore;
          bestPiece = { piece, score: overallScore };
        }
      }
    });

    return bestPiece;
  };

  const getWorstPerformingPiece = () => {
    let worstPiece = null;
    let worstScore = 100;

    pieceTypes.forEach(piece => {
      const stats = calculatePieceStats(piece);
      if (stats && stats.totalMoves > 0) {
        const overallScore = (stats.tradeSuccessRate*0.25 + stats.moveQualityScore*0.45 + stats.survivalRate*0.10  + stats.endgameEfficiency*0.20);
        if (overallScore < worstScore) {
          worstScore = overallScore;
          worstPiece = { piece, score: overallScore };
        }
      }
    });

    return worstPiece;
  };

  const handlePieceClick = (piece) => {
    setSelectedPiece(selectedPiece === piece ? null : piece);
  };

  if (loading) {
    return (
      <div className="chess-analytics-main-container">
        <div className="chess-analytics-loading-wrapper">
          <div className="chess-analytics-loading-spinner"></div>
          <p className="chess-analytics-loading-text">Loading chess analytics for {currentUser}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chess-analytics-main-container">
        <div className="chess-analytics-error-wrapper">
          <h2 className="chess-analytics-error-title">Error</h2>
          <p className="chess-analytics-error-message">{error}</p>
          <p>Current user: {currentUser || 'None'}</p>
          <button onClick={() => {
            if (currentUser) fetchChessData();
          }} className="chess-analytics-retry-button">
            Retry Analysis
          </button>
          <button onClick={() => {
            localStorage.setItem('currentUser', 'test_user');
            window.location.reload();
          }} className="chess-analytics-retry-button">
            Set Test User
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="chess-analytics-main-container">
        <div className="chess-analytics-error-wrapper">
          <h2 className="chess-analytics-error-title">No User Selected</h2>
          <p className="chess-analytics-error-message">Please set a user </p>
          <button onClick={() => {
            localStorage.setItem('currentUser', 'test_user');
            window.location.reload();
          }} className="chess-analytics-retry-button">
            Set Test User
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="chess-analytics-main-container">
        <div className="chess-analytics-error-wrapper">
          <h2 className="chess-analytics-error-title">No Data Available</h2>
          <p className="chess-analytics-error-message">No chess data found for {currentUser}</p>
        </div>
      </div>
    );
  }

  const bestPiece = getBestPerformingPiece();
  const worstPiece = getWorstPerformingPiece();

  return (
    <div className="chess-analytics-main-container">
      <header className="chess-analytics-header-section">
        <h1 className="chess-analytics-main-title">{currentUser}'s Chess Performance Analytics</h1>
        <p className="chess-analytics-subtitle">User's comprehensive piece analysis</p>
      </header>

      <div className="chess-analytics-insights-grid">
        <div className="chess-analytics-insight-card">
          <h3 className="chess-analytics-insight-title">Best Performing Piece</h3>
          <div className="chess-analytics-insight-content">
            <span className="chess-analytics-piece-name">{bestPiece?.piece || 'N/A'}</span>
            <span className="chess-analytics-performance-score">{bestPiece ? `${bestPiece.score.toFixed(1)}%` : '0%'}</span>
          </div>
        </div>

        <div className="chess-analytics-insight-card">
          <h3 className="chess-analytics-insight-title">Needs Improvement</h3>
          <div className="chess-analytics-insight-content">
            <span className="chess-analytics-piece-name">{worstPiece?.piece || 'N/A'}</span>
            <span className="chess-analytics-poor-score">{worstPiece ? `${worstPiece.score.toFixed(1)}%` : '0%'}</span>
          </div>
        </div>
      </div>

      <div className="chess-analytics-metrics-container">
        <div className="chess-analytics-piece-overview-section">
          <h2 className="chess-analytics-section-title">Piece Performance Overview</h2>
          <p className="chess-analytics-instruction-text">Click on any piece to view detailed Stockfish-level analysis</p>

          <div className="chess-analytics-piece-cards-grid">
            {pieceTypes.map(piece => {
              const stats = calculatePieceStats(piece);
              if (!stats || stats.totalMoves === 0) return null;

              const isSelected = selectedPiece === piece;

              return (
                <div 
                  key={piece} 
                  className={`chess-analytics-piece-card ${isSelected ? 'chess-analytics-piece-card-selected' : ''}`}
                  onClick={() => handlePieceClick(piece)}
                  data-tooltip={`Click for detailed ${piece.toLowerCase()} analysis`}
                >
                  <div className="chess-analytics-piece-header">
                    <h3 className="chess-analytics-piece-title">{piece}</h3>
                    <span className="chess-analytics-piece-icon">{getPieceIcon(piece)}</span>
                  </div>

                  <div className="chess-analytics-key-metrics">
                    <div className="chess-analytics-metric-row">
                      <span className="chess-analytics-metric-label">Trade Success</span>
                      <span className="chess-analytics-metric-value">{stats.tradeSuccessRate.toFixed(1)}%</span>
                    </div>
                    <div className="chess-analytics-metric-row">
                      <span className="chess-analytics-metric-label">Move Quality</span>
                      <span className="chess-analytics-metric-value">{stats.moveQualityScore.toFixed(1)}%</span>
                    </div>
                    <div className="chess-analytics-metric-row">
                      <span className="chess-analytics-metric-label">Survival Rate</span>
                      <span className="chess-analytics-metric-value">{stats.survivalRate.toFixed(1)}%</span>
                    </div>
                    <div className="chess-analytics-metric-row">
                      <span className="chess-analytics-metric-label">Avg Moves/Game</span>
                      <span className="chess-analytics-metric-value">{stats.averageMovesPerGame.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="chess-analytics-overall-score">
                    <div className="chess-analytics-score-bar">
                      <div 
                        className="chess-analytics-score-fill" 
                        style={{ width: `${((stats.tradeSuccessRate*0.25 + stats.moveQualityScore*0.45 + stats.survivalRate*0.10  + stats.endgameEfficiency*0.20) )}%` }}
                      ></div>
                    </div>
                    <span className="chess-analytics-score-text">
                      {((stats.tradeSuccessRate*0.25 + stats.moveQualityScore*0.45 + stats.survivalRate*0.10  + stats.endgameEfficiency*0.20) ).toFixed(1)}% Overall
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedPiece && (
          <div className="chess-analytics-detailed-stats-section">
            <h2 className="chess-analytics-section-title">Detailed {selectedPiece} Analysis</h2>

            {(() => {
              const stats = calculatePieceStats(selectedPiece);
              if (!stats) return null;

              return (
                <div className="chess-analytics-detailed-grid">
                  <div className="chess-analytics-stat-card">
                    <h4 className="chess-analytics-stat-card-title">Trade Efficiency</h4>
                    <div className="chess-analytics-stat-details">
                      <div className="chess-analytics-detail-row">
                        <span>Initiated Trades:</span>
                        <span>{stats.totalInitiatedTrades}</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Success Rate:</span>
                        <span className="chess-analytics-success-rate">{stats.tradeSuccessRate.toFixed(1)}%</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Favorable Exchanges:</span>
                        <span>{stats.favorableExchanges}</span>
                      </div>
                    </div>
                  </div>

                  <div className="chess-analytics-stat-card">
                    <h4 className="chess-analytics-stat-card-title">Move Quality Distribution</h4>
                    <div className="chess-analytics-move-quality-bars">
                      <div className="chess-analytics-quality-item">
                        <span className="chess-analytics-quality-label">Excellent</span>
                        <div className="chess-analytics-quality-bar">
                          <div 
                            className="chess-analytics-quality-excellent-fill" 
                            style={{ width: `${stats.totalMoves > 0 ? (stats.moveQuality.excellent / stats.totalMoves) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="chess-analytics-quality-percent">
                          {stats.totalMoves > 0 ? ((stats.moveQuality.excellent / stats.totalMoves) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                      <div className="chess-analytics-quality-item">
                        <span className="chess-analytics-quality-label">Good</span>
                        <div className="chess-analytics-quality-bar">
                          <div 
                            className="chess-analytics-quality-good-fill" 
                            style={{ width: `${stats.totalMoves > 0 ? (stats.moveQuality.good / stats.totalMoves) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="chess-analytics-quality-percent">
                          {stats.totalMoves > 0 ? ((stats.moveQuality.good / stats.totalMoves) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                      <div className="chess-analytics-quality-item">
                        <span className="chess-analytics-quality-label">Poor</span>
                        <div className="chess-analytics-quality-bar">
                          <div 
                            className="chess-analytics-quality-poor-fill" 
                            style={{ width: `${stats.totalMoves > 0 ? (stats.moveQuality.poor / stats.totalMoves) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="chess-analytics-quality-percent">
                          {stats.totalMoves > 0 ? ((stats.moveQuality.poor / stats.totalMoves) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="chess-analytics-stat-card">
                    <h4 className="chess-analytics-stat-card-title">Game Impact</h4>
                    <div className="chess-analytics-stat-details">
                      <div className="chess-analytics-detail-row">
                        <span>Games Played:</span>
                        <span>{stats.gamesPlayed}</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Total Moves:</span>
                        <span>{stats.totalMoves}</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Decisive Moves:</span>
                        <span>{stats.decisiveMoves}</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Impact Score:</span>
                        <span className="chess-analytics-impact-score">{stats.impactScore.toFixed(1)}%</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Times Captured:</span>
                        <span>{stats.timesCaptured}</span>
                      </div>
                    </div>
                  </div>

                  <div className="chess-analytics-stat-card">
                    <h4 className="chess-analytics-stat-card-title">Positional Analysis</h4>
                    <div className="chess-analytics-stat-details">
                      <div className="chess-analytics-detail-row">
                        <span>Avg Moves/Game:</span>
                        <span>{stats.averageMovesPerGame.toFixed(1)}</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Early Game Activity:</span>
                        <span className="chess-analytics-stockfish-stat">{stats.earlyGameActivity.toFixed(1)}%</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Endgame Efficiency:</span>
                        <span className="chess-analytics-stockfish-stat">{stats.endgameEfficiency.toFixed(1)}%</span>
                      </div>
                      <div className="chess-analytics-detail-row">
                        <span>Center Control:</span>
                        <span className="chess-analytics-stockfish-stat">{stats.centerControlContribution.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

const getPieceIcon = (piece) => {
  const icons = {
    'Pawn': '♟',
    'Knight': '♞',
    'Bishop': '♝',
    'Rook': '♜',
    'Queen': '♛'
  };
  return icons[piece] || '';
};

const mockData = {
  pieceAnalytics: {
    pawn: {
      initiatedCaptures: { good: 45, bad: 12 },
      favorableExchanges: 38,
      totalMoves: 287,
      moveQuality: { excellent: 89, good: 156, decent: 32, poor: 10 },
      gamesPlayed: 50,
      timesCaptured: 35,
      decisiveMoves: 23,
      averageMovesPerGame: 5.7,
      earlyGameActivity: 78.2,
      endgameEfficiency: 65.4,
      centerControlContribution: 45.1
    },
    knight: {
      initiatedCaptures: { good: 28, bad: 15 },
      favorableExchanges: 22,
      totalMoves: 156,
      moveQuality: { excellent: 34, good: 89, decent: 24, poor: 9 },
      gamesPlayed: 50,
      timesCaptured: 18,
      decisiveMoves: 31,
      averageMovesPerGame: 3.1,
      earlyGameActivity: 82.7,
      endgameEfficiency: 71.3,
      centerControlContribution: 67.8
    },
    bishop: {
      initiatedCaptures: { good: 32, bad: 8 },
      favorableExchanges: 29,
      totalMoves: 198,
      moveQuality: { excellent: 56, good: 112, decent: 22, poor: 8 },
      gamesPlayed: 50,
      timesCaptured: 12,
      decisiveMoves: 18,
      averageMovesPerGame: 4.0,
      earlyGameActivity: 69.1,
      endgameEfficiency: 74.6,
      centerControlContribution: 58.3
    },
    rook: {
      initiatedCaptures: { good: 19, bad: 6 },
      favorableExchanges: 16,
      totalMoves: 134,
      moveQuality: { excellent: 41, good: 78, decent: 12, poor: 3 },
      gamesPlayed: 50,
      timesCaptured: 8,
      decisiveMoves: 26,
      averageMovesPerGame: 2.7,
      earlyGameActivity: 23.4,
      endgameEfficiency: 89.2,
      centerControlContribution: 71.5
    },
    queen: {
      initiatedCaptures: { good: 15, bad: 3 },
      favorableExchanges: 13,
      totalMoves: 89,
      moveQuality: { excellent: 45, good: 32, decent: 9, poor: 3 },
      gamesPlayed: 50,
      timesCaptured: 5,
      decisiveMoves: 34,
      averageMovesPerGame: 1.8,
      earlyGameActivity: 34.6,
      endgameEfficiency: 81.7,
      centerControlContribution: 76.2
    }
  }
};

export default Piece;
