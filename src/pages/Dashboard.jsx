import React from "react";
import Dboardcard from "../components/Dashboardcard";
import Sidebars from "../components/sidebar";
import "./pages-css/dashboard.css"
import Opening from "./opening";
const Dashboard = ({name}) =>
{
    const username = localStorage.getItem("currentUser");
    return (
        <div style={{ background: "#1C1F24",height : "100vh" ,width:"100vw"}}>
        <div className="rish">
       

        <div className="sidebarclass">
        <Sidebars />
        </div>
        

        <div className="welcome">
         <header><h1>Welcome Back {username}</h1></header>
         <div className="details"></div>
            
            <div className="griddiv">
                <Dboardcard heading={"Opening Stats"} route = {"/Opening"} />
                <Dboardcard heading ={"Game Phase"} route ={'/Stage'}/>
                <Dboardcard heading ={"Game Style"} route ={'/Playerstyle'}/>
                <Dboardcard heading ={"Piece Analysis"} route ={'/PieceAnalysis'}/>
                { /*<Dboardcard />
                <Dboardcard />*/}
            </div>
        </div>
        
        </div>

        </div>
    )
}
export default Dashboard;