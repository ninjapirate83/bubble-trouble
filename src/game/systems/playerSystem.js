import { CELL, ROWS, W, MOVE_SPEED, BUBBLE_R } from '../../constants';

export function updatePlayer(ctx, helpers) {
  const { bubbles, player, keysRef, prevSpaceRef } = ctx;
  const keys = keysRef.current;

  if (player.invincible > 0) player.invincible--;
  if (player.invisible > 0) player.invisible--;

  let dx = 0;
  let dy = 0;
  if (keys['ArrowLeft'] || keys['a']) {
    dx = -1;
    player.dir = 'left';
  }
  if (keys['ArrowRight'] || keys['d']) {
    dx = 1;
    player.dir = 'right';
  }
  if (keys['ArrowUp'] || keys['w']) {
    dy = -1;
    player.dir = 'up';
  }
  if (keys['ArrowDown'] || keys['s']) {
    dy = 1;
    player.dir = 'down';
  }
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  const playerRadius = 12;
  const collisionProbe = (probeX, probeY) => {
    if (probeX - playerRadius < 0 || probeX + playerRadius > W || probeY - playerRadius < 0 || probeY + playerRadius > ROWS * CELL) return true;
    for (const bubble of bubbles) {
      if (!bubble.alive || bubble.pushing) continue;
      if (Math.hypot(probeX - bubble.x, probeY - bubble.y) < playerRadius + BUBBLE_R) return bubble;
    }
    return false;
  };

  if (player.trapped > 0) {
    dx = 0;
    dy = 0;
  }

  const nextX = player.x + dx * MOVE_SPEED;
  const nextY = player.y + dy * MOVE_SPEED;
  const collisionX = collisionProbe(nextX, player.y);
  if (!collisionX) player.x = nextX;
  const collisionY = collisionProbe(player.x, nextY);
  if (!collisionY) player.y = nextY;

  const spaceNow = !!keys[' '];
  if (spaceNow && !prevSpaceRef.current && player.trapped <= 0) {
    const directionMap = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    const [pushDx, pushDy] = directionMap[player.dir] || [0, 0];
    const probeX = player.x + pushDx * (playerRadius + BUBBLE_R);
    const probeY = player.y + pushDy * (playerRadius + BUBBLE_R);
    const target = collisionProbe(probeX, probeY);
    if (target && target !== true) helpers.tryPush(target, pushDx, pushDy);
  }
  prevSpaceRef.current = spaceNow;
}
