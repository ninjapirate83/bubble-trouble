import { CELL, ROWS, W, MOVE_SPEED, BUBBLE_R } from '../../constants';
import { playSound } from '../../audio/sfx';
import { queueSpawnDemand } from './spawnSystem';

export function maybeSpawnHaarrfish(ctx) {
  const { st, gems, enemies, player, levelRef, addStars, shakeRef } = ctx;
  if (st.haarrfishSpawned || levelRef.current < 9) return;

  const fused = gems.filter(g => g.fused);
  const liveCount = enemies.filter(e => e.alive && !e.crushed).length;
  if (fused.length >= 2 && liveCount <= 3) {
    st.haarrfishSpawned = true;
    const spawnX = player.x < W / 2 ? W - CELL * 2 : CELL * 2;
    const spawnY = player.y < ROWS * CELL / 2 ? ROWS * CELL - CELL * 2 : CELL * 2;
    enemies.push({
      x: spawnX,
      y: spawnY,
      type: 'haarrfish',
      speed: 3.5,
      dx: (Math.random() < 0.5 ? 1 : -1) * 3.5,
      dy: (Math.random() < 0.5 ? 1 : -1) * 3.5,
      alive: true,
      crushed: false,
      crushFrame: 0,
      frozen: false,
      spitTimer: 0,
      haarrfishSpecial: true,
    });
    addStars(spawnX, spawnY, 15);
    shakeRef.current = 10;
  }
}

export function updateEnemies(ctx, helpers) {
  const { st, bubbles, enemies, player, scoreRef, livesRef, addStars, shakeRef } = ctx;

  if (st.enemyCaptured > 0) st.enemyCaptured--;

  for (const enemy of enemies) {
    if (enemy.crushed) {
      enemy.crushFrame--;
      if (enemy.crushFrame <= 0) {
        enemy.alive = false;
        enemy.crushed = false;
      }
      continue;
    }
    if (!enemy.alive || enemy.spawning || st.enemyCaptured > 0) continue;
    if (enemy.trapTimer > 0) {
      enemy.trapTimer--;
      continue;
    }

    if (enemy.pauseTimer > 0) {
      enemy.pauseTimer--;
      if (enemy.pauseTimer === 0 && enemy.pauseBubble && enemy.pauseBubble.alive) {
        if (enemy.pauseAction === 'push') {
          const relX = enemy.pauseBubble.x - enemy.x;
          const relY = enemy.pauseBubble.y - enemy.y;
          const pushDx = Math.abs(relX) >= Math.abs(relY) ? (relX > 0 ? 1 : -1) : 0;
          const pushDy = Math.abs(relX) < Math.abs(relY) ? (relY > 0 ? 1 : -1) : 0;
          helpers.tryPush(enemy.pauseBubble, pushDx, pushDy);
        } else {
          addStars(enemy.pauseBubble.x, enemy.pauseBubble.y, 4);
          helpers.popBubble(enemy.pauseBubble);
        }
        enemy.pauseBubble = null;
        enemy.pauseAction = null;
      }
      continue;
    }

    if (enemy.type === 'haarrfish') {
      if (enemy.dartWindup === undefined) {
        enemy.dartWindup = 0;
        enemy.dartMode = false;
      }
      const distanceToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (!enemy.dartMode && enemy.dartWindup === 0 && distanceToPlayer < CELL * 3.5) enemy.dartWindup = 22;
      if (enemy.dartWindup > 0) {
        enemy.dartWindup--;
        continue;
      }
      if (!enemy.dartMode && enemy.dartWindup === 0 && distanceToPlayer < CELL * 3.5) enemy.dartMode = true;
      if (enemy.dartMode && distanceToPlayer > CELL * 6) enemy.dartMode = false;
    }

    const magnitude = Math.hypot(enemy.dx, enemy.dy) || enemy.speed;
    const dirX = enemy.dx / magnitude;
    const dirY = enemy.dy / magnitude;
    let moveSpeed;
    if (enemy.type === 'chombert') {
      moveSpeed = st.timerExpired ? enemy.speed * 2 : enemy.speed;
    } else if (enemy.type === 'remington') {
      const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      const isClose = distance < CELL * 3;
      if (st.timerExpired) moveSpeed = isClose ? enemy.speed * 1.2 * 1.6 : enemy.speed * 2.8 * 1.6;
      else moveSpeed = isClose ? 1.1 : enemy.speed;
    } else if (enemy.type === 'haarrfish') {
      const swimSpeed = enemy.speed * 0.53;
      const dartSpeed = enemy.speed * 1.6;
      moveSpeed = (enemy.dartMode ? dartSpeed : swimSpeed) * (st.timerExpired ? 1.6 : 1.0);
    } else {
      moveSpeed = enemy.speed * (st.timerExpired ? 1.6 : 1.0);
    }

    const enemyRadius = 13;
    enemy.x += dirX * moveSpeed;
    enemy.y += dirY * moveSpeed;
    if (enemy.x - enemyRadius < 0 || enemy.x + enemyRadius > W) {
      enemy.dx *= -1;
      enemy.x = Math.max(enemyRadius, Math.min(W - enemyRadius, enemy.x));
    }
    if (enemy.y - enemyRadius < 0 || enemy.y + enemyRadius > ROWS * CELL) {
      enemy.dy *= -1;
      enemy.y = Math.max(enemyRadius, Math.min(ROWS * CELL - enemyRadius, enemy.y));
    }

    for (const bubble of bubbles) {
      if (!bubble.alive || bubble.pushing) continue;
      const distance = Math.hypot(enemy.x - bubble.x, enemy.y - bubble.y);
      if (distance < enemyRadius + BUBBLE_R) {
        const angle = Math.atan2(enemy.y - bubble.y, enemy.x - bubble.x);
        enemy.dx = Math.cos(angle) * enemy.speed;
        enemy.dy = Math.sin(angle) * enemy.speed;
        enemy.x += enemy.dx * 2;
        enemy.y += enemy.dy * 2;
        if (!enemy.pauseTimer && bubble.spawnEnemyIdx === undefined) {
          if (enemy.type === 'chombert') {
            enemy.pauseTimer = 70 + Math.floor(Math.random() * 40);
            enemy.pauseAction = 'pop';
          } else if (enemy.type === 'remington') {
            const willPush = Math.random() < 0.5;
            enemy.pauseTimer = willPush ? 52 + Math.floor(Math.random() * 22) : 20 + Math.floor(Math.random() * 14);
            enemy.pauseAction = willPush ? 'push' : 'pop';
          } else if (enemy.type === 'normal') {
            const willPush = Math.random() < 0.55;
            enemy.pauseTimer = 10 + Math.floor(Math.random() * 12);
            enemy.pauseAction = willPush ? 'push' : 'pop';
          } else if (enemy.type === 'haarrfish') {
            enemy.pauseTimer = 3 + Math.floor(Math.random() * 5);
            enemy.pauseAction = Math.random() < 0.7 ? 'push' : 'pop';
          }
          enemy.pauseBubble = bubble;
        }
        break;
      }
    }

    if (enemy.type === 'chombert') {
      if (enemy.idleTimer === undefined) enemy.idleTimer = 190;
      if (enemy.idleTimer > 0) {
        enemy.idleTimer--;
        if (Math.random() < 0.02) {
          enemy.dx = (Math.random() < 0.5 ? 1 : -1) * enemy.speed;
          enemy.dy = (Math.random() < 0.5 ? 1 : -1) * enemy.speed;
        }
      } else if (Math.random() < 0.012) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.dx = Math.cos(angle + (Math.random() - 0.5) * 2.2) * enemy.speed;
        enemy.dy = Math.sin(angle + (Math.random() - 0.5) * 2.2) * enemy.speed;
      }
    }

    if (enemy.type === 'remington' && Math.random() < 0.008) {
      const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      const spread = distance < CELL * 3 ? 1.5 : 0.9;
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.dx = Math.cos(angle + (Math.random() - 0.5) * spread) * enemy.speed;
      enemy.dy = Math.sin(angle + (Math.random() - 0.5) * spread) * enemy.speed;
    }

    if (enemy.type === 'normal') {
      if (!enemy.spitTimer) enemy.spitTimer = 0;
      enemy.spitTimer++;
      if (Math.random() < 0.005) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.dx = Math.cos(angle + (Math.random() - 0.5) * 0.5) * enemy.speed;
        enemy.dy = Math.sin(angle + (Math.random() - 0.5) * 0.5) * enemy.speed;
      }
      const inColumn = Math.abs(player.x - enemy.x) < CELL * 0.55;
      const inRow = Math.abs(player.y - enemy.y) < CELL * 0.55;
      if ((inColumn || inRow) && enemy.spitTimer > 220 && Math.random() < 0.035 && player.invincible <= 0) {
        enemy.spitTimer = 0;
        let trapDx = 0;
        let trapDy = 0;
        if (inColumn) trapDy = (player.y > enemy.y ? 1 : -1) * 3.2;
        else trapDx = (player.x > enemy.x ? 1 : -1) * 3.2;
        st.trapBubbles.push({ x: enemy.x, y: enemy.y, dx: trapDx, dy: trapDy, life: 160, srcEnemy: enemy });
      }
    }

    if (enemy.type === 'haarrfish') {
      const freq = enemy.dartMode ? 0.08 : 0.035;
      const spread = enemy.dartMode ? 0.3 : 0.8;
      if (Math.random() < freq) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.dx = Math.cos(angle + (Math.random() - 0.5) * spread) * enemy.speed;
        enemy.dy = Math.sin(angle + (Math.random() - 0.5) * spread) * enemy.speed;
      }
    }

    if (player.invincible <= 0 && player.invisible <= 0 && player.trapped <= 0 && !enemy.spawning && Math.hypot(player.x - enemy.x, player.y - enemy.y) < 24) {
      if (st.gemFreeze > 0) {
        enemy.crushed = true;
        enemy.crushFrame = 20;
        scoreRef.current += 200;
        addStars(enemy.x, enemy.y, 8);
        shakeRef.current = 6;
        playSound('crush');
        queueSpawnDemand(st);
      } else {
        livesRef.current--;
        st.deathAnim = 60;
        addStars(player.x, player.y, 12);
        shakeRef.current = 12;
        playSound('death');
      }
    }
  }
}

export function updateTrapBubbles(ctx) {
  const { st, enemies, player, addStars } = ctx;
  st.trapBubbles = st.trapBubbles.filter(trapBubble => {
    trapBubble.x += trapBubble.dx;
    trapBubble.y += trapBubble.dy;
    trapBubble.life--;
    if (trapBubble.life <= 0) return false;

    if (player.invisible <= 0 && player.trapped <= 0 && Math.hypot(player.x - trapBubble.x, player.y - trapBubble.y) < BUBBLE_R + 12) {
      player.trapped = 180;
      playSound('capture');
      return false;
    }

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.crushed || enemy.spawning || enemy.trapTimer > 0) continue;
      if (Math.hypot(enemy.x - trapBubble.x, enemy.y - trapBubble.y) < BUBBLE_R + 13) {
        enemy.trapTimer = 220;
        addStars(enemy.x, enemy.y, 5);
        playSound('capture');
        return false;
      }
    }

    return true;
  });

  if (player.trapped > 0) {
    player.trapped--;
    if (player.trapped === 0) addStars(player.x, player.y, 8);
  }
}
