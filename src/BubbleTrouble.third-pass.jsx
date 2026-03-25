import { useState, useEffect, useRef, useCallback } from 'react';
import { W, H } from './constants';
import { ModPlayer } from './audio/modPlayer';
import { unlockAudio } from './audio/sfx';
import { initLevel } from './game/levelState';
import { updateGameState } from './game/updateGameState';
import { drawFrame } from './rendering/drawFrame';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboard } from './hooks/useKeyboard';
import { GameOverlayModals } from './ui/GameOverlayModals';

export default function BubbleTrouble() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('title');
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
  const extraCollectedRef = useRef([]);
  const titleHoverRef = useRef(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showScoresMsg, setShowScoresMsg] = useState(false);

  const addStars = useCallback((x, y, n = 5) => {
    for (let i = 0; i < n; i++) {
      starsRef.current.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 5,
        dy: (Math.random() - 0.5) * 5 - 2,
        life: 30 + Math.random() * 20,
        maxLife: 50,
      });
    }
  }, []);

  const startGame = useCallback((level = 0) => {
    scoreRef.current = 0;
    livesRef.current = 3;
    levelRef.current = level;
    starsRef.current = [];
    extraCollectedRef.current = [];
    stateRef.current = initLevel(level);
    setGameState('playing');
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      if (ModPlayer.isReady()) ModPlayer.play();
    } else if (gameState === 'gameover' || gameState === 'win') {
      ModPlayer.fadeOut(1.8);
    } else if (gameState === 'title') {
      ModPlayer.stop();
    }
  }, [gameState]);

  useKeyboard(keysRef);

  useEffect(() => {
    if (gameState !== 'title') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const menu = [
      { key: 'newgame', y: H * 0.62, h: 52 },
      { key: 'scores', y: H * 0.75, h: 52 },
    ];
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const cy = (e.clientY - rect.top) * scaleY;
      const hit = menu.find(item => Math.abs(cy - item.y) < item.h / 2);
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
    const handleTitleAndRestartKeys = (e) => {
      if (gameState === 'title') {
        if (e.key === 'l' || e.key === 'L') {
          setShowLevelModal(true);
          return;
        }
        if (e.key === 'Escape') {
          setShowLevelModal(false);
          setShowScoresMsg(false);
          return;
        }
        if (titleHoverRef.current === 'scores') {
          setShowScoresMsg(true);
          return;
        }
        startGame();
        return;
      }
      if (gameState !== 'playing') startGame();
    };

    window.addEventListener('keydown', handleTitleAndRestartKeys);
    return () => window.removeEventListener('keydown', handleTitleAndRestartKeys);
  }, [gameState, startGame]);

  const handleCanvasClick = useCallback((e) => {
    if (gameState === 'title') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const cy = (e.clientY - rect.top) * scaleY;
      if (Math.abs(cy - H * 0.62) < 26) {
        startGame();
        return;
      }
      if (Math.abs(cy - H * 0.75) < 26) {
        setShowScoresMsg(true);
        return;
      }
      startGame();
      return;
    }
    if (gameState !== 'playing') startGame();
  }, [gameState, startGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050510' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleCanvasClick}
          style={{ border: '3px solid #223', borderRadius: '4px', cursor: gameState === 'title' ? 'pointer' : 'default', maxWidth: '100%', display: 'block', boxShadow: '0 0 40px rgba(30,60,120,0.3)' }}
        />

        <GameOverlayModals
          showLevelModal={showLevelModal}
          setShowLevelModal={setShowLevelModal}
          showScoresMsg={showScoresMsg}
          setShowScoresMsg={setShowScoresMsg}
          startGame={startGame}
        />
      </div>

      {gameState === 'playing' && (
        <div style={{ color: '#445', fontSize: 11, marginTop: 8, textAlign: 'center', fontFamily: 'monospace' }}>
          Arrow keys / WASD · Push bubbles to crush enemies · Collect 💎 gems · Grab E·X·T·R·A for big bonus!
        </div>
      )}
    </div>
  );
}
