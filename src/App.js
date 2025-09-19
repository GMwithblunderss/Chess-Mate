import React from 'react';
import './App.css';
import Sidebars from './components/sidebar';
import { useEffect } from 'react';
import Homepage from './pages/home';
import { BrowserRouter as Router, Routes, Route,useLocation } from 'react-router-dom';
import Matchpage from './pages/matches';
import Analytics from './pages/analyse';
import Dashboard from './pages/Dashboard';
import Opening from './pages/opening';
import Gamestage from './pages/gamestage';
import Gamestyle from './pages/gamestyle';
import Piece from './pages/pieceanalysis';
import { prewarmStockfish } from './wasmanalysis';
import { prewarmStockfishuser } from './wasmanalysisfromuser';

function App() {

  useEffect(() => {
    prewarmStockfish(); 
    prewarmStockfishuser();
  }, []);

  function AnalyticsWrapper() {
  const location = useLocation();
  const gameKey = location.state?.key ?? "default";
  return <Analytics key={gameKey} />;
}
  
  return (
    <Router>
    <div className="App">
      
    
    <Routes>
      <Route path='/' element ={<Homepage />} />
      <Route path='/matches' element = {<Matchpage />} />
      <Route path='/home' element ={<Homepage />} />
      <Route path='/analysis' element={<AnalyticsWrapper />} />
      <Route path ='/Dashboard' element ={<Dashboard name="Jonathan"/>} />
      <Route path = '/Opening' element ={ <Opening />} />
      <Route path = '/Stage' element ={ <Gamestage />} />
      <Route path = '/Playerstyle' element ={ <Gamestyle />} />
      <Route path = '/PieceAnalysis' element ={ <Piece />} />
    </Routes>
    </div>
    </Router>
  );
}

export default App;
