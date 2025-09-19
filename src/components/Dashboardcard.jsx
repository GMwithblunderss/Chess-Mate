import React from "react";
import "./css/dboard.css";
import { useNavigate } from "react-router-dom";
import Opening from "../pages/opening";

const Dboardcard = ({ heading, pelement, img ,route }) => {
    const navigate = useNavigate();
  return (
    <button className="dashboardbuttons" onClick={() =>{navigate(`${route}`)}}>
      <div className="dboardcrd">
        {img && (
          <div className="dboardcrd-image">
            <img src={img} alt={heading} />
          </div>
        )}
        <div className="dboardcrd-content">
          <h1>{heading}</h1>
          <p>{pelement}</p>
        </div>
      </div>
    </button>
  );
};

export default Dboardcard;
