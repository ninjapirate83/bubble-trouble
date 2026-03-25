import { LEVELS } from '../game/levels';

export function GameOverlayModals({
  showLevelModal,
  setShowLevelModal,
  showScoresMsg,
  setShowScoresMsg,
  startGame,
}) {
  return (
    <>
      {showLevelModal && (
        <div style={{
          position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(0,0,0,0.72)",borderRadius:4,
        }} onClick={()=>setShowLevelModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0e1a10",border:"2px solid rgba(180,130,60,0.7)",borderRadius:6,
            padding:"22px 28px",minWidth:260,maxHeight:"70%",overflowY:"auto",
            boxShadow:"0 0 40px rgba(0,0,0,0.8)",
          }}>
            <div style={{fontFamily:"monospace",color:"#ffcc44",fontSize:13,letterSpacing:3,marginBottom:16,textAlign:"center"}}>
              SELECT LEVEL
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {LEVELS.map((lv,i)=>(
                <button key={i} onClick={()=>{setShowLevelModal(false);startGame(i);}} style={{
                  background:"rgba(255,200,50,0.08)",border:"1px solid rgba(255,200,50,0.3)",
                  borderRadius:3,padding:"6px 10px",cursor:"pointer",textAlign:"left",
                  fontFamily:"monospace",color:"#ffdd88",fontSize:11,transition:"all 120ms",
                }}
                onMouseEnter={e=>{e.target.style.background="rgba(255,200,50,0.22)";e.target.style.color="#fff";}}
                onMouseLeave={e=>{e.target.style.background="rgba(255,200,50,0.08)";e.target.style.color="#ffdd88";}}
                >
                  <span style={{color:"rgba(255,200,50,0.5)",marginRight:5}}>{i+1}.</span>{lv.name}
                </button>
              ))}
            </div>
            <div style={{marginTop:14,textAlign:"center",fontFamily:"monospace",fontSize:10,color:"rgba(180,160,100,0.45)"}}>
              ESC or click outside to close
            </div>
          </div>
        </div>
      )}

      {showScoresMsg && (
        <div style={{
          position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(0,0,0,0.72)",borderRadius:4,
        }} onClick={()=>setShowScoresMsg(false)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#0e1218",border:"2px solid rgba(180,130,60,0.7)",borderRadius:6,
            padding:"32px 40px",textAlign:"center",
            boxShadow:"0 0 40px rgba(0,0,0,0.8)",
          }}>
            <div style={{fontFamily:"monospace",color:"#ffcc44",fontSize:22,fontWeight:"bold",letterSpacing:2,marginBottom:10}}>
              SCORES
            </div>
            <div style={{fontFamily:"monospace",color:"rgba(200,180,120,0.8)",fontSize:13,marginBottom:20}}>
              Coming soon!
            </div>
            <div style={{fontFamily:"monospace",fontSize:10,color:"rgba(150,130,80,0.5)"}}>
              click to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
