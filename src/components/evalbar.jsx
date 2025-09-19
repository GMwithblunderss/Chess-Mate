  import React ,{useRef} from "react";
  import "./css/evalbar.css";

  const Evalbar = ({cp}) =>
  {
      const maxcp =1000;
     const safeEval = Math.max(-maxcp, Math.min(maxcp, cp));
      let whitebarpercent = 50;





      if(cp !== null && cp !== undefined )
      {
          whitebarpercent = cp;
          
          
      }

      const blackbarpercent = 100 -whitebarpercent ;

    return (
      <div className="bar">
        <div style={{ height: `${whitebarpercent}%`, backgroundColor: "#fff" ,transition : "height 0.34s ease" }} />
        <div style={{ height: `${blackbarpercent}%`, backgroundColor: "#000", transition : "height 0.34s ease" }} />
      </div>
    );


      
  };
  export default Evalbar;