import { ROWS, COLS, CELL } from '../../constants';
import { ModPlayer } from '../../audio/modPlayer';
import { playSound } from '../../audio/sfx';
import { LEVELS } from '../levels';
import { initLevel } from '../levelState';

export function updateLevelFlow(ctx) {
  const { gameState, setGameState, st, player, scoreRef, livesRef, levelRef, timeRef, addStars, shakeRef } = ctx;
  timeRef.current += 1 / 60;
  if (gameState !== 'playing' || !st) return { shouldContinue: false, level: null };

  const level = LEVELS[levelRef.current % LEVELS.length];

  if (st.deathAnim > 0) {
    st.deathAnim--;
    if (st.deathAnim === 0) {
      if (livesRef.current <= 0) {
        setGameState('gameover');
        return { shouldContinue: false, level };
      }
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (level.grid[row][col] === 3) {
            player.x = col * CELL + CELL / 2;
            player.y = row * CELL + CELL / 2;
          }
        }
      }
      player.invincible = 120;
      player.pushing = false;
      player.invisible = 0;
      player.trapped = 0;
      st.multiplier = 1;
      st.multiDisplay = 0;
    }
    return { shouldContinue: false, level };
  }

  if (st.levelComplete) {
    if (st.bonusDraining) {
      if (st.bonus > 0) {
        const drain = Math.min(40, st.bonus);
        st.bonus -= drain;
        scoreRef.current += drain * st.multiplierUsed;
        st.bonusTickTimer++;
        if (st.bonusTickTimer % 3 === 0) playSound('bonus_tick');
      } else {
        st.bonusDraining = false;
      }
    } else {
      st.levelTransition++;
      if (st.levelTransition > 60) {
        levelRef.current++;
        if (levelRef.current >= LEVELS.length) {
          setGameState('win');
          return { shouldContinue: false, level };
        }
        ctx.stateRef.current = initLevel(levelRef.current);
        ModPlayer.play();
      }
    }
    return { shouldContinue: false, level };
  }

  if (st.levelIntro > 0) {
    if (st.levelIntro === 150) playSound('level_start');
    st.levelIntro--;
    return { shouldContinue: false, level };
  }

  if (st.bonus > 0) {
    st.bonus = Math.max(0, st.bonus - 1);
    if (st.bonus === 600 || st.bonus === 300) playSound('timer_warn');
  } else if (!st.timerExpired) {
    st.timerExpired = true;
    if (!st.timerExpiredSoundPlayed) {
      playSound('speedup');
      st.timerExpiredSoundPlayed = true;
    }
  }

  return { shouldContinue: true, level };
}

export function checkLevelCompletion(ctx) {
  const { st, bubbles, enemies } = ctx;

  if (st.spawnedTotal >= st.spawnQuota && st.spawnQueue === 0 && enemies.length > 0 && enemies.every(enemy => !enemy.alive)) {
    st.levelComplete = true;
    st.bonusDraining = true;
    st.bonusTickTimer = 0;
    st.multiplierUsed = st.multiplier;
    playSound('level_complete');
    ModPlayer.stop();
    return;
  }

  const aliveBubbles = bubbles.filter(bubble => bubble.alive);
  if (!st.levelComplete && aliveBubbles.length === 0) {
    st.spawnQueue = 0;
    st.spawnQuota = st.spawnedTotal;
    st.levelComplete = true;
    st.bonusDraining = true;
    st.bonusTickTimer = 0;
    st.multiplierUsed = st.multiplier;
    playSound('level_complete');
    ModPlayer.stop();
  }
}

export function tickStarsAndShake(ctx) {
  ctx.starsRef.current = ctx.starsRef.current.filter(star => {
    star.x += star.dx;
    star.y += star.dy;
    star.dy += 0.1;
    star.life--;
    return star.life > 0;
  });
  if (ctx.shakeRef.current > 0) ctx.shakeRef.current--;
}
