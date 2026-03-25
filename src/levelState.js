import { COLS, ROWS, CELL, BUBBLE_R } from '../constants';
import { LEVELS } from './levels';

export function weightedEnemyType(levelIdx) {
  const spd = (base, scale) => +(Math.min(base + levelIdx * scale, base + 1.5)).toFixed(2);
  const r = Math.random();
  if (levelIdx <= 1) {
    return {type:'chombert', speed: spd(1.1, 0.07)};
  } else if (levelIdx <= 4) {
    if (r < 0.70) return {type:'chombert',   speed: spd(1.1, 0.07)};
    return             {type:'remington',  speed: spd(1.7, 0.08)};
  } else if (levelIdx <= 8) {
    if (r < 0.60) return {type:'chombert',   speed: spd(1.1, 0.07)};
    if (r < 0.90) return {type:'remington',  speed: spd(1.7, 0.08)};
    return               {type:'normal',     speed: spd(2.3, 0.07)};
  } else {
    if (r < 0.40) return {type:'chombert',   speed: spd(1.1, 0.07)};
    if (r < 0.70) return {type:'remington',  speed: spd(1.7, 0.08)};
    if (r < 0.90) return {type:'normal',     speed: spd(2.3, 0.07)};
    return               {type:'haarrfish',  speed: spd(3.2, 0.06)};
  }
}

// ─── Game State ───
export function initLevel(idx) {
  const level = LEVELS[idx % LEVELS.length];
  const bubbles=[], gems=[], enemies=[];
  let ps = {col: Math.floor(COLS/2), row: Math.floor(ROWS/2)};
  outer: for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) if (level.grid[r][c]===3) { ps={col:c,row:r}; break outer; }

  // Collect all spawn points (all '4' positions) for trickle spawner
  const spawnPoints = [];
  for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) if (level.grid[r][c]===4) spawnPoints.push({c,r});

  // Hatch timer for initial enemies — stagger so they don't all pop at once
  const hatchBase = Math.max(90, 300 - idx * 14);
  const hatchStagger = Math.max(40, 110 - idx * 5);
  let ei = 0;

  for (let r=0; r<ROWS; r++) {
    for (let c=0; c<COLS; c++) {
      const v = level.grid[r][c];
      if (v===1) {
        bubbles.push({col:c,row:r,x:c*CELL+CELL/2,y:r*CELL+CELL/2,alive:true,popFrame:0,
          pushing:false,pushDx:0,pushDy:0,color:'white',bounces:0,bouncesLeft:0});
      }
      else if (v===2) {
        bubbles.push({col:c,row:r,x:c*CELL+CELL/2,y:r*CELL+CELL/2,alive:true,popFrame:0,
          pushing:false,pushDx:0,pushDy:0,color:'white',bounces:0,bouncesLeft:0,gem:true,gemCount:1});
        gems.push({col:c,row:r,x:c*CELL+CELL/2,y:r*CELL+CELL/2,collected:false,collectAnim:0,fused:false});
      }
      else if (v===3) { /* player start */ }
      else if (v===4) {
        // Initial enemies: typed via weighted selector, staggered hatch timers
        const ed = weightedEnemyType(idx);
        const spawnTimer = hatchBase + ei * hatchStagger;
        const spawnBubbleIdx = bubbles.length;
        bubbles.push({col:c,row:r,x:c*CELL+CELL/2,y:r*CELL+CELL/2,alive:true,popFrame:0,
          pushing:false,pushDx:0,pushDy:0,color:'white',bounces:0,bouncesLeft:0,
          spawnEnemyIdx: enemies.length});
        enemies.push({x:c*CELL+CELL/2,y:r*CELL+CELL/2,type:ed.type,speed:ed.speed,
          dx:(Math.random()<0.5?1:-1)*ed.speed,dy:(Math.random()<0.5?1:-1)*ed.speed,
          alive:true,crushed:false,crushFrame:0,frozen:false,
          spawning:true, spawnTimer, maxSpawnTimer:spawnTimer, spawnBubbleIdx});
        ei++;
      }
    }
  }

  // Enforce exactly 3 gem bubbles — trim or fill as needed
  const gemBubbles = bubbles.filter(b=>b.gem);
  if (gemBubbles.length > 3) {
    const toRemove = gemBubbles.slice(3);
    toRemove.forEach(b => {
      const bi = bubbles.indexOf(b); if (bi>=0) bubbles.splice(bi,1);
      const gi = gems.findIndex(g=>g.col===b.col&&g.row===b.row); if (gi>=0) gems.splice(gi,1);
    });
  } else if (gemBubbles.length < 3) {
    const used = new Set(bubbles.map(b=>`${b.col},${b.row}`));
    const playerCell = `${ps.col},${ps.row}`;
    const empties = [];
    for (let r=1;r<ROWS-1;r++) for (let c=1;c<COLS-1;c++) {
      const k=`${c},${r}`; if (!used.has(k) && k!==playerCell) empties.push({c,r});
    }
    empties.sort(()=>Math.random()-0.5);
    for (let i=gemBubbles.length; i<3 && empties.length>0; i++) {
      const {c,r} = empties.shift();
      bubbles.push({col:c,row:r,x:c*CELL+CELL/2,y:r*CELL+CELL/2,alive:true,popFrame:0,
        pushing:false,pushDx:0,pushDy:0,color:'white',bounces:0,bouncesLeft:0,gem:true,gemCount:1});
      gems.push({col:c,row:r,x:c*CELL+CELL/2,y:r*CELL+CELL/2,collected:false,collectAnim:0,fused:false});
    }
  }

  // spawnedTotal starts at the number of initial enemies placed at '4' markers
  const initialEnemyCount = enemies.length;

  return {
    bubbles, gems, enemies,
    player:{x:ps.col*CELL+CELL/2,y:ps.row*CELL+CELL/2,dir:"down",pushing:false,invincible:0,invisible:0,trapped:0},
    bonus:3000, levelComplete:false, levelTransition:0, deathAnim:0,
    bonusDraining:false, bonusTickTimer:0,
    levelIntro: 150,
    extraBubbles:[], extraSpawnTimer:300+Math.floor(Math.random()*240),
    powerupBubbles:[], powerupSpawnTimer:600+Math.floor(Math.random()*480),
    multiplier:1, multiDisplay:0,
    enemyCaptured:0,
    timerExpired:false, timerExpiredSoundPlayed:false,
    gemsFused:0, gemPopupScore:0, gemPopupTimer:0,
    trapBubbles:[],
    haarrfishSpawned:false,
    slideKillCount:0,
    gemFreeze:0,
    spawnPoints,
    // ── New spawn system ──
    spawnQuota: level.spawnQuota,
    maxSimultaneous: level.maxSimultaneous,
    spawnDelayRange: level.spawnDelayRange,
    spawnQueue: 0,
    spawnTimer: 0,
    spawnedTotal: initialEnemyCount,
  };
}

export function isBubbleAt(bs, c, r) { return bs.some(b=>b.alive&&!b.pushing&&b.col===c&&b.row===r); }
export function isWall(c, r) { return c<0||c>=COLS||r<0||r>=ROWS; }
