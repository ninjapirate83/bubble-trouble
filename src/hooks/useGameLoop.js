import { useEffect } from 'react';
import { initSprites } from '../rendering/sprites';

export function useGameLoop({
  canvasRef,
  gameState,
  spritesReady,
  animRef,
  update,
  draw,
  deps = [],
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!spritesReady.current) {
      initSprites();
      spritesReady.current = true;
    }

    function gameLoop() {
      update();
      draw(ctx);
      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [canvasRef, gameState, spritesReady, animRef, update, draw, ...deps]);
}
