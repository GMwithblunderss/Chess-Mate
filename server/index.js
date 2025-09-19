    import express from 'express';
    import cors from "cors";
    import axios from "axios";
    import fs, { writeFile } from 'fs'
    import path from 'path';
    import { fileURLToPath } from 'url';
    import { data } from 'react-router-dom';
    import { Chess } from 'chess.js';
    import { handlemovelist } from './engine/logic.js';
    import stats from './engine/stats.js';
    import { createProxyMiddleware } from 'http-proxy-middleware';
    //import dotenv from 'dotenv'
   // dotenv.config({ path: './backend.env' })

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    /*var name =""
    let npg;
    let mArray =[];
    let png;
    let pgnfromuserArray = [];
    let statsUser = "";
    let cachedPGNData = null;
    let storedanalysis=[];
    let bestanalysis =[];*/




    const app = express();
    const PORT = 5000;

    app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    next();
    });

    app.use(cors());
    app.use(express.json());

    /*app.get("/", (req, res) => {
        res.send("backend is running ");
    });*/

    const sessions = {};
    const userFiles = {};

    function getUserSession(username) {
    if (!sessions[username]) {
        sessions[username] = {
        npg: null,
        mArray: [],
        png: null,
        pnguser :null,
        pgnfromuserArray: [],
        statsUser: "",
        cachedPGNData: null,
        storedanalysis: [],
        chess: new Chess(),
        bestanalysis: [],
        storedanalysisUser :[],
        cachedPGNDatauser: null
        };
    }
    return sessions[username];
    }

    app.post("/username", async (req, res) => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const uname = req.body.username;
        const sessionUser = getUserSession(uname);
        const filePath = path.join(__dirname, 'users-data', `${uname}.txt`);
        console.log(`${uname}`);
        sessionUser.name =(`${uname}`);

        let fetchMonth = currentMonth;
    let fetchYear = currentYear;
    if (new Date().getDate() === 1) { 
        fetchMonth = currentMonth - 1;
        if (fetchMonth === 0) {
            fetchMonth = 12;
            fetchYear = currentYear - 1;
        }
    }
        
        try {
        const rep = await axios.get(`https://api.chess.com/pub/player/${uname}/games/${fetchYear}/${fetchMonth.toString().padStart(2,'0')}`);
            //userFiles[uname] = rep.data;
            console.log("file created succesfully");
            res.json(rep.data);
            return ;
        }
        catch (error) {
        if (error.response) {
            console.log("Chess.com responded with:", error.response.status, error.response.data);
            res.status(error.response.status).send(error.response.data);
        } else {
            console.log("Request failed:", error.message);
            res.status(500).send("Internal error fetching data");
        }
        
        }
        
    });


        app.post("/statsuser", async (req, res) => {
            const usedname = req.body.username;
            const sessionUser = getUserSession(usedname);
            sessionUser.statsUser = usedname;
            if (!usedname || typeof usedname !== "string") {
                return res.status(400).json({ error: "Invalid username" });
            }
            //statsUser = usedname; 
            console.log("Stats user set to:", usedname);
            res.json({ message: `Stats user ${usedname} stored successfully` });
        });


        app.get("/statsuser", (req, res) => {
            const uname = req.query.username;
        const sessionUser = getUserSession(uname);
            if (!sessionUser.statsUser) return res.status(404).json({ error: "No stats user set" });
            res.json({  usedname: sessionUser.statsUser });
        })




















    /*app.get("/userdata/:username" , (req,res) =>
    {
        const { username } = req.params;
        const filePath = path.join(__dirname,'users-data',`${username}.txt`);
    const data = userFiles[username];
    if (!data) {
        return res.status(404).send("No user data found");
    }
    res.json(data);
    }); */







    function waitForMovesArray(sessionUser, intervalMs = 50, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (Array.isArray(sessionUser.mArray) && sessionUser.mArray.length > 0) {
        return resolve();
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("Timed out waiting for moves array"));
      }
      setTimeout(check, intervalMs);
    };
    check();
  });
}








    app.post("/pgn",async (req,res) =>
    {
        const { username, pgn } = req.body;
            if (!username || !pgn) {
        throw new Error("Missing username or PGN");
        }
        console.log("username:", username);
        const sessionUser = getUserSession(username);
        if(typeof pgn !== "string" || !pgn.trim()) {
            return res.status(403).send("Missing or invalid PGN");
        }

        sessionUser.npg = {pgn};
        //console.log("pgn receive",sessionUser.npg);
        
        if(pgn)
        {
            //res.status(200).send("PGN received succesfully");
            sessionUser.cachedPGNData = null;
    sessionUser.mArray = [];
    sessionUser.storedanalysis = [];
            //console.log(sessionUser.npg)
            if (!sessionUser.npg /*|| !sessionUser.npg.pgn*/) {
            return res.status(400).json({ error: "No PGN data provided yet." });
        }
        movesarray(username);
        try{
        //console.log('sessionuser.marray',sessionUser.mArray);
            await waitForMovesArray(sessionUser);
            const bestmoved = await handlemovelist(sessionUser.mArray,username ,sessionUser);
            sessionUser.cachedPGNData = { pgn : sessionUser.npg,
                moves: sessionUser.mArray,
                bestmoves :bestmoved.bestMoves,
                whiteacpl: bestmoved.whiteACPL,
                blackacpl: bestmoved.blackACPL,
                blackrating :bestmoved.blackrating,
                whiterating : bestmoved.whiterating,
                grades : bestmoved.actualgrading,
                cpforevalbar :bestmoved.userevals,
                cpbar :bestmoved.diffed,
                grademovenumber : bestmoved.grademovenumbers,
                userwinpercents : bestmoved.userwinpercents,
                blackgradeno : bestmoved.blackgradeno,
                pvfen : bestmoved.pvfen}

            res.status(200).json(
            sessionUser.cachedPGNData);
            //console.log("session user cached pgndata",sessionUser.cachedPGNData)
                          try {
                await stats(username, sessionUser);
                } catch (err) {
                    console.error("Error running stats:", err);
                  }
        }
        catch(err)
        {
            sessionUser.cachedPGNData = null;
            console.log("couldnt get best moves",err);
        }
        


            //console.log("PGN received",JSON.stringify(pgn, null, 2));
            //movesarray();
        }
        else
        {
                console.error("Error in /pgn endpoint:", err); 
        res.status(500).json({ error: err.message });  
        }
    });





    app.post("/analyzewithstockfish",async (req,res) =>
    {
        const { username } = req.body;
        const sessionUser = getUserSession(username);
    sessionUser.storedanalysis = [];
    console.log("POST /analyzewithstockfish hit");
    const chess = new Chess();
    const fens = [];
    for (const move of sessionUser.mArray) {
    try {
    chess.move(move);
    fens.push(chess.fen());
    } catch (err) {
    console.warn("Invalid move:", move, err.message);
    fens.push(null);
    }
    }
    res.json({fens});
    });


    app.post("/wasmresults",async (req,res) =>
    {
    console.log("wasmresults hit");
    const { username} = req.body;
    console.log("usernameinwasm results",username);
    const sessionUser = getUserSession(username);
    sessionUser.storedanalysis =  req.body;
        //console.log("sessionUser.storedanalysis:", sessionUser.storedanalysis);
        //console.log("typeof storedanalysis:", typeof sessionUser.storedanalysis);
    res.json({status : "ok"});
    });


    function waitForResults(sessionUser,intervalMs = 500) {
    return new Promise((resolve) => {
        const check = () => {
        if (sessionUser.storedanalysis?.results?.length > 0){
            return resolve(sessionUser.storedanalysis);
        }
        setTimeout(check, intervalMs);
        };
        check();
    });
    }



    app.get("/getAnalysis", async (req, res) => {
    try {  
        const uname = req.query.username;
        console.log("uname ",uname);
        const sessionUser = getUserSession(uname);
        const analysis = await waitForResults(sessionUser); 
        //console.log("analysis is this ",analysis);
        res.json(analysis);
        //console.log("sessionUser.storedanalysis:", sessionUser.storedanalysis);
        //console.log("typeof storedanalysis:", typeof sessionUser.storedanalysis);
    } catch (err) {
        console.error("Error in /getAnalysis:", err.message);
        res.status(500).json({ error: err.message });
    }
    });



    app.get("/pgnd", async (req, res) => {
        const uname = req.query.username;
    const sessionUser = getUserSession(uname);
    if (!sessionUser.npg || !sessionUser.npg.pgn) {
        return res.status(400).json({ error: "No PGN data available yet." });
    }

        try {
            res.status(200).json({
            cachedPGNData: sessionUser.cachedPGNData
            });
        } catch (err) {
            console.error("Error recomputing stats:", err);
            res.status(500).json({ error: "Failed to compute stats" });
        }
    });


    app.post("/pgnfromuser" ,async (req ,res) =>
    {
        
        const { username, pgnfromuser } = req.body;
    const sessionUser = getUserSession(username);
    sessionUser.pgnfromuserArray = [];
    sessionUser.pnguser = { pgnfromuser };
        sessionUser.cachedPGNDatauser = null; 
        sessionUser.storedanalysisUser = [];
        console.log("Received PGN from frontend:", pgnfromuser);
        if(typeof pgnfromuser !== "string" || !pgnfromuser.trim()) {
        return res.status(403).send("Missing or invalid PGN");
        }
        pgnfromarraymoves(username);
        console.log(sessionUser.pgnfromuserArray);
        try{
            const bestmovedfromuser = await handlemovelist(sessionUser.pgnfromuserArray,username,sessionUser,{userPGN :true});
            res.status(200).json({
                moves: sessionUser.pgnfromuserArray,
                pgn :sessionUser.pnguser,
                bestmoves : bestmovedfromuser.bestMoves,
                whiteacpl: bestmovedfromuser.whiteACPL,
                blackacpl: bestmovedfromuser.blackACPL,
                blackrating :bestmovedfromuser.blackrating,
                whiterating : bestmovedfromuser.whiterating,
                grades : bestmovedfromuser.actualgrading,
                cpforevalbar :bestmovedfromuser.userevals,
                cpbar :bestmovedfromuser.diffed,
                grademovenumber : bestmovedfromuser.grademovenumbers,
                userwinpercents : bestmovedfromuser.userwinpercents,
                blackgradeno : bestmovedfromuser.blackgradeno,
                pvfen : bestmovedfromuser.pvfen,
                booknames :bestmovedfromuser.booknames
                
            }); 
        }
        catch(error)
        {
            console.error("error" ,error);
        }


    })

    function waitForPGNParsing(sessionUser, intervalMs = 100) {
        return new Promise(resolve => {
            const check = () => {
                if (sessionUser.pgnfromuserArray.length > 0) return resolve();
                setTimeout(check, intervalMs);
            };
            check();
        });
    }




    app.post("/analyzewithstockfishuser", async (req, res) => {
        const { username } = req.body;
        const sessionUser = getUserSession(username);
        sessionUser.storedanalysisUser = [];
        console.log("POST /analyzewithstockfish/user hit");
        await waitForPGNParsing(sessionUser);

        const chess = new Chess();
        const fens = [];
        console.log("moves ke array bc",sessionUser.pgnfromuserArray)

        for (const move of sessionUser.pgnfromuserArray) {
            try {
                chess.move(move);
                fens.push(chess.fen());
            } catch (err) {
                console.warn("Invalid move:", move, err.message);
                fens.push(null);
            }
        }

        res.json({ fens });
    });

    app.post("/wasmresultsuser", async (req, res) => {
        const { username } = req.body;
        const sessionUser = getUserSession(username);
        sessionUser.storedanalysisUser = req.body;
        console.log("POST /wasmresults/user hit", username);
        res.json({ status: "ok" });
    });


    function waitForUserResults(sessionUser, intervalMs = 500) {
        return new Promise((resolve) => {
            const check = () => {
                if (sessionUser.storedanalysisUser?.results?.length > 0) {
                    return resolve(sessionUser.storedanalysisUser);
                }
                setTimeout(check, intervalMs);
            };
            check();
        });
    }


    app.get("/getUserAnalysis", async (req, res) => {
        try {  
            const uname = req.query.username;
            const sessionUser = getUserSession(uname);
            const analysis = await waitForUserResults(sessionUser); 
            res.json(analysis);
            //console.log("res.json",res.json(analysis));
        } catch (err) {
            console.error("Error in /getUserAnalysis:", err.message);
            res.status(500).json({ error: err.message });
        }
    });







    /*app.get("/grades" , async (req,res) =>

    {

        try 
        {
            const diy = await handlemovelist(mArray);
            if(diy)
            {
                res.status(200).json({
                    grades : diy.grades,
                    whiterating : diy.whiterating,
                    blackrating :diy.blackrating
                });
            }
            else{
                res.status(400).json({error:"some error not defined tho"});
            }
        }
        catch(error)
        {
            console.log("981y");
            res.status(500).json({error:"no dataa"});
        }
    }); */










    function movesarray(username)
    {
        
            const sessionUser = getUserSession(username);
        let fixedPgn = sessionUser.npg.pgn
          .replace(/\{[^}]*\}/g, "")        // remove { ... }
            .replace(/\[%[^\]]*\]/g, "")      // remove [%eval ...] / [%clk ...]
            .replace(/\b(White|Black) (wins|resigns|abandons|checkmated|timeout|draws).*$/gmi, "")
            .replace(/\r?\n/g, "\n")
            .replace(/"$/, "") 
            .trim();
        //fixedPgn = fixedPgn.replace(/\{[^}]*\}/g, "");
        //console.log(fixedPgn);

        const chess = new Chess();
        //console.log('PGN being loaded:', JSON.stringify(npg));

        try{
            const ok = chess.loadPgn(fixedPgn);
            console.log("parsed",ok);
            sessionUser.mArray= chess.history().map(m => m.replace(/[+#?!]+/g, ''));

            console.log(sessionUser.mArray)
        }
        catch(err)
        {
            console.error("failed parsing",err)
        }
        

    }
    function pgnfromarraymoves(username)
    {
            const sessionUser = getUserSession(username);
            let fixedPgn = sessionUser.pnguser.pgnfromuser
                     .replace(/\{[^}]*\}/g, "")      
            .replace(/\[%[^\]]*\]/g, "")     
  .         replace(/\b(White|Black) (wins|resigns|abandons|checkmated|timeout|draws).*$/gmi, "")
            .replace(/\r?\n/g, "\n")
            .replace(/"$/, "") 
        .trim();
            //fixedPgn = fixedPgn.replace(/\{[^}]*\}/g, "");
        console.log("fixedpgn",fixedPgn);

        const chess = new Chess();
        //console.log('PGN being loaded:', JSON.stringify(npg));

        try{
            const ok = chess.loadPgn(fixedPgn);
            console.log("parsed",ok);
            sessionUser.pgnfromuserArray = chess.history().map(m => m.replace(/[+#?!]+/g, ''));

            //console.log(pgnfromuserArray)
        }
        catch(err)
        {
            console.error("failed parsing",err)
        }
    }



    /* app.get("/refresh", async (req, res) => {
        const uname = req.query.username;
        if (!uname) return res.status(400).send("Missing username");

        const sessionUser = getUserSession(uname);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        try {
            const rep = await axios.get(`https://api.chess.com/pub/player/${uname}/games/${currentYear}/${currentMonth.toString().padStart(2, '0')}`);
            userFiles[uname] = rep.data; // ✅ replace fs
            res.send(`${uname} data refreshed successfully`);
        } catch (error) {
            console.error("Error fetching data:", error.message);
            res.status(500).send("Failed to refresh data");
        }
    }); */


    if (process.env.NODE_ENV !== 'production') {
  app.use(
    '/',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      ws: true,
    })
  );
}
else{
    app.use(express.static(path.join(__dirname, '../build')));

    app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
    });
}

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
