import React, { useEffect, useState, useMemo, useCallback } from "react";
import "./css/table.css";
import { useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import analyte from "../wasmanalysis";
import { API_URL } from "../pathconfig";
import { readFile } from "../utils/fileStorage";

const DEFAULT_PAGE_SIZE = 50;

function Matchtable({ rf }) {
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [loading, setLoading] = useState(false);

  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const [pendingPlayerSearchTerm, setPendingPlayerSearchTerm] = useState("");
  const [playerFilterActive, setPlayerFilterActive] = useState(false);

  const [resultFilter, setResultFilter] = useState("");
  const [resultFilterActive, setResultFilterActive] = useState(false);

  const [timeControlFilter, setTimeControlFilter] = useState("");
  const [timeControlFilterActive, setTimeControlFilterActive] = useState(false);

  const [previousPlayerSearch, setPreviousPlayerSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  useEffect(() => {
    const username = localStorage.getItem("currentUser") || "";
    setCurrentUser(username);
    if (username) {
      readFile(`${username}.json`)
        .then(reply => {
          if (reply && reply.games) setGames(reply.games);
        })
        .catch(() => {});
    }
  }, [rf]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (playerFilterActive && !event.target.closest(".player-filter-container") && !event.target.closest(".filter-button")) {
        setPlayerFilterActive(false);
        setPlayerSearchTerm(previousPlayerSearch);
      }
      if (resultFilterActive && !event.target.closest(".dropdown") && !event.target.closest(".filter-button")) {
        setResultFilterActive(false);
      }
      if (timeControlFilterActive && !event.target.closest(".dropdown") && !event.target.closest(".filter-button")) {
        setTimeControlFilterActive(false);
      }
      if (pageSizeOpen && !event.target.closest(".page-size")) {
        setPageSizeOpen(false);
      }
    };
    if (playerFilterActive || resultFilterActive || timeControlFilterActive || pageSizeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [playerFilterActive, resultFilterActive, timeControlFilterActive, previousPlayerSearch, pageSizeOpen]);

  useEffect(() => {
    setCurrentPage(0);
  }, [playerSearchTerm, resultFilter, timeControlFilter, pageSize]);

  function mapTimeControl(raw) {
    if (!raw) return "Unknown";
    const [base] = raw.split("+").map(Number);
    const baseSeconds = base || 0;
    if (baseSeconds <= 60) return "Bullet";
    if (baseSeconds <= 180) return "Blitz";
    if (baseSeconds <= 1800) return "Rapid";
    return "Classical";
  }

  const analyze = async (game) => {
    if (!currentUser) return;
    const isWhite = game.white.username.toLowerCase() === currentUser.toLowerCase();
    const userrated = isWhite ? game.white.rating : game.black.rating;
    const opprated = isWhite ? game.black.rating : game.white.rating;
    const userusername = isWhite ? game.white.username : game.black.username;
    const oppusername = isWhite ? game.black.username : game.white.username;

    NProgress.start();
    setLoading(true);
    try {
      const pgn = game.pgn;
      const resp = await fetch(`${API_URL}/pgn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn, username: currentUser }),
      });
      if (!resp.ok) throw new Error();
      const dataweget = await resp.json();
      const analysisKey = Date.now().toString();
      sessionStorage.setItem("analysisKey", analysisKey);
      navigate("/analysis", {
        state: {
          key: analysisKey,
          pgn,
            moves: dataweget.moves,
            bestmoves: dataweget.bestmoves,
            userrating: userrated,
            grading: dataweget.grades,
            opprating: opprated,
            evalbar: dataweget.cpforevalbar,
            cpbar: dataweget.cpbar,
            userevalrating: isWhite ? dataweget.whiterating : dataweget.blackrating,
            oppevalrating: isWhite ? dataweget.blackrating : dataweget.whiterating,
            userusername,
            oppusername,
            whiteacpl: dataweget.whiteacpl,
            blackacpl: dataweget.blackacpl,
            grademovenumber: dataweget.grademovenumber,
            userwinpercents: dataweget.userwinpercents,
            blackgradeno: dataweget.blackgradeno,
            pvfen: dataweget.pvfen,
            isWhite,
        },
      });
    } catch {
    } finally {
      NProgress.done();
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "end_time",
        header: "Date",
        cell: (info) => new Date(info.getValue() * 1000).toLocaleDateString(),
        meta: { className: "col-date table-date-column" },
      },
      {
        accessorFn: (row) => {
          const isWhite = row.white.username.toLowerCase() === currentUser?.toLowerCase();
          return isWhite
            ? `${row.white.username} vs ${row.black.username}`
            : `${row.black.username} vs ${row.white.username}`;
        },
        id: "players",
        header: () => (
            <div className="filter-header">
              <span className="filter-label">Players</span>
              <span className="filter-button" onClick={() => setPlayerFilterActive(s => !s)}>⏷</span>
            </div>
        ),
        cell: (info) => info.getValue(),
        meta: { className: "col-players" },
      },
      {
        accessorFn: (row) => {
          const isWhite = row.white.username.toLowerCase() === currentUser?.toLowerCase();
          return isWhite ? row.white.result : row.black.result;
        },
        id: "result",
        header: () => (
          <div className="filter-header">
            <span className="filter-label">Result</span>
            <span className="filter-button" onClick={() => setResultFilterActive(s => !s)}>⏷</span>
          </div>
        ),
        cell: (info) => info.getValue(),
        meta: { className: "col-result" },
      },
      {
        accessorFn: (row) => {
          const isWhite = row.white.username.toLowerCase() === currentUser?.toLowerCase();
          return isWhite ? row.white.rating : row.black.rating;
        },
        id: "rating",
        header: "Rating",
        cell: (info) => info.getValue(),
        meta: { className: "col-rating table-rating-column" },
      },
      {
        accessorKey: "url",
        header: "Game Link",
        cell: (info) => (
          <a href={info.getValue()} rel="noopener noreferrer" target="_blank">
            View
          </a>
        ),
        meta: { className: "col-link table-game-link-column" },
      },
      {
        accessorFn: (row) => {
          const tags = {};
          const tagRegex = /\[(\w+)\s+"([^"]+)"\]/g;
          let m;
          while ((m = tagRegex.exec(row.pgn)) !== null) tags[m[1]] = m[2];
          return mapTimeControl(tags.TimeControl);
        },
        id: "timecontrol",
        header: () => (
          <div className="filter-header">
            <span className="filter-label">Time</span>
            <span className="filter-button" onClick={() => setTimeControlFilterActive(s => !s)}>⏷</span>
          </div>
        ),
        cell: (info) => info.getValue(),
        meta: { className: "col-time" },
      },
      {
        id: "analyse",
        header: "Analyse",
        cell: (info) => (
          <button className="analyse-button" onClick={() => { analyze(info.row.original); analyte(); }}>
            Analyse
          </button>
        ),
        meta: { className: "col-analyse" },
      },
    ],
    [currentUser]
  );

  const tableInstance = useReactTable({
    data: games,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filteredRows = useMemo(() => {
    let rows = tableInstance.getCoreRowModel().rows;
    if (playerSearchTerm) {
      const s = playerSearchTerm.toLowerCase();
      rows = rows.filter(r => r.original.white.username.toLowerCase().includes(s) || r.original.black.username.toLowerCase().includes(s));
    }
    if (resultFilter) {
      rows = rows.filter(r => {
        const isWhite = r.original.white.username.toLowerCase() === currentUser?.toLowerCase();
        const result = (isWhite ? r.original.white.result : r.original.black.result).toLowerCase();
        return result === resultFilter.toLowerCase();
      });
    }
    if (timeControlFilter) {
      rows = rows.filter(r => {
        const tags = {};
        const tagRegex = /\[(\w+)\s+"([^"]+)"\]/g;
        let m;
        while ((m = tagRegex.exec(r.original.pgn)) !== null) tags[m[1]] = m[2];
        const tc = mapTimeControl(tags.TimeControl);
        return tc.toLowerCase() === timeControlFilter.toLowerCase();
      });
    }
    return rows.slice().reverse();
  }, [tableInstance.getCoreRowModel().rows, playerSearchTerm, resultFilter, timeControlFilter, currentUser]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handlePlayerSearch = () => {
    setPlayerSearchTerm(pendingPlayerSearchTerm);
    setPreviousPlayerSearch(pendingPlayerSearchTerm);
    setPlayerFilterActive(false);
  };

  const goToPage = useCallback((p) => {
    setCurrentPage(Math.max(0, Math.min(p, totalPages - 1)));
  }, [totalPages]);

  const pageNumbers = useMemo(() => {
    const arr = [];
    const maxVisible = 5;
    let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible);
    if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
    for (let i = start; i < end; i++) arr.push(i);
    return arr;
  }, [currentPage, totalPages]);

  return (
    <div className="table">
      {loading && (
        <div className="loading-overlay">
          Analyzing with Stockfish... Please wait.
        </div>
      )}

      <div className="table-scroll">
        <table className="main-table" border="0">
          <colgroup>
            <col className="w-date" />
            <col className="w-players" />
            <col className="w-result" />
            <col className="w-rating" />
            <col className="w-link" />
            <col className="w-time" />
            <col className="w-analyse" />
          </colgroup>
          <thead>
            {tableInstance.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className={header.column.columnDef.meta?.className}>
                    {header.id === "players" && playerFilterActive ? (
                      <div className="player-filter-container">
                        <input
                          className="player-filter-input"
                          type="text"
                          placeholder="Search"
                          value={pendingPlayerSearchTerm}
                          onChange={(e) => setPendingPlayerSearchTerm(e.target.value)}
                        />
                        <button className="player-filter-go" onClick={handlePlayerSearch}>Go</button>
                      </div>
                    ) : header.id === "result" && resultFilterActive ? (
                      <div className="dropdown dropdown-small">
                        <select
                          value={resultFilter}
                          onChange={(e) => {
                            setResultFilter(e.target.value);
                            setResultFilterActive(false);
                          }}
                        >
                          <option value="">All</option>
                          <option value="win">Win</option>
                          <option value="loss">Loss</option>
                          <option value="draw">Draw</option>
                          <option value="resigned">Resigned</option>
                          <option value="checkmated">Checkmated</option>
                          <option value="timeout">Timeout</option>
                          <option value="insufficient">Insufficient</option>
                          <option value="repetition">Repetition</option>
                        </select>
                      </div>
                    ) : header.id === "timecontrol" && timeControlFilterActive ? (
                      <div className="dropdown dropdown-small">
                        <select
                          value={timeControlFilter}
                          onChange={(e) => {
                            setTimeControlFilter(e.target.value);
                            setTimeControlFilterActive(false);
                          }}
                        >
                          <option value="">All</option>
                          <option value="bullet">Bullet</option>
                          <option value="blitz">Blitz</option>
                          <option value="rapid">Rapid</option>
                          <option value="classical">Classical</option>
                        </select>
                      </div>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paginatedRows.map((row, idx) => (
              <tr key={idx}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="footer-left">
          <span className="games-count">{filteredRows.length} games</span>
          <div className="page-size">
            <button
              type="button"
              className="page-size-trigger"
              onClick={() => setPageSizeOpen(o => !o)}
            >
              {pageSize} / page {pageSizeOpen ? "▾" : "▴"}
            </button>
            {pageSizeOpen && (
              <div className="page-size-menu">
                {[25,50,100,250].map(size => (
                  <div
                    key={size}
                    className={`page-size-item ${pageSize === size ? "active" : ""}`}
                    onClick={() => { setPageSize(size); setPageSizeOpen(false); }}
                  >
                    {size} / page
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="pagination">
          <button className="pagination-btn" onClick={() => goToPage(0)} disabled={currentPage === 0}>First</button>
          <button className="pagination-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}>Prev</button>
          {pageNumbers.map(p => (
            <button
              key={p}
              className={`pagination-btn ${p === currentPage ? "active" : ""}`}
              onClick={() => goToPage(p)}
            >
              {p + 1}
            </button>
          ))}
          <button className="pagination-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages - 1}>Next</button>
          <button className="pagination-btn" onClick={() => goToPage(totalPages - 1)} disabled={currentPage >= totalPages - 1}>Last</button>
        </div>
      </div>
    </div>
  );
}

export default Matchtable;
