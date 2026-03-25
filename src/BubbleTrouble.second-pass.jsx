import { useState, useEffect, useRef, useCallback } from 'react';
import { COLS, ROWS, CELL, HUD_H, W, H, MOVE_SPEED, BUBBLE_R, BUBBLE_POP_FRAMES, PUSH_SPEED, EXTRA_LETTERS } from './constants';
import { ModPlayer } from './audio/modPlayer';
import { unlockAudio } from './audio/sfx';
import { LEVELS } from './game/levels';
import { initLevel } from './game/levelState';
import { updateGameState } from './game/updateGameState';
import { drawFrame } from './rendering/drawFrame';
import { useGameLoop } from './hooks/useGameLoop';

// ─── Component ───
export default function BubbleTrouble() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState("title");
  const stateRef = useRef(null);
  const keysRef = useRef({});
  const timeRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(0);
  const animRef = useRef(null);
  const starsRef = useRef([]);
  const shakeRef = useRef(0);
  const spritesReady = useRef(false);
  const logoImage = useRef(null);
  const prevSpaceRef = useRef(false);
  const extraCollectedRef = useRef([]); // persists across levels

  const titleHoverRef = useRef(null); // 'newgame' | 'scores' | null
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showScoresMsg, setShowScoresMsg] = useState(false);

  const addStars = useCallback((x, y, n=5) => {
    for (let i=0;i<n;i++)
      starsRef.current.push({x,y,dx:(Math.random()-0.5)*5,dy:(Math.random()-0.5)*5-2,life:30+Math.random()*20,maxLife:50});
  }, []);

  const startGame = useCallback((level=0) => {
    scoreRef.current=0; livesRef.current=3; levelRef.current=level;
    starsRef.current=[]; extraCollectedRef.current=[]; stateRef.current=initLevel(level); setGameState("playing");
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  // Music state machine
  useEffect(() => {
    if (gameState === 'playing') {
      if (ModPlayer.isReady()) ModPlayer.play();
    } else if (gameState === 'gameover' || gameState === 'win') {
      ModPlayer.fadeOut(1.8);
    } else if (gameState === 'title') {
      ModPlayer.stop();
    }
  }, [gameState]);

  useEffect(() => {
    const d = e=>{if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"," "].includes(e.key))e.preventDefault();keysRef.current[e.key]=true;};
    const u = e=>{keysRef.current[e.key]=false;};
    window.addEventListener("keydown",d); window.addEventListener("keyup",u);
    return ()=>{window.removeEventListener("keydown",d);window.removeEventListener("keyup",u);};
  }, []);

  // Title screen mouse hover tracking
  useEffect(() => {
    if (gameState !== 'title') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const MENU = [
      { key:'newgame', y: H*0.62, h: 52 },
      { key:'scores',  y: H*0.75, h: 52 },
    ];
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const cy = (e.clientY - rect.top) * scaleY;
      const hit = MENU.find(m => Math.abs(cy - m.y) < m.h/2);
      titleHoverRef.current = hit ? hit.key : null;
    };
    canvas.addEventListener('mousemove', onMove);
    return () => canvas.removeEventListener('mousemove', onMove);
  }, [gameState]);

  useGameLoop({
    canvasRef,
    gameState,
    spritesReady,
    animRef,
    update: () => updateGameState({
      gameState,
      setGameState,
      stateRef,
      keysRef,
      timeRef,
      scoreRef,
      livesRef,
      levelRef,
      starsRef,
      shakeRef,
      prevSpaceRef,
      extraCollectedRef,
      addStars,
    }),
    draw: (ctx) => drawFrame({
      ctx,
      gameState,
      stateRef,
      timeRef,
      scoreRef,
      livesRef,
      levelRef,
      starsRef,
      shakeRef,
      extraCollectedRef,
      titleHoverRef,
      logoImage: logoImage.current,
    }),
    deps: [addStars],
  });

  useEffect(() => {
    const h = (e) => {
      if (gameState === 'title') {
        if (e.key === 'l' || e.key === 'L') { setShowLevelModal(true); return; }
        if (e.key === 'Escape') { setShowLevelModal(false); setShowScoresMsg(false); return; }
        // Any other key on title — trigger the hovered item or default to new game
        const hov = titleHoverRef.current;
        if (hov === 'scores') { setShowScoresMsg(true); return; }
        startGame();
        return;
      }
      if (gameState !== "playing") startGame();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [gameState, startGame]);

  const handleCanvasClick = useCallback((e) => {
    if (gameState === 'title') {
      const canvas = canvasRef.current; if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const cy = (e.clientY - rect.top) * scaleY;
      // Check menu item hit areas
      if (Math.abs(cy - H*0.62) < 26) { startGame(); return; }
      if (Math.abs(cy - H*0.75) < 26) { setShowScoresMsg(true); return; }
      // Click anywhere else = new game
      startGame();
      return;
    }
    if (gameState !== 'playing') startGame();
  }, [gameState, startGame]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#050510"}}>
      <div style={{position:"relative",display:"inline-block"}}>
        <canvas ref={canvasRef} width={W} height={H}
          onClick={handleCanvasClick}
          style={{border:"3px solid #223",borderRadius:"4px",cursor:gameState==='title'?'pointer':'default',maxWidth:"100%",display:"block",boxShadow:"0 0 40px rgba(30,60,120,0.3)"}} />

        {/* Level select modal */}
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

        {/* Scores "coming soon" modal */}
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
      </div>

      {gameState === "playing" && (
        <div style={{color:"#445",fontSize:11,marginTop:8,textAlign:"center",fontFamily:"monospace"}}>
          Arrow keys / WASD · Push bubbles to crush enemies · Collect 💎 gems · Grab E·X·T·R·A for big bonus!
        </div>
      )}
    </div>
  );
}
