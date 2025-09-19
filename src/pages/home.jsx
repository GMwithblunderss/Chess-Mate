import React from "react";
import Sidebars from "../components/sidebar";
import './pages-css/home.css';
import CreateCards from "../components/username-fetcher";
import chessLogo from './images/chess.com.png'; 
import PGN from './images/pgn-file.png';

const Homepage = () =>{
    return (
        <div className="homepage">
        <div className="sidebar-div">
        
        <Sidebars />
        </div>


        <div className="card-container">
        <div className="card">
        <CreateCards  image ={chessLogo} platform ="chess.com" action ="fetch"/>
        </div>
        <div className="card">
        <CreateCards image={PGN} platform="Import PGN" action="analyze" />
        </div>
        </div>
        </div>
    );
}
export default Homepage;