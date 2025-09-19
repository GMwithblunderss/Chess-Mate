import React, { useEffect, useRef, useState } from "react";
import "./css/AnsidebarHorizontal.css";

const AnsidebarHorizontal = ({
  handlecount,
  onIncrease,
  onDecrease,
  movelist,
  pgn,
  counting,
  display,
  onflip,
  showtactic,
  pvtrying,
  booknames,
}) => {
  const [opening, setopening] = useState("");
  const moveLogRef = useRef(null);
  const currentMoveRef = useRef(null);

  useEffect(() => {
    const getopening = () => {
      const match = pgn.match(
        /\[ECOUrl\s*"\s*https:\/\/www\.chess\.com\/openings\/(.+?)"\s*\]/i
      );
      if (match && match[1]) {
        setopening(match[1]);
      } else {
        setopening(booknames[booknames.length - 1]);
      }
    };
    getopening();
  }, [pgn, counting, booknames]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (pvtrying) return;
      if (e.key === "ArrowRight") {
        onIncrease();
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onDecrease();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onIncrease, onDecrease, pvtrying]);

  useEffect(() => {
    if (currentMoveRef.current && moveLogRef.current) {
      const { offsetLeft, offsetWidth } = currentMoveRef.current;
      const { scrollLeft, clientWidth } = moveLogRef.current;
      if (
        offsetLeft < scrollLeft ||
        offsetLeft + offsetWidth > scrollLeft + clientWidth
      ) {
        moveLogRef.current.scrollTo({
          left: offsetLeft - clientWidth / 2 + offsetWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }, [counting, movelist]);

  return (
    <div className="ah-sidebar" style={{ display }}>
      <div className="ah-moveBox">
        <h3 className="ah-moveTitle">Move Log </h3>
        <h4 className="ah-opening" title={opening}>
          {opening}
        </h4>
        <div className="ah-moveLogLine" ref={moveLogRef}>
          {movelist.map((m, index) => (
            <button
              key={index}
              className={
                "ah-moveBtn" +
                (index === counting - 1 ? " ah-moveBtn-active" : "")
              }
              ref={index === counting - 1 ? currentMoveRef : null}
              onClick={() => {
                if (typeof handlecount === "function") handlecount(index);
                else console.error("handlecount is not a function", handlecount);
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="ah-controls">
        <div className="ah-controls-row">
          <button
            className="ah-navBtn"
            onPointerDown={() => handlecount(0)}
            disabled={pvtrying || counting === 0}
            aria-label="To first move"
          >
            &#x23EE;
          </button>
          <button
            className="ah-navBtn"
            onPointerDown={onDecrease}
            disabled={pvtrying}
            aria-label="Back"
          >
            &#x276E;
          </button>
          <button
            className="ah-navBtn"
            onPointerDown={onIncrease}
            disabled={pvtrying}
            aria-label="Forward"
          >
            &#x276F;
          </button>
          <button
            className="ah-navBtn"
            onPointerDown={() => handlecount(movelist.length)}
            disabled={pvtrying}
            aria-label="To last move"
          >
            &#x23ED;
          </button>
          <button
            className="ah-flipBtn"
            onPointerDown={onflip}
            disabled={pvtrying}
            aria-label="Flip board"
            tabIndex={0}
          >
            <svg width="16" height="16" viewBox="0 0 20 20">
              <path
                d="M16.5 13.5V17h-3.5"
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M16.5 17c-2.5-4-7-7-12-7"
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M3.5 6.5V3h3.5"
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M3.5 3c2.5 4 7 7 12 7"
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
        <button
          className="ah-tacticBtn"
          onClick={showtactic}
          style={{ minWidth: 90 }}
        >
          {!pvtrying ? "Show Tactic" : "Hide tactic"}
        </button>
      </div>
    </div>
  );
};

export default AnsidebarHorizontal;