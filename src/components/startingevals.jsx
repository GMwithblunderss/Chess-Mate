import React, { useState } from "react";
import "./css/gamebox.css";

const GameSummaryBox = ({ white, black, onreview }) => {
    const [display, setdisplay] = useState("");
    return (
        <div className="container" style={{ display: display }}>
            {/* Top Header */}
            <div className="header">
                <div className="playerBox">
                    <div className="nameWhite">{white.name}</div>
                    <div className="label">White</div>
                </div>
                <div className="vs">vs</div>
                <div className="playerBox">
                    <div className="nameBlack">{black.name}</div>
                    <div className="label">Black</div>
                </div>
            </div>

            {/* Accuracy Scores */}
            <div className="metricsRow">
                <div className="metric">
                    <div className="bigValue">{white.accuracy}</div>
                    <div
                        className="meterBar"
                        style={{
                            background: `linear-gradient(to right, #5f5 ${white.accuracy}%, #800 0%)`,
                        }}
                    />
                </div>
                <div className="metric">
                    <div className="bigValue">{black.accuracy}</div>
                    <div
                        className="meterBar"
                        style={{
                            background: `linear-gradient(to right, #5f5 ${black.accuracy}%, #800 0%)`,
                        }}
                    />
                </div>
            </div>

            {/* ELO Row */}
            <div className="eloRow">
                <div className="elo">{white.elo}</div>
                <div className="eloLabel">ELO</div>
                <div className="elo">{black.elo}</div>
            </div>

            {/* Good Moves Section */}
            <div className="moveSection">
                <div className="sectionHeader">
                    Good <span className="header-white">W</span> <span>B</span>
                </div>
                {["Great", "Best", "Good", "Okay", "Brilliant"].map((type) => (
                    <div className="row" key={type}>
                        <div className="labelMove">{type}</div>
                        <div className="count">{white.good[type] || 0}</div>
                        <div className="count">{black.good[type] || 0}</div>
                    </div>
                ))}
            </div>

            {/* Bad Moves Section */}
            <div className="moveSectionRed">
                <div className="sectionHeaderRed">Bad</div>
                {["Inaccuracy", "Mistake", "Blunder", "Miss", "Mate"].map((type) => (
                    <div className="row" key={type}>
                        <div className="labelMove">{type}</div>
                        <div className="count">{white.bad[type] || 0}</div>
                        <div className="count">{black.bad[type] || 0}</div>
                    </div>
                ))}
            </div>

            {/* Start Review Button */}
            <button
                onClick={() => {
                    setdisplay("none");
                    onreview();
                }}
                className="reviewButton"
            >
                Start Review
            </button>
        </div>
    );
};

export default GameSummaryBox;