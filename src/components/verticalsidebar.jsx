import React, { useState, useEffect } from "react";
import './css/unique-sidebar.css';
import { useNavigate } from 'react-router-dom';

const UniqueSidebars = () => {
    const navigate = useNavigate();
    const handleMatchClick = () => {
        navigate("/matches");
    }

    const handleHomeClick = () => {
        navigate("/home");
    }

    const handleDashboardClick = () => {
        navigate("/Dashboard");
    }

    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    }

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsMenuOpen(false);
            } else {
                setIsMenuOpen(true);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="vertical-menu-container">
            <div className="menu-toggle-btn">
                <button onPointerDown={toggleMenu}><h1>☰</h1></button>
            </div>
            <div className={`app-sidebar ${isMenuOpen ? "" : "closed"}`}>
                <div className="app-logo"><h1> Chess Mate</h1></div>
                <div className="nav-item-home"><button onClick={handleHomeClick}><h1> Home</h1></button></div>
                <div className="nav-item-matches"><button onClick={handleMatchClick}><h1> Matches</h1></button></div>
                <div className="nav-item-dashboard"><button onClick={handleDashboardClick}><h1> Dashboard</h1></button></div>
            </div>
        </div>
    );
};

export default UniqueSidebars;
