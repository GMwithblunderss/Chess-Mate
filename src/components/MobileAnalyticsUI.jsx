import React from "react";
import { Chessboard } from 'react-chessboard';
import Evalbar from "./evalbar";
import GameSummaryBox from "./startingevals.jsx";
import Ansidebar from "./ansidebar";
import iconMap from "./icons";

const MobileAnalyticsUI = ({
    whiteuname,
    blackuname,
    boardOrientation,
    mainBoardOptions,
    pvtrying,
    pvOptions,
    grading,
    toSquare,
    Count,
    showIcon,
    squareCornerPosition,
    userwinpercents,
    evaled,
    whiteaccuracy,
    blackaccuracy,
    userusername,
    oppusername,
    userrealrating,
    opprealrating,
    isWhite,
    grademovenumber,
    blackgradeno,
    increase,
    decrease,
    reset,
    moves,
    pgn,
    booknames,
    handlecount,
    flipboard,
    showtactic,
}) => {
    return (
        <div className="mobile-view">
            <div className="board-section-mobile">
                <div className="evalbar-container-mobile">
                    <Evalbar cp={userwinpercents[evaled] ?? 53} />
                </div>
                <div className="chessboard-container-mobile">
                    <div className="player-name">{blackuname}</div>
                    <Chessboard id="mobile-main-board" boardOrientation={boardOrientation} position={mainBoardOptions.position} arrows={mainBoardOptions.arrows} />
                    <div className="player-name">{whiteuname}</div>
                    {/* Grade icon overlay */}
                    {Count > 1 && (() => {
                        const moveindex = Count - 1;
                        if (moveindex < 0) return null;
                        const square = toSquare[moveindex];
                        const grade = grading[moveindex - 1];
                        const Icon = iconMap[grade];
                        if (pvtrying) return null;
                        if (!square || !Icon) return null;
                        const iconSize = 24; // Smaller icon for mobile
                        const { left, top } = squareCornerPosition(square, 340, iconSize, "top-left"); // Smaller board size for mobile
                        return (
                            <div
                                className="grade-icon-overlay"
                                style={{
                                    left: left,
                                    top: top,
                                    width: iconSize,
                                    height: iconSize,
                                }}
                            >
                                {showIcon && (<Icon style={{ width: iconSize, height: iconSize, fill: "#fff" }} />)}
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div className="summary-section-mobile">
                <GameSummaryBox
                    white={{ name: `${isWhite ? userusername : oppusername}`, accuracy: `${whiteaccuracy}`, elo: `${isWhite ? userrealrating : opprealrating}`, good: { Best: grademovenumber[0], Great: grademovenumber[5], Okay: grademovenumber[3], Good: grademovenumber[4], Brilliant: grademovenumber[7] }, bad: { Mistake: grademovenumber[1], Inaccuracy: grademovenumber[6], Blunder: grademovenumber[2], Miss: grademovenumber[8], Mate: grademovenumber[9] } }}
                    black={{ name: `${isWhite ? oppusername : userusername}`, accuracy: `${blackaccuracy}`, elo: `${isWhite ? opprealrating : userrealrating}`, good: { Best: blackgradeno[0], Great: blackgradeno[5], Okay: blackgradeno[3], Good: blackgradeno[4], Brilliant: blackgradeno[7] }, bad: { Mistake: blackgradeno[1], Inaccuracy: blackgradeno[6], Blunder: blackgradeno[2], Miss: blackgradeno[8], Mate: blackgradeno[9] } }}
                />
            </div>
            
            <div className="control-panel-mobile">
                <button className="control-button" onClick={decrease}>Previous</button>
                <button className="control-button" onClick={increase}>Next</button>
                <button className="control-button" onClick={flipboard}>Flip Board</button>
                <button className="control-button" onClick={showtactic}>{pvtrying ? "Back" : "Show Tactic"}</button>
            </div>
        </div>
    );
};

export default MobileAnalyticsUI;