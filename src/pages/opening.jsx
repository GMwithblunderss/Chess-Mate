import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebars from '../components/sidebar';
import './pages-css/opening.css';
import { getUserOpeningStats } from '../utils/openingstats.js'; 

const mockData = {
  metrics: { gamesPlayed: 1247, winPercentage: 67.3, avgAccuracy: 88.2, avgBlunders: 2.1 }
};

const Opening = ({ username: propUsername }) => {
  const [openings, setOpenings] = useState([]);
  const [selectedOpening, setSelectedOpening] = useState(null);

  const [activeFilter, setActiveFilter] = useState('winRate');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const didRunRef = useRef(false);

  const username =  localStorage.getItem('currentUser');

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (!username) {
          setOpenings([]);
          setSelectedOpening(null);
          return;
        }
        const data = await getUserOpeningStats(username);
        if (!mounted) return;
        const list = data?.allOpenings || [];
        setOpenings(list);
        setSelectedOpening(list[0] || null);
      } catch (e) {
        if (mounted) setError(e?.message || 'Failed to load openings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [username]);

  const filters = [
    { id: 'accuracy', label: 'Accuracy', icon: '🎯' },
    { id: 'winRate', label: 'Win %', icon: '📈' },
    { id: 'blunders', label: 'Blunders', icon: '⚠️' },
    { id: 'games', label: 'Games', icon: '🎮' }
  ];

  const topFive = useMemo(() => {
    const list = openings || [];
    const minGamesThreshold = 5;
    
    const reliable = list.filter(opening => opening.games >= minGamesThreshold);
    const unreliable = list.filter(opening => opening.games < minGamesThreshold);
    
    const sortFunction = (a, b) => {
      if (activeFilter === 'accuracy') return (b.accuracy ?? 0) - (a.accuracy ?? 0);
      if (activeFilter === 'blunders') return (b.blunders ?? Infinity) - (a.blunders ?? Infinity);
      if (activeFilter === 'games') return (b.games ?? 0) - (a.games ?? 0);
      return (b.winRate ?? 0) - (a.winRate ?? 0);
    };
    
    const sortedReliable = [...reliable].sort(sortFunction);
    const sortedUnreliable = [...unreliable].sort(sortFunction);
    
    const result = [
      ...sortedReliable.slice(0, 5),
      ...sortedUnreliable.slice(0, Math.max(0, 5 - sortedReliable.length))
    ];
    
    return result;
  }, [openings, activeFilter]);

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 0) {
      const suggestions = (openings || []).filter(o =>
        o.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (opening) => {
    setSelectedOpening(opening);
    setSearchQuery('');
    setShowSuggestions(false);
    setSearchSuggestions([]);
  };

  const handleSearchBlur = () => setTimeout(() => setShowSuggestions(false), 200);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const found = (openings || []).find(o =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (found) {
      setSelectedOpening(found);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleOpeningClick = (opening) => setSelectedOpening(opening);

  const PieChart = ({ opening }) => {
    const total = opening?.games || 0;
    const whitePercent = total ? ((opening.whiteWins || 0) / total) * 100 : 0;
    const blackPercent = total ? ((opening.blackWins || 0) / total) * 100 : 0;
    const drawPercent = total ? ((opening.draws || 0) / total) * 100 : 0;
    const lossPercent = total ? ((opening.losses || 0) / total) * 100 : 0;

    return (
      <div className="chess-opening-pie-chart-container">
        <div
          className="chess-opening-pie-chart"
          style={{
            '--white-percent': whitePercent,
            '--black-percent': blackPercent,
            '--draw-percent': drawPercent,
            '--loss-percent': lossPercent
          }}
        >
          <div className="chess-opening-pie-center">
            <span className="chess-opening-pie-total">{total}</span>
            <span className="chess-opening-pie-label">Games</span>
          </div>
        </div>

        <div className="chess-opening-pie-legend">
          <div className="chess-opening-legend-item">
            <div className="chess-opening-legend-color chess-opening-legend-white"></div>
            <span>White Wins ({opening?.whiteWins || 0})</span>
          </div>
          <div className="chess-opening-legend-item">
            <div className="chess-opening-legend-color chess-opening-legend-black"></div>
            <span>Black Wins ({opening?.blackWins || 0})</span>
          </div>
          <div className="chess-opening-legend-item">
            <div className="chess-opening-legend-color chess-opening-legend-draw"></div>
            <span>Draws ({opening?.draws || 0})</span>
          </div>
          <div className="chess-opening-legend-item">
            <div className="chess-opening-legend-color chess-opening-legend-loss"></div>
            <span>Losses ({opening?.losses || 0})</span>
          </div>
        </div>
      </div>
    );
  };

  const isSidebarCollapsed = false;

  return (
    <div className={`opening-layout ${isSidebarCollapsed ? 'opening-layout--collapsed' : ''}`}>
      <Sidebars />

      <main className="opening-main">
        <div className="opening-content">
          <div className="chess-opening-dashboard">
            <div className="chess-opening-main-content">
              <header className="chess-opening-dashboard-header">
                <h1>Chess Openings Dashboard</h1>
                <p className="chess-opening-header-subtitle">Analyze your opening performance and statistics</p>
              </header>

              <div className="chess-opening-metrics-grid">
                <div className="chess-opening-metric-card">
                  <div className="chess-opening-metric-icon">📊</div>
                  <div className="chess-opening-metric-content">
                    <span className="chess-opening-metric-value">
                      {mockData.metrics.gamesPlayed.toLocaleString()}
                    </span>
                    <span className="chess-opening-metric-label">Games Played</span>
                  </div>
                </div>

                <div className="chess-opening-metric-card">
                  <div className="chess-opening-metric-icon">🎯</div>
                  <div className="chess-opening-metric-content">
                    <span className="chess-opening-metric-value">{mockData.metrics.avgAccuracy}%</span>
                    <span className="chess-opening-metric-label">Avg Accuracy</span>
                  </div>
                </div>

                <div className="chess-opening-metric-card">
                  <div className="chess-opening-metric-icon">📈</div>
                  <div className="chess-opening-metric-content">
                    <span className="chess-opening-metric-value">{mockData.metrics.winPercentage}%</span>
                    <span className="chess-opening-metric-label">Win Rate</span>
                  </div>
                </div>

                <div className="chess-opening-metric-card">
                  <div className="chess-opening-metric-icon">⚠️</div>
                  <div className="chess-opening-metric-content">
                    <span className="chess-opening-metric-value">{mockData.metrics.avgBlunders}</span>
                    <span className="chess-opening-metric-label">Avg Blunders</span>
                  </div>
                </div>
              </div>

              <div className="chess-opening-dashboard-content">
                <div className="chess-opening-left-panel">
                  <div className="chess-opening-search-section">
                    <h3>Search Opening</h3>
                    <form onSubmit={handleSearch} className="chess-opening-search-form">
                      <div className="chess-opening-search-input-container">
                        <input
                          type="text"
                          placeholder="e.g. Queen's Gambit, Sicilian..."
                          value={searchQuery}
                          onChange={handleSearchInput}
                          onBlur={handleSearchBlur}
                          className="chess-opening-search-input"
                          disabled={loading}
                        />
                        <button type="submit" className="chess-opening-search-button" disabled={loading}>🔍</button>

                        {showSuggestions && (
                          <div className="chess-opening-search-suggestions">
                            {searchSuggestions.length > 0 ? (
                              searchSuggestions.map((opening) => (
                                <div
                                  key={opening.id}
                                  className="chess-opening-search-suggestion-item"
                                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(opening); }}
                                >
                                  <span className="chess-opening-suggestion-icon">{opening.icon}</span>
                                  <div className="chess-opening-suggestion-info">
                                    <span className="chess-opening-suggestion-name">{opening.name}</span>
                                    <span className="chess-opening-suggestion-games">{opening.games} games</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="chess-opening-search-no-results">
                                No openings found matching "{searchQuery}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="chess-opening-filters-section">
                    <h3>Sort By</h3>
                    <div className="chess-opening-filter-buttons">
                      {filters.map(filter => (
                        <button
                          key={filter.id}
                          className={`chess-opening-filter-button ${activeFilter === filter.id ? 'chess-opening-filter-active' : ''}`}
                          onClick={() => setActiveFilter(filter.id)}
                          disabled={loading}
                        >
                          <span className="chess-opening-filter-icon">{filter.icon}</span>
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="chess-opening-openings-list">
                    <h3>Top 5 Openings</h3>
                    {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
                    <div className="chess-opening-openings-items">
                      {loading ? (
                        <div>Loading openings...</div>
                      ) : topFive.length === 0 ? (
                        <div>No openings found.</div>
                      ) : (
                        topFive.map((opening, index) => (
                          <div
                            key={opening.id}
                            className={`chess-opening-opening-item ${selectedOpening?.id === opening.id ? 'chess-opening-opening-selected' : ''}`}
                            onClick={() => handleOpeningClick(opening)}
                          >
                            <div className="chess-opening-opening-rank">#{index + 1}</div>
                            <div className="chess-opening-opening-icon">{opening.icon}</div>
                            <div className="chess-opening-opening-info">
                              <span className="chess-opening-opening-name">{opening.name}</span>
                              <span className="chess-opening-opening-stat">
                                {activeFilter === 'accuracy' && `${opening.accuracy}% accuracy`}
                                {activeFilter === 'winRate' && `${opening.winRate}% win rate`}
                                {activeFilter === 'blunders' && `${opening.blunders} avg blunders`}
                                {activeFilter === 'games' && `${opening.games} games`}
                              </span>
                            </div>
                            <div className="chess-opening-opening-arrow">→</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="chess-opening-right-panel">
                  <div className="chess-opening-opening-details">
                    <div className="chess-opening-opening-header">
                      <div className="chess-opening-opening-title">
                        <span className="chess-opening-opening-emoji">{selectedOpening?.icon || '♟'}</span>
                        <h2>{selectedOpening?.name || (loading ? 'Loading...' : 'No opening selected')}</h2>
                      </div>
                      <div className="chess-opening-opening-games">{selectedOpening?.games ?? 0} games played</div>
                    </div>

                    <div className="chess-opening-opening-stats">
                      <div className="chess-opening-stat-card">
                        <div className="chess-opening-stat-value">{selectedOpening?.winRate ?? 0}%</div>
                        <div className="chess-opening-stat-label">Win Rate</div>
                      </div>
                      <div className="chess-opening-stat-card">
                        <div className="chess-opening-stat-value">{selectedOpening?.accuracy ?? 0}%</div>
                        <div className="chess-opening-stat-label">Accuracy</div>
                      </div>
                      <div className="chess-opening-stat-card">
                        <div className="chess-opening-stat-value">{selectedOpening?.blunders ?? 0}</div>
                        <div className="chess-opening-stat-label">Avg Blunders</div>
                      </div>
                      <div className="chess-opening-stat-card">
                        <div className="chess-opening-stat-value">{selectedOpening?.games ?? 0}</div>
                        <div className="chess-opening-stat-label">Games</div>
                      </div>
                    </div>

                    <div className="chess-opening-chart-section">
                      <h3>Results Distribution</h3>
                      {selectedOpening ? <PieChart opening={selectedOpening} /> : <div>No data</div>}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Opening;
