import { updateLevelFlow, checkLevelCompletion, tickStarsAndShake } from './systems/levelFlowSystem';
import { createBubbleHelpers, updateFloatingCollectibles, updateSlidingBubbles, tickBubbleAnimations } from './systems/bubbleSystem';
import { updateSpawnCapsules, updateTrickleSpawner } from './systems/spawnSystem';
import { updatePlayer } from './systems/playerSystem';
import { maybeSpawnHaarrfish, updateEnemies, updateTrapBubbles } from './systems/enemySystem';

export function updateGameState({
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
}) {
  const st = stateRef.current;
  const levelFlow = updateLevelFlow({
    gameState,
    setGameState,
    stateRef,
    st,
    player: st?.player,
    scoreRef,
    livesRef,
    levelRef,
    timeRef,
    addStars,
    shakeRef,
  });

  if (!levelFlow.shouldContinue || !st) return;

  const ctx = {
    gameState,
    setGameState,
    stateRef,
    st,
    bubbles: st.bubbles,
    gems: st.gems,
    enemies: st.enemies,
    player: st.player,
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
    level: levelFlow.level,
  };

  const helpers = createBubbleHelpers(ctx);

  updateFloatingCollectibles(ctx, helpers);
  updateSpawnCapsules(ctx);
  updatePlayer(ctx, helpers);
  updateSlidingBubbles(ctx, helpers);
  maybeSpawnHaarrfish(ctx);
  updateTrickleSpawner(ctx);
  updateEnemies(ctx, helpers);
  updateTrapBubbles(ctx);
  tickBubbleAnimations(ctx);
  checkLevelCompletion(ctx);
  tickStarsAndShake(ctx);
}
