import { CELL, ROWS, W, BUBBLE_R, BUBBLE_POP_FRAMES, PUSH_SPEED, EXTRA_LETTERS } from '../../constants';
import { playSound } from '../../audio/sfx';
import { isBubbleAt, isWall } from '../levelState';
import { queueSpawnDemand } from './spawnSystem';

export function createBubbleHelpers(ctx) {
  const { st, bubbles, gems, enemies, player, scoreRef, shakeRef, livesRef, addStars } = ctx;

  const popBubble = (bubble, bonusScore = 10) => {
    bubble.alive = false;
    bubble.popFrame = BUBBLE_POP_FRAMES;

    if (bubble.gem) {
      const gem = gems.find(g => !g.collected && g.col === bubble.col && g.row === bubble.row);
      if (gem) {
        gem.collected = true;
        gem.collectAnim = 20;
      }
      const gemCount = bubble.gemCount || 1;
      const points = gemCount === 3 ? 5000 : gemCount === 2 ? 1500 : 500;
      scoreRef.current += points * st.multiplier;
      addStars(bubble.x, bubble.y, 6 + gemCount * 4);
      playSound(gemCount === 3 ? 'extra_complete' : 'gem');
      if (gemCount === 3) {
        st.gemFreeze = 600;
        st.enemyCaptured = 600;
        shakeRef.current = 14;
        addStars(bubble.x, bubble.y, 30);
      }
      st.gemPopupScore = points;
      st.gemPopupTimer = 90;
    } else {
      scoreRef.current += bonusScore;
      playSound('pop');
    }
  };

  const killSpawnEnemyIfPresent = (bubble) => {
    if (bubble.spawnEnemyIdx === undefined) return;
    const enemy = enemies[bubble.spawnEnemyIdx];
    if (enemy && enemy.spawning && enemy.alive) {
      enemy.alive = false;
      enemy.spawning = false;
      scoreRef.current += 200;
      addStars(bubble.x, bubble.y, 12);
      shakeRef.current = 8;
      playSound('crush');
      queueSpawnDemand(st);
    }
  };

  const applyPowerupBubble = (powerupBubble) => {
    if (powerupBubble.type === 'rubber') {
      const whiteBubbles = bubbles.filter(b => b.alive && !b.pushing && b.color === 'white');
      const shuffled = whiteBubbles.sort(() => Math.random() - 0.5);
      const count = Math.min(10, shuffled.length);
      for (let i = 0; i < count; i++) {
        const half = Math.floor(count / 2);
        shuffled[i].color = i < half ? 'blue' : 'magenta';
        shuffled[i].bounces = i < half ? 1 : 2;
        shuffled[i].bouncesLeft = shuffled[i].bounces;
      }
      addStars(powerupBubble.x, powerupBubble.y, 12);
      playSound('bounce');
    } else if (powerupBubble.type === 'invisible') {
      player.invisible = 300;
      addStars(powerupBubble.x, powerupBubble.y, 8);
      playSound('gem');
    } else if (powerupBubble.type === 'capture') {
      st.enemyCaptured = 420;
      addStars(powerupBubble.x, powerupBubble.y, 12);
      playSound('capture');
    } else if (powerupBubble.type === 'points') {
      scoreRef.current += powerupBubble.value;
      addStars(powerupBubble.x, powerupBubble.y, 6);
      playSound('gem');
    }
  };

  const collectExtraLetter = (extraBubble, crushedByBubble = false) => {
    if (ctx.extraCollectedRef.current.includes(extraBubble.letter)) return;

    ctx.extraCollectedRef.current.push(extraBubble.letter);
    scoreRef.current += 500;
    addStars(extraBubble.x, extraBubble.y, 8);
    playSound(crushedByBubble ? 'pop' : 'extra_letter');

    if (ctx.extraCollectedRef.current.length === 5) {
      scoreRef.current += 10000;
      livesRef.current = Math.min(8, livesRef.current + 1);
      st.enemyCaptured = 360;
      ctx.extraCollectedRef.current = [];
      st.extraBubbles = [];
      addStars(player.x, player.y, 20);
      playSound('extra_complete');
      playSound('capture');
    }
  };

  const findSlideTarget = (bubble, pushDx, pushDy) => {
    let targetCol = bubble.col + pushDx;
    let targetRow = bubble.row + pushDy;
    if (isWall(targetCol, targetRow) || isBubbleAt(bubbles, targetCol, targetRow)) return null;
    while (!isWall(targetCol + pushDx, targetRow + pushDy) && !isBubbleAt(bubbles, targetCol + pushDx, targetRow + pushDy)) {
      targetCol += pushDx;
      targetRow += pushDy;
    }
    return { targetCol, targetRow };
  };

  const findSlideTargetWall = (bubble, pushDx, pushDy) => {
    let targetCol = bubble.col + pushDx;
    let targetRow = bubble.row + pushDy;
    if (isWall(targetCol, targetRow)) return null;
    while (!isWall(targetCol + pushDx, targetRow + pushDy)) {
      targetCol += pushDx;
      targetRow += pushDy;
    }
    return { targetCol, targetRow };
  };

  const findSlideTargetGem = (bubble, pushDx, pushDy) => {
    let targetCol = bubble.col + pushDx;
    let targetRow = bubble.row + pushDy;
    if (isWall(targetCol, targetRow)) return null;

    const firstBubble = bubbles.find(other => other !== bubble && other.alive && !other.pushing && other.col === targetCol && other.row === targetRow);
    if (firstBubble) return firstBubble.gem ? { targetCol, targetRow, mergeTarget: firstBubble } : null;

    while (true) {
      const nextCol = targetCol + pushDx;
      const nextRow = targetRow + pushDy;
      if (isWall(nextCol, nextRow)) break;
      const ahead = bubbles.find(other => other !== bubble && other.alive && !other.pushing && other.col === nextCol && other.row === nextRow);
      if (ahead) {
        if (ahead.gem) return { targetCol: nextCol, targetRow: nextRow, mergeTarget: ahead };
        break;
      }
      targetCol = nextCol;
      targetRow = nextRow;
    }

    return { targetCol, targetRow, mergeTarget: null };
  };

  const tryPush = (bubble, pushDx, pushDy) => {
    if (bubble.gem) {
      const destination = findSlideTargetGem(bubble, pushDx, pushDy);
      if (!destination) {
        addStars(bubble.x, bubble.y, 4);
        popBubble(bubble);
        return;
      }
      bubble.pushing = true;
      bubble.pushDx = pushDx;
      bubble.pushDy = pushDy;
      bubble.targetCol = destination.targetCol;
      bubble.targetRow = destination.targetRow;
      bubble.bouncesLeft = 0;
      bubble._slideKills = { count: 0 };
      bubble._lastKillCol = bubble.col;
      bubble._lastKillRow = bubble.row;
      bubble._mergeTarget = destination.mergeTarget || null;
      playSound('push');
      return;
    }

    const destination = bubble.bounces > 0
      ? findSlideTargetWall(bubble, pushDx, pushDy)
      : findSlideTarget(bubble, pushDx, pushDy);

    if (!destination) {
      addStars(bubble.x, bubble.y, 4);
      popBubble(bubble);
      killSpawnEnemyIfPresent(bubble);
      return;
    }

    bubble.pushing = true;
    bubble.pushDx = pushDx;
    bubble.pushDy = pushDy;
    bubble.targetCol = destination.targetCol;
    bubble.targetRow = destination.targetRow;
    bubble.bouncesLeft = bubble.bounces;
    bubble._slideKills = { count: 0 };
    bubble._lastKillCol = bubble.col;
    bubble._lastKillRow = bubble.row;
    playSound('push');
  };

  return {
    popBubble,
    tryPush,
    applyPowerupBubble,
    collectExtraLetter,
    killSpawnEnemyIfPresent,
    findSlideTargetWall,
  };
}

export function updateFloatingCollectibles(ctx, helpers) {
  const { st, bubbles, player, scoreRef, addStars } = ctx;

  st.extraSpawnTimer--;
  if (st.extraSpawnTimer <= 0) {
    const remaining = EXTRA_LETTERS.filter(letter => !ctx.extraCollectedRef.current.includes(letter));
    if (remaining.length > 0) {
      const letter = remaining[Math.floor(Math.random() * remaining.length)];
      const spawnX = CELL * 0.8 + Math.random() * (W - CELL * 1.6);
      st.extraBubbles.push({ letter, x: spawnX, y: ROWS * CELL + BUBBLE_R + 5, speed: 0.55 + Math.random() * 0.35 });
    }
    st.extraSpawnTimer = 480 + Math.floor(Math.random() * 300);
  }

  st.powerupSpawnTimer--;
  if (st.powerupSpawnTimer <= 0) {
    const types = ctx.levelRef.current >= 2
      ? ['rubber', 'rubber', 'rubber', 'invisible', 'capture', 'points']
      : ['invisible', 'capture', 'points'];
    const type = types[Math.floor(Math.random() * types.length)];
    const spawnX = CELL * 0.8 + Math.random() * (W - CELL * 1.6);
    st.powerupBubbles.push({
      type,
      x: spawnX,
      y: ROWS * CELL + BUBBLE_R + 5,
      speed: 0.5 + Math.random() * 0.3,
      value: type === 'multiplier' ? (2 + Math.floor(Math.random() * 4)) : type === 'points' ? [500, 1000, 2000][Math.floor(Math.random() * 3)] : 0,
    });
    st.powerupSpawnTimer = 600 + Math.floor(Math.random() * 600);
  }

  st.extraBubbles = st.extraBubbles.filter(extraBubble => {
    extraBubble.y -= extraBubble.speed;
    if (extraBubble.y < -BUBBLE_R * 2) return false;
    if (Math.hypot(player.x - extraBubble.x, player.y - extraBubble.y) < BUBBLE_R + 18) {
      helpers.collectExtraLetter(extraBubble);
      return false;
    }
    return true;
  });

  st.powerupBubbles = st.powerupBubbles.filter(powerupBubble => {
    powerupBubble.y -= powerupBubble.speed;
    if (powerupBubble.y < -BUBBLE_R * 2) return false;
    if (Math.hypot(player.x - powerupBubble.x, player.y - powerupBubble.y) < BUBBLE_R + 18) {
      helpers.applyPowerupBubble(powerupBubble);
      return false;
    }
    return true;
  });
}

export function updateSlidingBubbles(ctx, helpers) {
  const { st, bubbles, enemies, gems, player, scoreRef, shakeRef, addStars, livesRef } = ctx;

  for (const bubble of bubbles) {
    if (!bubble.pushing || !bubble.alive) continue;

    const currentCol = Math.round((bubble.x - CELL / 2) / CELL);
    const currentRow = Math.round((bubble.y - CELL / 2) / CELL);
    if (currentCol !== bubble._lastKillCol || currentRow !== bubble._lastKillRow) {
      bubble._lastKillCol = currentCol;
      bubble._lastKillRow = currentRow;
      if (!bubble._slideKills) bubble._slideKills = { count: 0 };
      const slideKills = bubble._slideKills;

      const enemy = enemies.find(e => e.alive && !e.crushed && !e.spawning && Math.abs(e.x - (currentCol * CELL + CELL / 2)) < CELL * 0.75 && Math.abs(e.y - (currentRow * CELL + CELL / 2)) < CELL * 0.75);
      if (enemy) {
        enemy.crushed = true;
        enemy.crushFrame = 20;
        slideKills.count++;
        scoreRef.current += 200 * Math.pow(2, slideKills.count - 1);
        addStars(enemy.x, enemy.y, 8);
        shakeRef.current = 8;
        playSound('crush');
        queueSpawnDemand(st);
      }

      if (bubble.bounces > 0) {
        const hit = bubbles.find(other => other !== bubble && other.alive && !other.pushing && other.col === currentCol && other.row === currentRow);
        if (hit) {
          helpers.popBubble(hit);
          helpers.killSpawnEnemyIfPresent(hit);
        }
      }

      if (
        player.invincible <= 0 &&
        player.invisible <= 0 &&
        player.trapped <= 0 &&
        Math.abs(player.x - (currentCol * CELL + CELL / 2)) < CELL * 0.65 &&
        Math.abs(player.y - (currentRow * CELL + CELL / 2)) < CELL * 0.65
      ) {
        livesRef.current--;
        st.deathAnim = 60;
        addStars(player.x, player.y, 12);
        shakeRef.current = 12;
        playSound('death');
      }
    }

    const targetX = bubble.targetCol * CELL + CELL / 2;
    const targetY = bubble.targetRow * CELL + CELL / 2;
    const distance = Math.hypot(bubble.x - targetX, bubble.y - targetY);

    if (distance > PUSH_SPEED) {
      bubble.x += bubble.pushDx * PUSH_SPEED;
      bubble.y += bubble.pushDy * PUSH_SPEED;

      st.extraBubbles = st.extraBubbles.filter(extraBubble => {
        if (Math.hypot(bubble.x - extraBubble.x, bubble.y - extraBubble.y) >= BUBBLE_R * 1.8) return true;
        helpers.collectExtraLetter(extraBubble, true);
        return false;
      });

      st.powerupBubbles = st.powerupBubbles.filter(powerupBubble => {
        if (Math.hypot(bubble.x - powerupBubble.x, bubble.y - powerupBubble.y) >= BUBBLE_R * 1.8) return true;
        addStars(powerupBubble.x, powerupBubble.y, 8);
        playSound('pop');
        helpers.applyPowerupBubble(powerupBubble);
        return false;
      });
      continue;
    }

    bubble.x = targetX;
    bubble.y = targetY;
    bubble.col = bubble.targetCol;
    bubble.row = bubble.targetRow;

    if (bubble._mergeTarget && bubble._mergeTarget.alive) {
      const merged = bubble._mergeTarget;
      merged.gemCount = (merged.gemCount || 1) + (bubble.gemCount || 1);
      merged.col = bubble.targetCol;
      merged.row = bubble.targetRow;
      const gemEntry = gems.find(g => !g.collected && g.col === bubble.col && g.row === bubble.row);
      if (gemEntry) {
        gemEntry.col = merged.col;
        gemEntry.row = merged.row;
        gemEntry.x = merged.x;
        gemEntry.y = merged.y;
      }
      bubble.alive = false;
      bubble.popFrame = 0;
      bubble._mergeTarget = null;
      addStars(merged.x, merged.y, 12 + merged.gemCount * 4);
      shakeRef.current = 6;
      playSound('gem');
      continue;
    }

    const wallAhead = isWall(bubble.col + bubble.pushDx, bubble.row + bubble.pushDy);
    const bubbleAhead = bubble.bounces === 0 && isBubbleAt(bubbles, bubble.col + bubble.pushDx, bubble.row + bubble.pushDy);

    if (wallAhead && bubble.bouncesLeft > 0) {
      bubble.bouncesLeft--;
      bubble.pushDx = -bubble.pushDx;
      bubble.pushDy = -bubble.pushDy;
      const newDestination = helpers.findSlideTargetWall(bubble, bubble.pushDx, bubble.pushDy);
      if (newDestination) {
        bubble.targetCol = newDestination.targetCol;
        bubble.targetRow = newDestination.targetRow;
        bubble._lastKillCol = bubble.col;
        bubble._lastKillRow = bubble.row;
        playSound('bounce');
      } else {
        bubble.pushing = false;
      }
    } else {
      bubble.pushing = false;
    }
  }
}

export function tickBubbleAnimations(ctx) {
  const { st, bubbles, gems } = ctx;
  for (const gem of gems) if (gem.collectAnim > 0) gem.collectAnim--;
  for (const bubble of bubbles) if (!bubble.alive && bubble.popFrame > 0) bubble.popFrame--;
  if (st.gemFreeze > 0) st.gemFreeze--;
  if (st.multiDisplay > 0) st.multiDisplay--;
  if (st.gemPopupTimer > 0) st.gemPopupTimer--;
}
