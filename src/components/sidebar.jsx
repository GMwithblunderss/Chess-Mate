import React, { useState } from "react";
import './css/sidebar.css';
import { useNavigate } from 'react-router-dom';
import { useEffect } from "react";

const Sidebars = () => {
    const navigate = useNavigate();
    const handleclick = () =>{
        navigate("/matches");
    }

    const clicked =() =>{
        navigate("/home");
    }

    const dboard =() =>
    {
        navigate("/Dashboard");
    }
    const [isCollapsed,setIsCollapsed] = useState(false);
    const toggleSidebar  =  ()=>{
        setIsCollapsed(!isCollapsed);
    }
        useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsCollapsed(true);
            } else {
                setIsCollapsed(false);
            }
        };

        handleResize();

        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="toggle"> <button onClick={toggleSidebar}><h1>☰</h1></button></div>
        <div className="Logo ">{!isCollapsed && <h1 > Chess Mate</h1>}</div>
        <div className="Home"><button  onClick={clicked}>{!isCollapsed && <h1> Home</h1>}</button></div>
        <div className ="Matches"><button onClick={handleclick}> {!isCollapsed && <h1 > Matches</h1>}</button></div>
        <div className="Dashboard"><button onClick={dboard}>{!isCollapsed && <h1> Dashboard</h1>}</button></div>
    
        </div>
    )
};

export default Sidebars ;