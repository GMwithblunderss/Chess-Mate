import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Sidebars from "../components/sidebar";
import { useLocation } from "react-router-dom";
import Ansidebar from "../components/ansidebar";
import iconMap from "../components/icons";
import Evalbar from "../components/evalbar";
import GameSummaryBox from "../components/startingevals.jsx";
import "./pages-css/analyse.css"; 
import AnsidebarHorizontal from "../components/horizontalansidebar.jsx";
import UniqueSidebars from "../components/verticalsidebar.jsx";

const Analytics = () => {
    const location = useLocation();
    const gameDataRef = useRef(null);
    
    const gameData = useMemo(() => {
        const state = location.state;
        if (!state?.key || !state?.moves?.length || !state?.pgn) {
            return null;
        }
        return state;
    }, [location.state]);

    if (!gameData) {
        return (
            <div className="analytics-loading-container">
                <div className="analytics-loading-text">Loading analysis...</div>
            </div>
        );
    }

    if (gameDataRef.current?.key !== gameData.key) {
        gameDataRef.current = gameData;
        return <AnalyticsCore key={gameData.key} gameData={gameData} />;
    }

    return <AnalyticsCore key={gameData.key} gameData={gameData} />;
};

const AnalyticsCore = ({ gameData }) => {
    const {
        pgn, moves, bestmoves, grading, userwinpercents, grademovenumber,
        blackgradeno, pvfen, booknames, userevalrating, oppevalrating,
        userrating, opprating, userusername, oppusername, whiteacpl,
        blackacpl, isWhite
    } = gameData;

    const [Count, setCount] = useState(0);
    const [arrows, setarrows] = useState([]);
    const [showIcon, setShowIcon] = useState(false);
    const [displyansidebar, setdisplayansidebar] = useState("none");
    const [boardOrientation, setboardOrientation] = useState("white");
    const [mainboard, setmainboard] = useState("");
    const [pvtrying, setpvtrying] = useState(false);
    const [pvindex, setpvindex] = useState(0);
    const [pvframe, setpvframe] = useState(0);
    const [boardSize, setBoardSize] = useState(640);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [reviewStarted, setReviewStarted] = useState(false);
    const [whiteuname, setwhiteuname] = useState("White Player");
    const [blackuname, setblackuname] = useState("Black Player");

    const boardRef = useRef(null);

    const derivedData = useMemo(() => {
        const chess = new Chess();
        const fens = [chess.fen()];
        moves.forEach(move => {
            try {
                chess.move(move);
                fens.push(chess.fen());
            } catch (err) {
                console.error("Error with position:", err);
            }
        });

        const fromSquares = [];
        const toSquares = [];
        for (const move of bestmoves) {
            if (typeof move === "string" && move.length >= 4) {
                fromSquares.push(move.substring(0, 2));
                toSquares.push(move.substring(2, 4));
            } else {
                fromSquares.push(null);
                toSquares.push(null);
            }
        }

        const tochess = new Chess();
        const toSquare = [];
        for (const moved of moves) {
            if (typeof moved === "string" && moved.length >= 2) {
                const result = tochess.move(moved);
                if (result && result.to) {
                    toSquare.push(result.to);
                }
            }
        }

        return { fens, fromSquares, toSquares, toSquare };
    }, [moves, bestmoves]);

    useEffect(() => {
        const timer = setTimeout(() => setShowIcon(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!boardRef.current) return;
        const observer = new ResizeObserver(entries => {
            setBoardSize(entries[0].contentRect.width);
        });
        observer.observe(boardRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        try {
            const whiteMatch = pgn.match(/\[White\s+"(.+?)"\]/);
            const blackMatch = pgn.match(/\[Black\s+"(.+?)"\]/);
            if (whiteMatch?.[1]) setwhiteuname(whiteMatch[1]);
            if (blackMatch?.[1]) setblackuname(blackMatch[1]);
        } catch (error) {
            console.error("Error parsing PGN:", error);
        }
    }, [pgn]);

    useEffect(() => {
        const arrowcount = Count - 1;
        if (arrowcount >= 5 &&
            arrowcount < derivedData.fromSquares.length &&
            derivedData.fromSquares[arrowcount] &&
            derivedData.toSquares[arrowcount] && 
            !pvtrying) {
            setarrows([{
                startSquare: derivedData.fromSquares[arrowcount],
                endSquare: derivedData.toSquares[arrowcount],
                color: "blue"
            }]);
        } else {
            setarrows([]);
        }
    }, [Count, derivedData.fromSquares, derivedData.toSquares, pvtrying]);

    useEffect(() => {
        if (!pvtrying || !pvfen.length) return;

        const interval = setInterval(() => {
            setpvframe(prev => {
                const currentpv = pvfen[pvindex - 1] || [];
                const newFrame = prev < Math.min(13, currentpv.length) ? prev + 1 : prev;
                if (newFrame === prev) {
                    clearInterval(interval);
                }
                return newFrame;
            });
        }, 800);
        
        return () => clearInterval(interval);
    }, [pvtrying, pvfen, pvindex]);

    function acplToAccuracy(acpl) {
        const k = 0.004;
        let acc = 100 * Math.exp(-k * acpl);
        return parseFloat(acc.toFixed(2));
    }

    const whiteaccuracy = acplToAccuracy(whiteacpl);
    const blackaccuracy = acplToAccuracy(blackacpl);

    const handlecount = (value) => {
        setCount(value);
        setTimeout(() => setCount(prev => prev + 1), 10);
    };

    const flipboard = () => {
        if (boardOrientation === "white") {
            setboardOrientation("black");
            const temp = whiteuname;
            setwhiteuname(blackuname);
            setblackuname(temp);
        } else {
            setboardOrientation("white");
            const temp = whiteuname;
            setwhiteuname(blackuname);
            setblackuname(temp);
        }
    };

    const showtactic = () => {
        setpvtrying(prev => !prev);
        setpvindex(Count);
        setmainboard(pvtrying ? "" : "none");
        setpvframe(0);
    };

    const increase = () => {
        if (Count < derivedData.fens.length - 1) setCount(Count + 1);
    };

    const decrease = () => {
        if (Count > 0) setCount(Count - 1);
    };

    const reset = () => setCount(0);

    const onstartreview = () => {
        setReviewStarted(true);
        setdisplayansidebar("");
    };

    function squareCornerPosition(square, boardSize, iconSize = 0.05625 * boardSize, corner = "top-left") {
        const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = parseInt(square[1], 10) - 1;
        const squareSize = boardSize / 8;

        let left = file * squareSize;
        let top = (7 - rank) * squareSize;

        if (boardOrientation === "black") {
            left = (7 - file) * squareSize;
            top = rank * squareSize;
        }

        let offsetX = 0.65 * squareSize;
        let offsetY = 0.3125 * squareSize;
        
        if (corner === "top-right") {
            offsetX = squareSize - iconSize - 0.1 * squareSize;
            offsetY = 0.125 * squareSize;
        } else if (corner === "bottom-left") {
            offsetX = 0.15 * squareSize;
            offsetY = squareSize - iconSize - 0.125 * squareSize;
        } else if (corner === "bottom-right") {
            offsetX = squareSize - iconSize - 0.1 * squareSize;
            offsetY = squareSize - iconSize - 0.125 * squareSize;
        }
        
        return { left: left + offsetX, top: top + offsetY };
    }

    const userrealrating = Math.round(((0.5 * userrating) + (0.5 * userevalrating)) / 50) * 50;
    const opprealrating = Math.round(((0.5 * opprating) + (0.5 * oppevalrating)) / 50) * 50;

    const currentpv = pvfen[pvindex - 1] || [];
    const safeCount = Math.min(Math.max(Count, 0), derivedData.fens.length - 1);
    const evaled = Count > 1 ? Math.floor((Count - 1)) : -1;

    const options = {
        position: derivedData.fens[safeCount],
        id: "board",
        arrows,
        boardOrientation: boardOrientation
    };

    const pvoptions = {
        position: pvtrying && currentpv ? currentpv[pvframe] || new Chess().fen() : new Chess().fen(),
        boardOrientation: boardOrientation
    };

    return (
        <div className="analytics-root">
            {windowWidth > 768 ? (<Sidebars />) : (<UniqueSidebars />)}

            <div className="boardplusside">
                <div className="boardpluseval">
                    <div className="analytics-evalbar">
                        <Evalbar cp={userwinpercents[evaled] ?? 53} />
                    </div>
                    <div className={`analytics-board-container${mainboard === "none" ? " analytics-board-hidden" : ""}`} ref={boardRef}>
                        <div className="analytics-board-header">
                            <header>{blackuname}</header>
                        </div>
                        <Chessboard options={options} />
                        <div className="analytics-board-footer">
                            <footer>{whiteuname}</footer>
                        </div>
                        {Count > 1 && (() => {
                            const moveindex = Count - 1;
                            if (moveindex < 0) return null;
                            const square = derivedData.toSquare[moveindex];
                            const grade = grading[moveindex - 1];
                            const Icon = iconMap[grade];
                            if (pvtrying) return null;
                            if (!square || !Icon) return null;
                            const iconSize = 0.05 * boardSize;
                            const { left, top } = squareCornerPosition(square, boardSize, iconSize, "top-left");
                            return (
                                <div
                                    className="analytics-icon-container"
                                    style={{
                                        left: left,
                                        top: top,
                                        width: iconSize,
                                        height: iconSize
                                    }}
                                >
                                    {showIcon && (
                                        <Icon className="analytics-move-icon-svg" style={{ width: iconSize, height: iconSize }} />
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {pvtrying && (
                        <div className="analytics-board-container">
                            <div className="analytics-board-header">
                                <header>{blackuname}</header>
                            </div>
                            <Chessboard options={pvoptions} />
                            <div className="analytics-board-footer">
                                <footer>{whiteuname}</footer>
                            </div>
                        </div>
                    )}
                </div>
                <div className="anbar">
                    {windowWidth > 768 ? (
                        <Ansidebar
                            onIncrease={increase}
                            onDecrease={decrease}
                            onReset={reset}
                            movelist={moves}
                            pgn={pgn}
                            counting={Count}
                            display={displyansidebar}
                            onflip={flipboard}
                            showtactic={showtactic}
                            pvtrying={pvtrying}
                            booknames={booknames}
                            handlecount={handlecount}
                        />
                    ) : (
                        <AnsidebarHorizontal                      
                            onIncrease={increase}
                            onDecrease={decrease}
                            onReset={reset}
                            movelist={moves}
                            pgn={pgn}
                            counting={Count}
                            display={displyansidebar}
                            onflip={flipboard}
                            showtactic={showtactic}
                            pvtrying={pvtrying}
                            booknames={booknames}
                            handlecount={handlecount}
                        />
                    )}
                </div>
            </div>
            {!reviewStarted && (
                <div className="gamebox">      
                    <GameSummaryBox 
                        white={{ 
                            name: `${isWhite ? userusername : oppusername}`, 
                            accuracy: `${whiteaccuracy}`, 
                            elo: `${isWhite ? userrealrating : opprealrating}`, 
                            good: { 
                                Best: grademovenumber[0], 
                                Great: grademovenumber[5], 
                                Okay: grademovenumber[3], 
                                Good: grademovenumber[4],
                                Brilliant: grademovenumber[7] 
                            }, 
                            bad: { 
                                Mistake: grademovenumber[1], 
                                Inaccuracy: grademovenumber[6], 
                                Blunder: grademovenumber[2],
                                Miss: grademovenumber[8],
                                Mate: grademovenumber[9] 
                            } 
                        }}
                        black={{ 
                            name: `${isWhite ? oppusername : userusername}`, 
                            accuracy: `${blackaccuracy}`, 
                            elo: `${isWhite ? opprealrating : userrealrating}`, 
                            good: { 
                                Best: blackgradeno[0], 
                                Great: blackgradeno[5], 
                                Okay: blackgradeno[3], 
                                Good: blackgradeno[4],
                                Brilliant: blackgradeno[7] 
                            }, 
                            bad: { 
                                Mistake: blackgradeno[1], 
                                Inaccuracy: blackgradeno[6], 
                                Blunder: blackgradeno[2],
                                Miss: blackgradeno[8],
                                Mate: blackgradeno[9] 
                            } 
                        }}
                        onreview={onstartreview}
                    />
                </div> 
            )}
        </div>
    );
};

export default Analytics;
