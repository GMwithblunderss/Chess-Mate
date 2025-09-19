import React, { useState } from "react";
import { createPortal } from "react-dom";
import "./css/card.css";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { API_URL } from "../pathconfig";
import { saveFile, deleteFile } from "../utils/fileStorage";
import analyteUser from "../wasmanalysisfromuser";

function CreateCards(props) {
    const [loading, setLoading] = useState(false);
    const [username, setusername] = useState("");
    const [pgnfromuser, setpgnfromuser] = useState("");
    const Navigate = useNavigate();

    const handleclick = async () => {
        if (loading) return;
        if (props.action === "fetch") {
            setLoading(true);
            if (typeof username === "string" && username.trim() !== "") {
                try {
                    const oldUsername = localStorage.getItem("currentUser");
                    if (oldUsername && oldUsername !== username) {
                        await deleteFile(`${oldUsername}.json`);
                    }
                    const res = await fetch(`${API_URL}/username`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username })
                    });
                    if (!res.ok) {
                        const msg = await res.text();
                        alert(`error ${msg || "inavlid Username or user doesnt exist"}`);
                        setLoading(false);
                        return;
                    }
                    const userData = await res.json();
                    await saveFile(`${username}.json`, userData);
                    localStorage.setItem("currentUser", username);
                    await fetch(`${API_URL}/statsuser`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username })
                    });
                    Navigate("/matches");
                } catch (e) {
                    console.log(e);
                    setLoading(false);
                }
            } else {
                alert("username need to be non empty text");
                setLoading(false);
            }
        } else if (props.action === "analyze") {
            setLoading(true);
            analyteUser();
            if (typeof pgnfromuser === "string" && pgnfromuser.trim() !== "") {
                try {
                    const currentUser = localStorage.getItem("currentUser");
                    const dep = await fetch(`${API_URL}/pgnfromuser`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pgnfromuser, username: currentUser })
                    });
                    if (!dep.ok) {
                        await dep.text();
                        alert("invalid PGN");
                        setLoading(false);
                        return;
                    }
                    const result = await dep.json();
                    const pgnString = result.pgn?.pgnfromuser;
                    if (!pgnString || typeof pgnString !== "string") {
                        console.error("PGN string missing");
                        setLoading(false);
                        return;
                    }
                    const whiteName = pgnString.match(/\[White\s+"([^"]+)"\]/)?.[1] || "White";
                    const blackName = pgnString.match(/\[Black\s+"([^"]+)"\]/)?.[1] || "Black";
                    const isWhite = currentUser && whiteName.toLowerCase() === currentUser.toLowerCase();
                    const userevalrating = isWhite ? result.whiterating : result.blackrating;
                    const oppevalrating = isWhite ? result.blackrating : result.whiterating;
                    const userrated = isWhite
                        ? (pgnString.match(/\[WhiteElo\s+"(\d+)"\]/)?.[1] || 0)
                        : (pgnString.match(/\[BlackElo\s+"(\d+)"\]/)?.[1] || 0);
                    const opprated = isWhite
                        ? (pgnString.match(/\[BlackElo\s+"(\d+)"\]/)?.[1] || 0)
                        : (pgnString.match(/\[WhiteElo\s+"(\d+)"\]/)?.[1] || 0);
                    const key = Date.now();
                    Navigate("/analysis", {
                        state: {
                            key,
                            pgn: pgnfromuser,
                            bestmoves: result.bestmoves,
                            moves: result.moves,
                            whiteacpl: result.whiteacpl,
                            blackacpl: result.blackacpl,
                            grading: result.grades,
                            evalbar: result.cpforevalbar,
                            cpbar: result.cpbar,
                            userwinpercents: result.userwinpercents,
                            userevalrating,
                            oppevalrating,
                            pvfen: result.pvfen,
                            booknames: result.booknames,
                            grademovenumber: result.grademovenumber,
                            blackgradeno: result.blackgradeno,
                            userusername: whiteName,
                            oppusername: blackName,
                            userrating: userrated,
                            opprating: opprated
                        }
                    });
                } catch (e) {
                    console.error(e);
                    setLoading(false);
                }
            } else {
                alert("PGN cannot be empty");
                setLoading(false);
            }
        }
    };

    const enterHandler = (e) => {
        if (e.key === "Enter") {
            handleclick();
        }
    };

    return (
        <>
            {loading && createPortal(
                <div className="loading-overlay">
                    <div className="loading-text">
                        {props.action === "fetch"
                            ? "Fetching Matches... Please wait."
                            : props.action === "analyze"
                                ? "Analyzing PGN... Please wait."
                                : "Loading..."}
                    </div>
                    <div className="spinner"></div>
                </div>,
                document.body
            )}
            <div className="card-root">
                <div className="card-glow"></div>
                <div className="card-sheen"></div>
                <div className="card">
                    <div className="card-top">
                        <div className="card-image-wrap">
                            <img src={props.image} className="card-image" alt={props.platform} />
                        </div>
                        <h2 className="card-title">{props.platform}</h2>
                    </div>
                    <div className="card-middle">
                        {props.action === "fetch" && (
                            <input
                                type="text"
                                placeholder={`${props.platform} username`}
                                onChange={(e) => setusername(e.target.value)}
                                value={username}
                                onKeyDown={enterHandler}
                                className="card-input"
                                disabled={loading}
                            />
                        )}
                        {props.action === "analyze" && (
                            <input
                                type="text"
                                placeholder="Paste PGN here"
                                onChange={(e) => setpgnfromuser(e.target.value)}
                                value={pgnfromuser}
                                onKeyDown={enterHandler}
                                className="card-input"
                                disabled={loading}
                            />
                        )}
                    </div>
                    <button className="card-btn" disabled={loading} onClick={handleclick}>
                        {props.action === "fetch" ? "Fetch Matches" : props.action === "analyze" ? "Analyze" : ""}
                    </button>
                </div>
            </div>
        </>
    );
}

export default CreateCards;