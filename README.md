# ♟️ Chess Insight – PGN Analyzer & Game Visualizer

A fast and intuitive web app to analyze chess games using **Stockfish**, with detailed move grading, accuracy stats, and a clean board interface. Built using **React**, served through a **Node.js backend** — not WebAssembly-based yet.

---

## 🚀 Features

- 📥 Upload and Analyze any PGN file  
- 📈 **Move-by-Move Evaluation** (Best, Great, Good, Inaccuracy, Mistake, Blunder)  
- 🎯 **Accuracy Calculation** based on ACPL (Average Centipawn Loss)  
- 🧠 **Dynamic Annotations** on board for easy visual understanding  
- 🔁 Flip board orientation and player names  
- 🧮 Summary box showing player ratings, ACPL, accuracy, and move quality counts  
- ⬅️➡️ Navigate through move list with evaluation bar and arrow guidance  
- 🛠️ Fully frontend-backend integrated with Stockfish running on the user Browser
- Using Web Assembly computation completely Client side 

---

## 📦 Tech Stack

- ⚛️ **React** (frontend)  
- ♟️ **chess.js** (move validation and FEN generation)  
- 🧠 **Stockfish** (running on **Node.js** backend)  
- 📁 PGN parsing & evaluation pipelines handled in backend  

---

## ⚠️ Notes

- ❌ Not responsive yet – best viewed on desktop  

---

## 💡 Future Features (Coming Soon 🔮)

### ♟ Opening Stats
- Win/loss breakdown by opening name  
- ECO codes and success rate indicators  

### 🧭 Game Phase Analysis
- Classify mistakes by Opening / Middlegame / Endgame  
- Based on move numbers (e.g. moves ≤10 = opening)  

### ⚪⚫ Color Performance
- Track win rate and accuracy as White vs Black  

### 🏆 Best & Worst Games
- View top 3 and bottom 3 games by accuracy  
- Click to re-analyze with one tap  

### 📋 Sortable Game Table
- Table of all analyzed games  
- Sort by Accuracy, Result, Time Control, Opening  

### ⏱ Time Control Tagging
- Auto-tag games as Bullet / Blitz / Rapid  
- Uses `timeClass` info from Chess.com  

### 🔗 Chess.com Integration
- “View on Chess.com” button with external icon  

### 🧩 Most-Used Pieces
- Track frequency of piece moves  
- Show visual pie/bar chart  
- Insights like: “You favor knights over bishops”  

### 📈 Eval Graph & Eval Bar
- Dynamic evaluation line chart over time  
- Real-time eval bar updated per move  

---
