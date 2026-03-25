import { CELL, BUBBLE_POP_FRAMES } from '../../constants';
import { playSound } from '../../audio/sfx';
import { weightedEnemyType } from '../levelState';

export function queueSpawnDemand(st) {
  const wasEmpty = st.spawnQueue === 0;
  st.spawnQueue = Math.min(st.spawnQueue + 1, st.spawnQuota - st.spawnedTotal);
  if (wasEmpty && st.spawnQueue > 0) {
    const [minDelay, maxDelay] = st.spawnDelayRange;
    st.spawnTimer = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
  }
}

export function updateSpawnCapsules(ctx) {
  const { st, bubbles, enemies, addStars } = ctx;

  for (const e of enemies) {
    if (!e.spawning || !e.alive) continue;

    if (e.spawnBubbleIdx !== undefined) {
      const spawnBubble = bubbles[e.spawnBubbleIdx];
      if (spawnBubble && spawnBubble.alive) {
        e.x = spawnBubble.x;
        e.y = spawnBubble.y;
      } else {
        e.alive = false;
        e.spawning = false;
        continue;
      }
    }

    e.spawnTimer--;
    if (e.spawnTimer <= 0) {
      if (e.spawnBubbleIdx !== undefined) {
        const spawnBubble = bubbles[e.spawnBubbleIdx];
        if (spawnBubble && spawnBubble.alive) {
          spawnBubble.alive = false;
          spawnBubble.popFrame = BUBBLE_POP_FRAMES;
          addStars(spawnBubble.x, spawnBubble.y, 6);
          playSound('pop');
        }
      }
      e.spawning = false;
      e.invincible = 60;
    }
  }
}

export function updateTrickleSpawner(ctx) {
  const { st, bubbles, enemies, player, levelRef, addStars } = ctx;
  const aliveEnemies = enemies.filter(e => e.alive && !e.crushed && !e.spawning).length;
  const hatchingCount = enemies.filter(e => e.alive && e.spawning).length;
  const maxHatching = levelRef.current >= 9 ? 2 : 1;

  if (st.spawnQueue > 0) st.spawnTimer = Math.max(0, st.spawnTimer - 1);

  if (
    st.spawnQueue > 0 &&
    aliveEnemies < st.maxSimultaneous &&
    hatchingCount < maxHatching &&
    st.spawnedTotal < st.spawnQuota &&
    st.spawnTimer <= 0
  ) {
    const playerCol = Math.round((player.x - CELL / 2) / CELL);
    const playerRow = Math.round((player.y - CELL / 2) / CELL);
    const eligible = bubbles.filter(
      b =>
        b.alive &&
        b.color === 'white' &&
        !b.gem &&
        !b.pushing &&
        b.spawnEnemyIdx === undefined &&
        Math.abs(b.col - playerCol) + Math.abs(b.row - playerRow) >= 2,
    );

    if (eligible.length > 0) {
      const candidates = eligible.sort(() => Math.random() - 0.5).slice(0, 3);
      const bubble = candidates.reduce((best, candidate) => {
        const candidateDistance = Math.abs(candidate.col - playerCol) + Math.abs(candidate.row - playerRow);
        const bestDistance = Math.abs(best.col - playerCol) + Math.abs(best.row - playerRow);
        return candidateDistance > bestDistance ? candidate : best;
      });

      const enemyDef = weightedEnemyType(levelRef.current);
      const hatchTimer = Math.max(90, 300 - levelRef.current * 14);
      bubble.spawnEnemyIdx = enemies.length;
      enemies.push({
        x: bubble.x,
        y: bubble.y,
        type: enemyDef.type,
        speed: enemyDef.speed,
        dx: (Math.random() < 0.5 ? 1 : -1) * enemyDef.speed,
        dy: (Math.random() < 0.5 ? 1 : -1) * enemyDef.speed,
        alive: true,
        crushed: false,
        crushFrame: 0,
        frozen: false,
        spawning: true,
        spawnTimer: hatchTimer,
        maxSpawnTimer: hatchTimer,
        spawnBubbleIdx: bubbles.indexOf(bubble),
      });

      st.spawnQueue--;
      st.spawnedTotal++;
      if (st.spawnQueue > 0) {
        const [minDelay, maxDelay] = st.spawnDelayRange;
        st.spawnTimer = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
      }
      addStars(bubble.x, bubble.y, 4);
    } else {
      st.spawnQueue--;
      st.spawnQuota--;
    }
  }
}
