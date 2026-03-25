import { useState, useEffect, useRef, useCallback } from 'react';
import { COLS, ROWS, CELL, HUD_H, W, H, MOVE_SPEED, BUBBLE_R, BUBBLE_POP_FRAMES, PUSH_SPEED, EXTRA_LETTERS } from './constants';
import { ModPlayer } from './audio/modPlayer';
import { unlockAudio, playSound, audioCtx } from './audio/sfx';
import { bubbleSprites, bgCanvases, initSprites } from './rendering/sprites';
import { drawGem, drawExtraBubble, drawPowerupBubble, drawPlayer, drawChombert, drawFrozenEnemy, drawBouncer, drawEel, drawShark, drawHaarrfish, drawTrapBubble, drawPopEffect, drawStar, drawHUDFish } from './rendering/entities';
import { LEVELS } from './game/levels';
import { initLevel, isBubbleAt, isWall } from './game/levelState';

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

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!spritesReady.current) { initSprites(); spritesReady.current=true; }

    function update() {
      timeRef.current += 1/60;
      if (gameState !== "playing" || !stateRef.current) return;
      const st = stateRef.current;
      const {bubbles, gems, enemies, player} = st;
      const keys = keysRef.current;

      // Helper: pop a bubble and auto-collect its gem if it has one
      const popBubble = (b, bonusScore=10) => {
        b.alive=false; b.popFrame=BUBBLE_POP_FRAMES;
        if (b.gem) {
          const g = gems.find(g2=>!g2.collected&&g2.col===b.col&&g2.row===b.row);
          if (g) { g.collected=true; g.collectAnim=20; }
          const gc = b.gemCount||1;
          const pts = gc===3 ? 5000 : gc===2 ? 1500 : 500;
          scoreRef.current += pts * st.multiplier;
          addStars(b.x, b.y, 6 + gc*4);
          playSound(gc===3 ? 'extra_complete' : 'gem');
          if (gc===3) {
            st.gemFreeze = 600; // ~10 seconds: enemies frozen and killable by touch
            st.enemyCaptured = 600;
            shakeRef.current = 14;
            addStars(b.x, b.y, 30);
          }
          st.gemPopupScore = pts; st.gemPopupTimer = 90;
        } else {
          scoreRef.current+=bonusScore; playSound('pop');
        }
      };
      const level = LEVELS[levelRef.current % LEVELS.length];

      // Death animation
      if (st.deathAnim > 0) {
        st.deathAnim--;
        if (st.deathAnim === 0) {
          if (livesRef.current <= 0) { setGameState("gameover"); return; }
          for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (level.grid[r][c]===3) {player.x=c*CELL+CELL/2;player.y=r*CELL+CELL/2;}
          player.invincible=120; player.pushing=false; player.invisible=0; player.trapped=0;
          // Multiplier resets on death (per original)
          st.multiplier=1; st.multiDisplay=0;
        }
        return;
      }

      if (st.levelComplete) {
        if (st.bonusDraining) {
          // Rapidly drain remaining bonus into score with tick sounds
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
            if (levelRef.current>=LEVELS.length){setGameState("win");return;}
            stateRef.current=initLevel(levelRef.current);
            ModPlayer.play();
          }
        }
        return;
      }

      // Level intro countdown — freeze everything until it hits 0
      if (st.levelIntro > 0) {
        if (st.levelIntro === 150) playSound('level_start');
        st.levelIntro--;
        return;
      }

      // Timer countdown
      if (st.bonus > 0) {
        st.bonus = Math.max(0, st.bonus - 1);
        if (st.bonus === 600 || st.bonus === 300) playSound('timer_warn');
      } else if (!st.timerExpired) {
        st.timerExpired = true;
        if (!st.timerExpiredSoundPlayed) { playSound('speedup'); st.timerExpiredSoundPlayed=true; }
      }
      const speedMult = st.timerExpired ? 1.6 : 1.0;

      if (player.invincible > 0) player.invincible--;
      if (player.invisible > 0) player.invisible--;

      // ─── EXTRA letter bubble spawning ───
      st.extraSpawnTimer--;
      if (st.extraSpawnTimer <= 0) {
        const remaining = EXTRA_LETTERS.filter(l => !extraCollectedRef.current.includes(l));
        if (remaining.length > 0) {
          const letter = remaining[Math.floor(Math.random()*remaining.length)];
          const spawnX = CELL*0.8 + Math.random()*(W - CELL*1.6);
          st.extraBubbles.push({letter, x:spawnX, y:ROWS*CELL+BUBBLE_R+5, speed:0.55+Math.random()*0.35});
        }
        st.extraSpawnTimer = 480 + Math.floor(Math.random()*300);
      }

      // ─── Power-up bubble spawning ───
      st.powerupSpawnTimer--;
      if (st.powerupSpawnTimer <= 0) {
        // Rubber (blue/magenta) powerup only available from Level 3 onwards
        const types = levelRef.current >= 2
          ? ['rubber','rubber','rubber','invisible','capture','points']
          : ['invisible','capture','points'];
        const type = types[Math.floor(Math.random()*types.length)];
        const spawnX = CELL*0.8 + Math.random()*(W - CELL*1.6);
        st.powerupBubbles.push({type, x:spawnX, y:ROWS*CELL+BUBBLE_R+5, speed:0.5+Math.random()*0.3,
          value: type==='multiplier' ? (2+Math.floor(Math.random()*4)) :
                 type==='points'     ? ([500,1000,2000][Math.floor(Math.random()*3)]) : 0});
        st.powerupSpawnTimer = 600 + Math.floor(Math.random()*600);
      }

      // ─── Update EXTRA letter bubbles ───
      st.extraBubbles = st.extraBubbles.filter(eb => {
        eb.y -= eb.speed;
        if (eb.y < -BUBBLE_R*2) return false;
        if (Math.hypot(player.x-eb.x, player.y-eb.y) < BUBBLE_R + 18) {
          if (!extraCollectedRef.current.includes(eb.letter)) {
            extraCollectedRef.current.push(eb.letter);
            scoreRef.current += 500;
            addStars(eb.x, eb.y, 8);
            if (extraCollectedRef.current.length === 5) {
              scoreRef.current += 10000;
              livesRef.current = Math.min(8, livesRef.current+1); // extra life! (max 8)
              st.enemyCaptured = 360; // freeze enemies
              extraCollectedRef.current = [];
              st.extraBubbles = [];
              addStars(player.x, player.y, 20);
              playSound('extra_complete'); playSound('capture');
            } else {
              playSound('extra_letter');
            }
          }
          return false;
        }
        return true;
      });

      // ─── Update power-up bubbles ───
      st.powerupBubbles = st.powerupBubbles.filter(pb => {
        pb.y -= pb.speed;
        if (pb.y < -BUBBLE_R*2) return false;
        if (player.invisible > 0) return true; // can't collect while invisible? Actually you can
        if (Math.hypot(player.x-pb.x, player.y-pb.y) < BUBBLE_R + 18) {
          if (pb.type === 'rubber') {
            // Spawn ~10 bouncing bubbles by converting random white bubbles
            const whiteBubbles = bubbles.filter(b=>b.alive&&!b.pushing&&b.color==='white');
            const shuffled = whiteBubbles.sort(()=>Math.random()-0.5);
            const count = Math.min(10, shuffled.length);
            for (let i=0;i<count;i++) {
              const half = Math.floor(count/2);
              shuffled[i].color = i < half ? 'blue' : 'magenta';
              shuffled[i].bounces = i < half ? 1 : 2;
              shuffled[i].bouncesLeft = shuffled[i].bounces;
            }
            addStars(pb.x, pb.y, 12);
            playSound('bounce');
          } else if (pb.type === 'invisible') {
            player.invisible = 300; // 5 seconds
            addStars(pb.x, pb.y, 8);
            playSound('gem');
          } else if (pb.type === 'capture') {
            st.enemyCaptured = 420; // 7 seconds
            addStars(pb.x, pb.y, 12);
            playSound('capture');
          } else if (pb.type === 'points') {
            scoreRef.current += pb.value;
            addStars(pb.x, pb.y, 6);
            playSound('gem');
          }
          return false;
        }
        return true;
      });

      // ─── Enemy freeze countdown ───
      if (st.enemyCaptured > 0) st.enemyCaptured--;

      // ─── Spawn timer: count down and release enemies from their bubbles ───
      for (const e of enemies) {
        if (!e.spawning || !e.alive) continue;
        // Keep enemy position locked to its spawn bubble
        if (e.spawnBubbleIdx !== undefined) {
          const sb = bubbles[e.spawnBubbleIdx];
          if (sb && sb.alive) { e.x = sb.x; e.y = sb.y; }
          else {
            // Bubble was already popped externally (player killed it) — enemy dies
            e.alive = false; e.spawning = false;
            continue;
          }
        }
        e.spawnTimer--;
        if (e.spawnTimer <= 0) {
          // Timer expired — pop the bubble and release the enemy
          if (e.spawnBubbleIdx !== undefined) {
            const sb = bubbles[e.spawnBubbleIdx];
            if (sb && sb.alive) {
              sb.alive = false; sb.popFrame = BUBBLE_POP_FRAMES;
              addStars(sb.x, sb.y, 6); playSound('pop');
            }
          }
          e.spawning = false;
          e.invincible = 60; // brief invincibility on spawn
        }
      }

      // ─── Player movement ───
      let dx=0, dy=0;
      if(keys["ArrowLeft"]||keys["a"]){dx=-1;player.dir="left";}
      if(keys["ArrowRight"]||keys["d"]){dx=1;player.dir="right";}
      if(keys["ArrowUp"]||keys["w"]){dy=-1;player.dir="up";}
      if(keys["ArrowDown"]||keys["s"]){dy=1;player.dir="down";}
      if(dx!==0&&dy!==0){dx*=0.707;dy*=0.707;}

      const pr=12;
      const chk=(px,py)=>{
        if(px-pr<0||px+pr>W||py-pr<0||py+pr>ROWS*CELL) return true;
        for(const b of bubbles){if(!b.alive||b.pushing)continue;if(Math.hypot(px-b.x,py-b.y)<pr+BUBBLE_R)return b;}
        return false;
      };

      // White bubble: stops at walls OR other bubbles
      const findSlideTarget=(b2,pdx,pdy)=>{
        let tc=b2.col+pdx, tr=b2.row+pdy;
        if(isWall(tc,tr)||isBubbleAt(bubbles,tc,tr)) return null;
        while(!isWall(tc+pdx,tr+pdy)&&!isBubbleAt(bubbles,tc+pdx,tr+pdy)){tc+=pdx;tr+=pdy;}
        return {tc,tr};
      };
      // Bouncing bubble: slides wall-to-wall, passes through other bubbles
      const findSlideTargetWall=(b2,pdx,pdy)=>{
        let tc=b2.col+pdx, tr=b2.row+pdy;
        if(isWall(tc,tr)) return null;
        while(!isWall(tc+pdx,tr+pdy)){tc+=pdx;tr+=pdy;}
        return {tc,tr};
      };

      // Crush enemies + check player along slide path, accumulate slide kill count
      const processPath=(fromCol,fromRow,toCol,toRow,pdx,pdy,slideKills)=>{
        let c2=fromCol+pdx, r2=fromRow+pdy;
        while(true){
          // Crush enemies
          const eat=enemies.find(e=>e.alive&&!e.crushed&&Math.abs(e.x-(c2*CELL+CELL/2))<CELL*0.7&&Math.abs(e.y-(r2*CELL+CELL/2))<CELL*0.7);
          if(eat){
            eat.crushed=true;eat.crushFrame=20;
            slideKills.count++;
            // Multiplier: 3+ kills per slide = combo; persists until death
            if(slideKills.count>=3){
              st.multiplier=Math.min(5,1+Math.floor((slideKills.count-1)/2));
              st.multiDisplay=120;
            }
            scoreRef.current+=500*st.multiplier;
            addStars(eat.x,eat.y,8);shakeRef.current=8;playSound('crush');
          }
          // Trap player if caught in a trap bubble OR bubble slides over them
          if(player.invincible<=0&&player.invisible<=0&&player.trapped<=0&&
             Math.abs(player.x-(c2*CELL+CELL/2))<CELL*0.6&&Math.abs(player.y-(r2*CELL+CELL/2))<CELL*0.6){
            livesRef.current--;st.deathAnim=60;addStars(player.x,player.y,12);shakeRef.current=12;playSound('death');
          }
          if(c2===toCol&&r2===toRow) break;
          c2+=pdx; r2+=pdy;
        }
      };

      // Gem bubble: slides until hitting a wall or non-gem bubble, but lands ON another gem bubble (to merge)
      const findSlideTargetGem=(b2,pdx,pdy)=>{
        let tc=b2.col+pdx, tr=b2.row+pdy;
        if(isWall(tc,tr)) return null;
        // If the very first cell has any bubble, either merge or pop — never slide past it
        const firstBubble=bubbles.find(ob=>ob!==b2&&ob.alive&&!ob.pushing&&ob.col===tc&&ob.row===tr);
        if(firstBubble) return firstBubble.gem ? {tc,tr,mergeTarget:firstBubble} : null;
        // Slide forward, stopping if we'd hit a wall or any bubble
        while(true){
          const nc=tc+pdx, nr=tr+pdy;
          if(isWall(nc,nr)) break;
          const ahead=bubbles.find(ob=>ob!==b2&&ob.alive&&!ob.pushing&&ob.col===nc&&ob.row===nr);
          if(ahead){
            if(ahead.gem) { tc=nc; tr=nr; return {tc,tr,mergeTarget:ahead}; }
            break;
          }
          tc=nc; tr=nr;
        }
        return {tc,tr,mergeTarget:null};
      };

      const tryPush=(b2,pdx,pdy)=>{
        // Gem bubbles use a special slide that can land on another gem to merge
        if (b2.gem) {
          const dest = findSlideTargetGem(b2,pdx,pdy);
          if (!dest) { addStars(b2.x,b2.y,4); popBubble(b2); return; }
          b2.pushing=true; b2.pushDx=pdx; b2.pushDy=pdy;
          b2.targetCol=dest.tc; b2.targetRow=dest.tr;
          b2.bouncesLeft=0; b2._slideKills={count:0}; b2._lastKillCol=b2.col; b2._lastKillRow=b2.row;
          b2._mergeTarget=dest.mergeTarget||null;
          playSound('push');
          return;
        }
        // Bouncing bubbles slide wall-to-wall; white bubbles stop at other bubbles
        const dest = b2.bounces>0
          ? findSlideTargetWall(b2,pdx,pdy)
          : findSlideTarget(b2,pdx,pdy);
        if(!dest) {
          // Bubble is already against a wall or another bubble — pop it
          addStars(b2.x,b2.y,4); popBubble(b2);
          // If this was a spawn bubble, kill the enemy inside — big bonus!
          if (b2.spawnEnemyIdx !== undefined) {
            const se = enemies[b2.spawnEnemyIdx];
            if (se && se.spawning && se.alive) {
              se.alive=false; se.spawning=false;
              scoreRef.current+=200; addStars(b2.x,b2.y,12);
              shakeRef.current=8; playSound('crush');
              { const _wasEmpty=st.spawnQueue===0; st.spawnQueue=Math.min(st.spawnQueue+1,st.spawnQuota-st.spawnedTotal); if(_wasEmpty&&st.spawnQueue>0){const[_mn,_mx]=st.spawnDelayRange;st.spawnTimer=_mn+Math.floor(Math.random()*(_mx-_mn));} }
            }
          }
          return;
        }
        b2.pushing=true; b2.pushDx=pdx; b2.pushDy=pdy;
        b2.targetCol=dest.tc; b2.targetRow=dest.tr;
        b2.bouncesLeft=b2.bounces;
        b2._slideKills={count:0};       // kills this slide (for multiplier)
        b2._lastKillCol=b2.col;         // start from bubble's current cell so we don't
        b2._lastKillRow=b2.row;         // immediately trigger a kill check on the player
        playSound('push');
        // NOTE: kills happen cell-by-cell in the animation loop below, NOT here
      };

      // Trapped player can't move
      if(player.trapped>0){dx=0;dy=0;}
      const nx=player.x+dx*MOVE_SPEED, ny=player.y+dy*MOVE_SPEED;
      const cx2=chk(nx,player.y); if(!cx2)player.x=nx;
      const cy2=chk(player.x,ny); if(!cy2)player.y=ny;

      // ─── Space bar push ───
      const spaceNow = !!keys[" "];
      if (spaceNow && !prevSpaceRef.current && player.trapped <= 0) {
        const dirMap = {left:[-1,0], right:[1,0], up:[0,-1], down:[0,1]};
        const [pdx, pdy] = dirMap[player.dir] || [0,0];
        const probeX = player.x + pdx * (pr + BUBBLE_R);
        const probeY = player.y + pdy * (pr + BUBBLE_R);
        const target = chk(probeX, probeY);
        if (target && target !== true) {
          tryPush(target, pdx, pdy);
        }
      }
      prevSpaceRef.current = spaceNow;

      // ─── Update sliding bubbles ───
      for(const b of bubbles){
        if(!b.pushing||!b.alive) continue;

        // ── BUG FIX: Cell-by-cell kill detection ──
        // Compute which grid cell the bubble center is currently in and check
        // for enemies/player only when we enter a new cell — so kills happen
        // when the bubble visually arrives, not at push time.
        const curCol=Math.round((b.x-CELL/2)/CELL);
        const curRow=Math.round((b.y-CELL/2)/CELL);
        if(curCol!==b._lastKillCol||curRow!==b._lastKillRow){
          b._lastKillCol=curCol; b._lastKillRow=curRow;
          if(!b._slideKills) b._slideKills={count:0};
          const sk=b._slideKills;
          // Crush enemy in this cell
          const eat=enemies.find(e=>e.alive&&!e.crushed&&!e.spawning&&
            Math.abs(e.x-(curCol*CELL+CELL/2))<CELL*0.75&&
            Math.abs(e.y-(curRow*CELL+CELL/2))<CELL*0.75);
          if(eat){
            eat.crushed=true; eat.crushFrame=20; sk.count++;
            scoreRef.current += 200 * Math.pow(2, sk.count - 1);
            addStars(eat.x,eat.y,8); shakeRef.current=8; playSound('crush');
            { const _wasEmpty=st.spawnQueue===0; st.spawnQueue=Math.min(st.spawnQueue+1,st.spawnQuota-st.spawnedTotal); if(_wasEmpty&&st.spawnQueue>0){const[_mn,_mx]=st.spawnDelayRange;st.spawnTimer=_mn+Math.floor(Math.random()*(_mx-_mn));} }
          }
          // Bouncing bubbles pop other stationary bubbles they pass through
          if(b.bounces>0){
            const hit=bubbles.find(ob=>ob!==b&&ob.alive&&!ob.pushing&&ob.col===curCol&&ob.row===curRow);
            if(hit){
              popBubble(hit);
              if(hit.spawnEnemyIdx !== undefined){
                const se=enemies[hit.spawnEnemyIdx];
                if(se&&se.spawning&&se.alive){
                  se.alive=false; se.spawning=false;
                  scoreRef.current+=200; addStars(hit.x,hit.y,12); shakeRef.current=8; playSound('crush');
                  { const _wasEmpty=st.spawnQueue===0; st.spawnQueue=Math.min(st.spawnQueue+1,st.spawnQuota-st.spawnedTotal); if(_wasEmpty&&st.spawnQueue>0){const[_mn,_mx]=st.spawnDelayRange;st.spawnTimer=_mn+Math.floor(Math.random()*(_mx-_mn));} }
                }
              }
            }
          }
          // Kill player if bubble slides over them
          if(player.invincible<=0&&player.invisible<=0&&player.trapped<=0&&
             Math.abs(player.x-(curCol*CELL+CELL/2))<CELL*0.65&&
             Math.abs(player.y-(curRow*CELL+CELL/2))<CELL*0.65){
            livesRef.current--; st.deathAnim=60; addStars(player.x,player.y,12); shakeRef.current=12; playSound('death');
          }
        }

        // ── Move bubble toward its target cell ──
        const tx=b.targetCol*CELL+CELL/2, ty=b.targetRow*CELL+CELL/2;
        const dist=Math.hypot(b.x-tx,b.y-ty);
        if(dist>PUSH_SPEED){
          b.x+=b.pushDx*PUSH_SPEED; b.y+=b.pushDy*PUSH_SPEED;
          // ── Pushed bubble pops any bonus/powerup bubble it touches ──
          st.extraBubbles = st.extraBubbles.filter(eb => {
            if (Math.hypot(b.x-eb.x, b.y-eb.y) >= BUBBLE_R*1.8) return true;
            if (!extraCollectedRef.current.includes(eb.letter)) {
              extraCollectedRef.current.push(eb.letter);
              scoreRef.current += 500;
              addStars(eb.x, eb.y, 8);
              playSound('pop');
              if (extraCollectedRef.current.length === 5) {
                scoreRef.current += 10000;
                livesRef.current = Math.min(8, livesRef.current+1);
                st.enemyCaptured = 360;
                extraCollectedRef.current = [];
                st.extraBubbles = [];
                addStars(player.x, player.y, 20);
                playSound('extra_complete'); playSound('capture');
                return false;
              } else { playSound('extra_letter'); }
            }
            return false;
          });
          st.powerupBubbles = st.powerupBubbles.filter(pb => {
            if (Math.hypot(b.x-pb.x, b.y-pb.y) >= BUBBLE_R*1.8) return true;
            addStars(pb.x, pb.y, 8); playSound('pop');
            if (pb.type === 'rubber') {
              const whiteBubbles = bubbles.filter(b2=>b2.alive&&!b2.pushing&&b2.color==='white');
              const shuffled = whiteBubbles.sort(()=>Math.random()-0.5);
              const count = Math.min(10, shuffled.length);
              for (let i=0;i<count;i++) {
                const half = Math.floor(count/2);
                shuffled[i].color = i < half ? 'blue' : 'magenta';
                shuffled[i].bounces = i < half ? 1 : 2;
                shuffled[i].bouncesLeft = shuffled[i].bounces;
              }
              playSound('bounce');
            } else if (pb.type === 'invisible') {
              player.invisible = 300; playSound('gem');
            } else if (pb.type === 'capture') {
              st.enemyCaptured = 420; playSound('capture');
            } else if (pb.type === 'points') {
              scoreRef.current += pb.value; playSound('gem');
            }
            return false;
          });
        } else {
          // Arrived at target — decide what happens next
          b.x=tx; b.y=ty; b.col=b.targetCol; b.row=b.targetRow;

          // ── Gem merge: absorb pushing gem into stationary gem ──
          if (b._mergeTarget && b._mergeTarget.alive) {
            const merged = b._mergeTarget;
            merged.gemCount = (merged.gemCount||1) + (b.gemCount||1);
            merged.col = b.targetCol; merged.row = b.targetRow;
            // Update the matching gems[] entry col/row too
            const gEntry = gems.find(g=>!g.collected&&g.col===b.col&&g.row===b.row);
            if (gEntry) { gEntry.col=merged.col; gEntry.row=merged.row; gEntry.x=merged.x; gEntry.y=merged.y; }
            b.alive=false; b.popFrame=0; b._mergeTarget=null;
            addStars(merged.x, merged.y, 12 + merged.gemCount*4);
            shakeRef.current=6; playSound('gem');
            continue;
          }
          const wallAhead=isWall(b.col+b.pushDx,b.row+b.pushDy);
          // White bubbles stop at other bubbles; bouncing bubbles pass through
          const bubbleAhead=b.bounces===0&&isBubbleAt(bubbles,b.col+b.pushDx,b.row+b.pushDy);

          if(wallAhead&&b.bouncesLeft>0){
            // Bouncing bubble reverses off wall
            b.bouncesLeft--;
            b.pushDx=-b.pushDx; b.pushDy=-b.pushDy;
            const newDest=findSlideTargetWall(b,b.pushDx,b.pushDy);
            if(newDest){
              b.targetCol=newDest.tc; b.targetRow=newDest.tr;
              b._lastKillCol=b.col; b._lastKillRow=b.row;
              playSound('bounce');
            } else {
              b.pushing=false;
            }
          } else {
            // Bubble comes to rest next to a wall or another bubble — just stop
            b.pushing=false;
          }
        }
      }

      // ─── Haarrfish special trigger (level 10+ only, index 9+) ───
      if(!st.haarrfishSpawned && levelRef.current >= 9){
        const fused=gems.filter(g=>g.fused);
        const liveCount=enemies.filter(e=>e.alive&&!e.crushed).length;
        if(fused.length>=2&&liveCount<=3){
          st.haarrfishSpawned=true;
          const hx = player.x<W/2 ? W-CELL*2 : CELL*2;
          const hy2 = player.y<ROWS*CELL/2 ? ROWS*CELL-CELL*2 : CELL*2;
          // Haarrfish does NOT increment spawnedTotal or spawnQueue — outside quota
          enemies.push({x:hx,y:hy2,type:"haarrfish",speed:3.5,
            dx:(Math.random()<0.5?1:-1)*3.5,dy:(Math.random()<0.5?1:-1)*3.5,
            alive:true,crushed:false,crushFrame:0,frozen:false,spitTimer:0,haarrfishSpecial:true});
          addStars(hx,hy2,15); shakeRef.current=10;
        }
      }

      // ─── Trickle spawner ───
      // Only tick the cooldown when there's actual demand (demand-triggered, not free-running)
      const aliveEnemies = enemies.filter(e=>e.alive&&!e.crushed&&!e.spawning).length;
      const hatchingCount = enemies.filter(e=>e.alive&&e.spawning).length;
      // Max concurrent hatch bubbles: 1 on early levels, 2 on later levels
      const maxHatching = levelRef.current >= 9 ? 2 : 1;
      if(st.spawnQueue > 0) st.spawnTimer = Math.max(0, st.spawnTimer - 1);
      if(st.spawnQueue > 0 && aliveEnemies < st.maxSimultaneous &&
         hatchingCount < maxHatching &&
         st.spawnedTotal < st.spawnQuota && st.spawnTimer <= 0){
        const playerCol = Math.round((player.x - CELL/2) / CELL);
        const playerRow = Math.round((player.y - CELL/2) / CELL);
        // Eligible: alive, white only (never blue/magenta), not gem, not pushing, not already a spawn bubble, ≥2 tiles from player
        const eligible = bubbles.filter(b =>
          b.alive && b.color === 'white' && !b.gem && !b.pushing &&
          b.spawnEnemyIdx === undefined &&
          Math.abs(b.col - playerCol) + Math.abs(b.row - playerRow) >= 2
        );
        if(eligible.length > 0){
          // Farthest-of-3: pick 3 random candidates, use the one farthest from player
          const candidates = eligible.sort(()=>Math.random()-0.5).slice(0, 3);
          const b = candidates.reduce((best, c) => {
            const cd = Math.abs(c.col-playerCol) + Math.abs(c.row-playerRow);
            const bd = Math.abs(best.col-playerCol) + Math.abs(best.row-playerRow);
            return cd > bd ? c : best;
          });
          const ed = weightedEnemyType(levelRef.current);
          const hatchTimer = Math.max(90, 300 - levelRef.current * 14);
          b.spawnEnemyIdx = enemies.length;
          enemies.push({x:b.x, y:b.y,
            type:ed.type, speed:ed.speed,
            dx:(Math.random()<0.5?1:-1)*ed.speed, dy:(Math.random()<0.5?1:-1)*ed.speed,
            alive:true, crushed:false, crushFrame:0, frozen:false,
            spawning:true, spawnTimer:hatchTimer, maxSpawnTimer:hatchTimer,
            spawnBubbleIdx:bubbles.indexOf(b)});
          st.spawnQueue--;
          st.spawnedTotal++;
          // Re-arm cooldown for next entry in queue if any remain
          if(st.spawnQueue > 0){
            const [minD, maxD] = st.spawnDelayRange;
            st.spawnTimer = minD + Math.floor(Math.random() * (maxD - minD));
          }
          addStars(b.x, b.y, 4);
        } else {
          // No eligible bubble — skip, shrink quota so level can still complete
          st.spawnQueue--;
          st.spawnQuota--;
        }
      }

      // ─── Update enemies ───
      for(const e of enemies){
        if(e.crushed){e.crushFrame--;if(e.crushFrame<=0){e.alive=false;e.crushed=false;}continue;}
        if(!e.alive) continue;
        if(e.spawning) continue;
        if(st.enemyCaptured > 0) continue;

        // Trapped by Normal's friendly-fire bubble — frozen, but drawable and hittable
        if(e.trapTimer>0){e.trapTimer--;continue;}

        // ── Bubble-interaction pause countdown ──
        // While paused the enemy is frozen in place; when timer hits 0 it executes its action.
        if(e.pauseTimer>0){
          e.pauseTimer--;
          if(e.pauseTimer===0&&e.pauseBubble&&e.pauseBubble.alive){
            if(e.pauseAction==='push'){
              const rdx=e.pauseBubble.x-e.x, rdy=e.pauseBubble.y-e.y;
              const pdx=Math.abs(rdx)>=Math.abs(rdy)?(rdx>0?1:-1):0;
              const pdy=Math.abs(rdx)<Math.abs(rdy)?(rdy>0?1:-1):0;
              tryPush(e.pauseBubble,pdx,pdy);
            } else {
              addStars(e.pauseBubble.x,e.pauseBubble.y,4); popBubble(e.pauseBubble);
            }
            e.pauseBubble=null; e.pauseAction=null;
          }
          continue; // frozen while pausing
        }

        // ── Haarrfish dart wind-up (visual tell before lunging) ──
        if(e.type==='haarrfish'){
          if(e.dartWindup===undefined){e.dartWindup=0;e.dartMode=false;}
          const dp=Math.hypot(player.x-e.x,player.y-e.y);
          if(!e.dartMode&&e.dartWindup===0&&dp<CELL*3.5){
            e.dartWindup=22; // ~0.37 s charge freeze
          }
          if(e.dartWindup>0){e.dartWindup--;continue;} // frozen during wind-up
          if(!e.dartMode&&e.dartWindup===0&&dp<CELL*3.5) e.dartMode=true;
          if(e.dartMode&&dp>CELL*6) e.dartMode=false; // exit dart when far enough away
        }

        // ── Per-enemy effective move speed ──
        // e.dx/e.dy have magnitude e.speed; we extract direction and apply our own speed.
        const mag=Math.hypot(e.dx,e.dy)||e.speed;
        const dirX=e.dx/mag, dirY=e.dy/mag;
        let moveSpeed;
        if(e.type==='chombert'){
          // Doubles own speed when bonus timer expires (overrides global speedMult for him)
          moveSpeed = st.timerExpired ? e.speed*2.0 : e.speed;
        } else if(e.type==='remington'){
          const d=Math.hypot(player.x-e.x,player.y-e.y);
          const isClose=d<CELL*3; // ~156 px
          if(st.timerExpired){
            // Extremely fast when far; even when close still faster than normal
            moveSpeed = isClose ? e.speed*speedMult*1.2 : e.speed*speedMult*2.8;
          } else {
            // Chombert-speed when close (~1.1 px/frame), full Remington speed when far
            moveSpeed = isClose ? 1.1 : e.speed;
          }
        } else if(e.type==='haarrfish'){
          // Swimming: roughly Remington's speed; Darting: faster than Blinky (MOVE_SPEED=4)
          const swimSpeed=e.speed*0.53; // ≈1.7 at base level, same as Remington
          const dartSpeed=e.speed*1.6;  // ≈5.1 at base — faster than player's 4
          moveSpeed=(e.dartMode?dartSpeed:swimSpeed)*speedMult;
        } else {
          moveSpeed=e.speed*speedMult;
        }

        const eR=13;
        e.x+=dirX*moveSpeed; e.y+=dirY*moveSpeed;
        if(e.x-eR<0||e.x+eR>W){e.dx*=-1;e.x=Math.max(eR,Math.min(W-eR,e.x));}
        if(e.y-eR<0||e.y+eR>ROWS*CELL){e.dy*=-1;e.y=Math.max(eR,Math.min(ROWS*CELL-eR,e.y));}

        // ── Bubble collision — bounce + type-specific interact ──
        for(const b of bubbles){
          if(!b.alive||b.pushing) continue;
          const dist=Math.hypot(e.x-b.x,e.y-b.y);
          if(dist<eR+BUBBLE_R){
            // Bounce away
            const ang=Math.atan2(e.y-b.y,e.x-b.x);
            e.dx=Math.cos(ang)*e.speed; e.dy=Math.sin(ang)*e.speed;
            e.x+=e.dx*2; e.y+=e.dy*2;
            // Initiate pause-action if free and the bubble isn't a spawn capsule
            if(!e.pauseTimer&&b.spawnEnemyIdx===undefined){
              if(e.type==='chombert'){
                // Can only pop; long patient wait (visual: sitting next to bubble)
                e.pauseTimer=70+Math.floor(Math.random()*40);
                e.pauseAction='pop'; e.pauseBubble=b;
              } else if(e.type==='remington'){
                // Visual tell: LONGER pause → push, shorter → pop
                const willPush=Math.random()<0.5;
                e.pauseTimer=willPush?(52+Math.floor(Math.random()*22)):(20+Math.floor(Math.random()*14));
                e.pauseAction=willPush?'push':'pop'; e.pauseBubble=b;
              } else if(e.type==='normal'){
                // Quick push/pop decision
                const willPush=Math.random()<0.55;
                e.pauseTimer=10+Math.floor(Math.random()*12);
                e.pauseAction=willPush?'push':'pop'; e.pauseBubble=b;
              } else if(e.type==='haarrfish'){
                // Barely pauses — "without so much as blinking an eye"
                e.pauseTimer=3+Math.floor(Math.random()*5);
                e.pauseAction=Math.random()<0.7?'push':'pop'; e.pauseBubble=b;
              }
            }
            break;
          }
        }

        // ── Type-specific AI (direction steering) ──

        // Chombert: wander during post-hatch idle, then gentle low-accuracy homing
        if(e.type==='chombert'){
          if(e.idleTimer===undefined) e.idleTimer=190; // ~3.2s post-hatch wander
          if(e.idleTimer>0){
            e.idleTimer--;
            if(Math.random()<0.02){e.dx=(Math.random()<0.5?1:-1)*e.speed;e.dy=(Math.random()<0.5?1:-1)*e.speed;}
          } else if(Math.random()<0.012){
            // After idle: drifts vaguely toward player with high spread (not aggressive)
            const toPlayer=Math.atan2(player.y-e.y,player.x-e.x);
            e.dx=Math.cos(toPlayer+(Math.random()-0.5)*2.2)*e.speed;
            e.dy=Math.sin(toPlayer+(Math.random()-0.5)*2.2)*e.speed;
          }
        }

        // Remington: homes toward player with moderate accuracy; higher spread when close (slow mode)
        if(e.type==='remington'){
          if(Math.random()<0.008){
            const d=Math.hypot(player.x-e.x,player.y-e.y);
            const spread=d<CELL*3?1.5:0.9; // more erratic when slow/close
            const toPlayer=Math.atan2(player.y-e.y,player.x-e.x);
            e.dx=Math.cos(toPlayer+(Math.random()-0.5)*spread)*e.speed;
            e.dy=Math.sin(toPlayer+(Math.random()-0.5)*spread)*e.speed;
          }
        }

        // Normal: homes toward player; fires trap bubble only when in exact row OR column
        if(e.type==='normal'){
          if(!e.spitTimer) e.spitTimer=0;
          e.spitTimer++;
          if(Math.random()<0.005){
            const toPlayer=Math.atan2(player.y-e.y,player.x-e.x);
            e.dx=Math.cos(toPlayer+(Math.random()-0.5)*0.5)*e.speed;
            e.dy=Math.sin(toPlayer+(Math.random()-0.5)*0.5)*e.speed;
          }
          // Alignment check: exact row (same horizontal band) or exact column (same vertical band)
          const inCol=Math.abs(player.x-e.x)<CELL*0.55;
          const inRow=Math.abs(player.y-e.y)<CELL*0.55;
          if((inCol||inRow)&&e.spitTimer>220&&Math.random()<0.035&&player.invincible<=0){
            e.spitTimer=0;
            // Fire straight along the aligned axis
            let tbdx=0,tbdy=0;
            if(inCol){tbdy=(player.y>e.y?1:-1)*3.2;}
            else{tbdx=(player.x>e.x?1:-1)*3.2;}
            st.trapBubbles.push({x:e.x,y:e.y,dx:tbdx,dy:tbdy,life:160,srcEnemy:e});
          }
        }

        // Haarrfish: rapid homing; extra-aggressive steering in dart mode
        if(e.type==='haarrfish'){
          const freq=e.dartMode?0.08:0.035;
          const spread=e.dartMode?0.3:0.8;
          if(Math.random()<freq){
            const toPlayer=Math.atan2(player.y-e.y,player.x-e.x);
            e.dx=Math.cos(toPlayer+(Math.random()-0.5)*spread)*e.speed;
            e.dy=Math.sin(toPlayer+(Math.random()-0.5)*spread)*e.speed;
          }
        }

        // ── Player collision ──
        if(player.invincible<=0&&player.invisible<=0&&player.trapped<=0&&!e.spawning&&Math.hypot(player.x-e.x,player.y-e.y)<24){
          if(st.gemFreeze>0){
            e.crushed=true;e.crushFrame=20;scoreRef.current+=200;
            addStars(e.x,e.y,8);shakeRef.current=6;playSound('crush');
            {const _wasEmpty=st.spawnQueue===0;st.spawnQueue=Math.min(st.spawnQueue+1,st.spawnQuota-st.spawnedTotal);if(_wasEmpty&&st.spawnQueue>0){const[_mn,_mx]=st.spawnDelayRange;st.spawnTimer=_mn+Math.floor(Math.random()*(_mx-_mn));}}
          } else {
            livesRef.current--;st.deathAnim=60;addStars(player.x,player.y,12);shakeRef.current=12;playSound('death');
          }
        }
      }

      // ─── Update trap bubbles (with friendly fire) ───
      st.trapBubbles=st.trapBubbles.filter(tb=>{
        tb.x+=tb.dx; tb.y+=tb.dy; tb.life--;
        if(tb.life<=0) return false;
        // Trap the player
        if(player.invisible<=0&&player.trapped<=0&&Math.hypot(player.x-tb.x,player.y-tb.y)<BUBBLE_R+12){
          player.trapped=180;
          playSound('capture');
          return false;
        }
        // Friendly fire: trap any enemy including Normal himself ("catches himself and his friends")
        for(const e of enemies){
          if(!e.alive||e.crushed||e.spawning||e.trapTimer>0) continue;
          if(Math.hypot(e.x-tb.x,e.y-tb.y)<BUBBLE_R+13){
            e.trapTimer=220; // ~3.7 s frozen
            addStars(e.x,e.y,5);
            playSound('capture');
            return false;
          }
        }
        return true;
      });
      // Trapped player can't move but ticks down
      if(player.trapped>0){
        player.trapped--;
        if(player.trapped===0) addStars(player.x,player.y,8);
      }

      // ─── Gem collect animation tick ───
      for(const g of gems){ if(g.collectAnim>0) g.collectAnim--; }

      // ─── Gem freeze countdown ───
      if (st.gemFreeze > 0) st.gemFreeze--;

      for(const b of bubbles){if(!b.alive&&b.popFrame>0)b.popFrame--;}
      if(st.multiDisplay > 0) st.multiDisplay--;
      if(st.gemPopupTimer > 0) st.gemPopupTimer--;

      // ─── Haarrfish special trigger (see above, before Update enemies) ───

      // ─── Level complete: quota exhausted, queue empty, all enemies dead ───
      if(st.spawnedTotal >= st.spawnQuota && st.spawnQueue === 0 && enemies.length > 0 && enemies.every(e=>!e.alive)){
        st.levelComplete=true; st.bonusDraining=true; st.bonusTickTimer=0; st.multiplierUsed=st.multiplier;
        playSound('level_complete');
        ModPlayer.stop();
      }

      // ─── Level complete: all bubbles popped (enemies don't matter) ───
      // (Player cleared the board — cancel any remaining queue and win.)
      const aliveBubbles = bubbles.filter(b=>b.alive);
      if(!st.levelComplete && aliveBubbles.length === 0){
        st.spawnQueue = 0;
        st.spawnQuota = st.spawnedTotal; // align quota so standard check passes next frame
        st.levelComplete=true; st.bonusDraining=true; st.bonusTickTimer=0; st.multiplierUsed=st.multiplier;
        playSound('level_complete');
        ModPlayer.stop();
      }

      starsRef.current=starsRef.current.filter(s=>{s.x+=s.dx;s.y+=s.dy;s.dy+=0.1;s.life--;return s.life>0;});
      if(shakeRef.current>0) shakeRef.current--;
    }

    function draw() {
      const t = timeRef.current;
      ctx.clearRect(0,0,W,H);
      ctx.save();
      if(shakeRef.current>0){const s=shakeRef.current*0.8;ctx.translate((Math.random()-0.5)*s,(Math.random()-0.5)*s);}

      if (gameState==="title") { drawTitle(ctx,t); }
      else if (gameState==="gameover") { drawGameOver(ctx,t); }
      else if (gameState==="win") { drawWin(ctx,t); }
      else if (gameState==="playing"&&stateRef.current) {
        const st=stateRef.current;
        const level=LEVELS[levelRef.current%LEVELS.length];

        // Background
        if(bgCanvases[level.bg]) ctx.drawImage(bgCanvases[level.bg],0,0);

        // Timer speedup warning overlay (pulsing red vignette)
        if(st.timerExpired){
          const pulse=0.08+Math.sin(t*8)*0.05;
          const vign=ctx.createRadialGradient(W/2,ROWS*CELL/2,ROWS*CELL*0.3,W/2,ROWS*CELL/2,ROWS*CELL*0.75);
          vign.addColorStop(0,'rgba(255,0,0,0)'); vign.addColorStop(1,`rgba(200,0,0,${pulse})`);
          ctx.fillStyle=vign; ctx.fillRect(0,0,W,ROWS*CELL);
        }

        // Bubbles
        for(const b of st.bubbles){
          if(b.alive){
            const spr=bubbleSprites[b.color]||bubbleSprites.white;
            ctx.drawImage(spr,b.x-spr.width/2,b.y-spr.height/2);
            // Gem bubbles get a green tint overlay
            if(b.gem){
              const gc = b.gemCount||1;
              const pulse = 1+Math.sin(t*(4+gc*2))*0.06*gc;
              ctx.save();
              // Tier glow
              if(gc===1){
                ctx.globalAlpha=0.45;
                const gg=ctx.createRadialGradient(b.x-4,b.y-4,2,b.x,b.y,BUBBLE_R);
                gg.addColorStop(0,'rgba(100,255,150,0.9)'); gg.addColorStop(0.5,'rgba(0,200,80,0.6)'); gg.addColorStop(1,'rgba(0,150,50,0)');
                ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(b.x,b.y,BUBBLE_R,0,Math.PI*2); ctx.fill();
              } else if(gc===2){
                ctx.globalAlpha=0.7;
                const gg=ctx.createRadialGradient(b.x,b.y,2,b.x,b.y,BUBBLE_R*1.15*pulse);
                gg.addColorStop(0,'rgba(255,220,50,1)'); gg.addColorStop(0.4,'rgba(255,160,0,0.8)'); gg.addColorStop(1,'rgba(255,100,0,0)');
                ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(b.x,b.y,BUBBLE_R*1.1*pulse,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle=`rgba(255,200,50,${0.6+Math.sin(t*6)*0.3})`; ctx.lineWidth=2.5;
                ctx.beginPath(); ctx.arc(b.x,b.y,BUBBLE_R*pulse,0,Math.PI*2); ctx.stroke();
              } else {
                // Tier 3 — intense rainbow burst
                ctx.globalAlpha=0.85;
                const gg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,BUBBLE_R*1.3*pulse);
                const hue=(t*120)%360;
                gg.addColorStop(0,`hsla(${hue},100%,80%,1)`);
                gg.addColorStop(0.3,`hsla(${(hue+60)%360},100%,60%,0.9)`);
                gg.addColorStop(0.7,`hsla(${(hue+120)%360},100%,50%,0.5)`);
                gg.addColorStop(1,'rgba(255,255,255,0)');
                ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(b.x,b.y,BUBBLE_R*1.25*pulse,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle=`hsla(${hue},100%,80%,0.9)`; ctx.lineWidth=3;
                ctx.shadowColor=`hsl(${hue},100%,70%)`; ctx.shadowBlur=12;
                ctx.beginPath(); ctx.arc(b.x,b.y,BUBBLE_R*pulse,0,Math.PI*2); ctx.stroke();
                ctx.shadowBlur=0;
              }
              ctx.restore();
              // Gem emoji(s) inside
              ctx.save(); ctx.globalAlpha=gc===3?1:0.9;
              ctx.font=`${CELL*(gc===1?0.28:gc===2?0.22:0.18)}px serif`;
              ctx.textAlign='center'; ctx.textBaseline='middle';
              if(gc===1){ ctx.fillText('💎',b.x,b.y+1); }
              else if(gc===2){ ctx.fillText('💎',b.x-7,b.y+1); ctx.fillText('💎',b.x+7,b.y+1); }
              else { ctx.fillText('💎',b.x,b.y-7); ctx.fillText('💎',b.x-8,b.y+5); ctx.fillText('💎',b.x+8,b.y+5); }
              ctx.restore();
            }
            // Spawn bubbles: show enemy inside + countdown arc
            if(b.spawnEnemyIdx !== undefined){
              const se=st.enemies[b.spawnEnemyIdx];
              if(se && se.spawning && se.alive){
                const prog=se.spawnTimer/se.maxSpawnTimer;
                ctx.save();
                ctx.beginPath(); ctx.arc(b.x,b.y,BUBBLE_R*0.88,0,Math.PI*2); ctx.clip();
                const blinkSpeed = 8 + (1 - prog) * 32;
                const blinkAlpha = Math.abs(Math.sin(t * blinkSpeed));
                const baseAlpha = 0.1 + blinkAlpha * 0.85;
                // Fade in during first 20% of countdown (prog 1.0 → 0.8)
                const fadeIn = prog > 0.2 ? (1 - prog) / 0.8 : 1.0;
                ctx.globalAlpha = baseAlpha * fadeIn;
                ctx.translate(b.x,b.y); ctx.scale(0.6,0.6); ctx.translate(-b.x,-b.y);
                if(se.type==='chombert') drawChombert(ctx,b.x,b.y,se,t);
                else if(se.type==='remington') drawEel(ctx,b.x,b.y,t);
                else if(se.type==='normal') drawShark(ctx,b.x,b.y,{dx:se.dx,dy:se.dy},t);
                else if(se.type==='haarrfish') drawHaarrfish(ctx,b.x,b.y,t);
                ctx.restore();
                // Countdown arc shrinks as spawn approaches
                ctx.save();
                const arcAlpha = prog > 0.2 ? (1 - prog) / 0.8 : 1.0;
                ctx.strokeStyle=prog>0.4?`rgba(80,200,255,${0.85*arcAlpha})`:`rgba(255,80,80,${0.95*arcAlpha})`;
                ctx.lineWidth=3.5; ctx.lineCap='round';
                ctx.beginPath();
                ctx.arc(b.x,b.y,BUBBLE_R+4,-Math.PI/2,-Math.PI/2+prog*Math.PI*2);
                ctx.stroke();
                ctx.restore();
              }
            }
          } else if(b.popFrame>0) drawPopEffect(ctx,b.x,b.y,BUBBLE_POP_FRAMES-b.popFrame);
        }

        // EXTRA floating bubbles
        for(const eb of st.extraBubbles) drawExtraBubble(ctx,eb,t);
        // Power-up bubbles
        for(const pb of st.powerupBubbles) drawPowerupBubble(ctx,pb,t);

        // Gems — only show the score popup animation after collection
        for(const g of st.gems){
          if(g.collected&&g.collectAnim>0){ctx.save();ctx.globalAlpha=g.collectAnim/20;
            ctx.font="bold 16px monospace";ctx.textAlign="center";ctx.fillStyle="#44ff88";
            ctx.fillText("+"+200*(st.multiplier||1),g.x,g.y-(20-g.collectAnim)*1.5);ctx.restore();}
        }

        // Enemies
        for(const e of st.enemies){
          if(!e.alive&&!e.crushed) continue;
          if(st.enemyCaptured>0&&e.alive&&!e.crushed){
            // Draw frozen (all-enemy capture effect)
            drawFrozenEnemy(ctx,e.x,e.y,t);
            continue;
          }
          if(e.crushed){ctx.save();ctx.globalAlpha=e.crushFrame/20;ctx.translate(e.x,e.y);
            ctx.scale(1+(1-e.crushFrame/20)*0.5,e.crushFrame/20);ctx.translate(-e.x,-e.y);}
          if(e.type==="chombert") drawChombert(ctx,e.x,e.y,{dx:e.dx,dy:e.dy},t);
          else if(e.type==="remington") drawEel(ctx,e.x,e.y,t);
          else if(e.type==="normal") drawShark(ctx,e.x,e.y,{dx:e.dx,dy:e.dy},t);
          else if(e.type==="haarrfish") drawHaarrfish(ctx,e.x,e.y,t);
          else drawChombert(ctx,e.x,e.y,{dx:e.dx,dy:e.dy},t);
          if(e.crushed) ctx.restore();

          // Haarrfish wind-up charge aura (visual tell before dart)
          if(e.type==='haarrfish'&&e.dartWindup>0&&!e.crushed){
            const prog=1-(e.dartWindup/22); // 0→1 as charge builds
            ctx.save();
            // Pulsing concentric rings that shrink inward (like a charging effect)
            for(let ring=0;ring<3;ring++){
              const ringProg=(prog+ring*0.33)%1;
              const r=BUBBLE_R*1.8*(1-ringProg*0.6);
              ctx.globalAlpha=(1-ringProg)*prog*0.7;
              ctx.strokeStyle=`hsl(${30+ringProg*60},100%,70%)`;
              ctx.lineWidth=2.5*(1-ringProg);
              ctx.beginPath(); ctx.arc(e.x,e.y,r,0,Math.PI*2); ctx.stroke();
            }
            // Core flash
            ctx.globalAlpha=prog*0.5;
            const cg=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,BUBBLE_R*1.2);
            cg.addColorStop(0,'rgba(255,180,50,0.9)'); cg.addColorStop(1,'rgba(255,80,0,0)');
            ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(e.x,e.y,BUBBLE_R*1.2,0,Math.PI*2); ctx.fill();
            ctx.restore();
          }

          // Normal's friendly-fire trap: frozen enemies get a bubble overlay
          if(e.trapTimer>0&&!e.crushed){
            const tp=Math.min(1,e.trapTimer/120);
            ctx.save(); ctx.globalAlpha=tp*0.55+Math.sin(t*8)*0.08;
            ctx.beginPath(); ctx.arc(e.x,e.y,BUBBLE_R*1.05,0,Math.PI*2);
            ctx.strokeStyle='rgba(150,210,255,0.9)'; ctx.lineWidth=2.5; ctx.stroke();
            // Small highlight to sell the bubble look
            const hg=ctx.createRadialGradient(e.x-6,e.y-6,0,e.x-6,e.y-6,10);
            hg.addColorStop(0,'rgba(255,255,255,0.6)'); hg.addColorStop(1,'rgba(255,255,255,0)');
            ctx.globalAlpha=tp*0.5; ctx.fillStyle=hg;
            ctx.beginPath(); ctx.arc(e.x,e.y,BUBBLE_R*1.05,0,Math.PI*2); ctx.fill();
            ctx.restore();
          }
        }

        // Trap bubbles
        for(const tb of (st.trapBubbles||[])) drawTrapBubble(ctx,tb,t);
        // Trapped player overlay
        if(st.player&&st.player.trapped>0){
          const tp=st.player.trapped/180;
          ctx.save(); ctx.globalAlpha=tp*0.4+Math.sin(t*10)*0.1;
          ctx.beginPath(); ctx.arc(st.player.x,st.player.y,BUBBLE_R*1.1,0,Math.PI*2);
          ctx.strokeStyle='rgba(150,210,255,0.8)'; ctx.lineWidth=3; ctx.stroke();
          ctx.restore();
        }
        // Player — hidden during level intro
        if(st.deathAnim<=0 && st.levelIntro===0){ctx.save();
          if(st.player.invincible>0&&Math.floor(t*10)%2) ctx.globalAlpha=0.35;
          else if(st.player.invisible>0){
            ctx.globalAlpha=0.3+Math.sin(t*15)*0.15;
            if(st.player.invisible<90&&Math.floor(t*20)%2) ctx.globalAlpha=0.15;
          }
          drawPlayer(ctx,st.player.x,st.player.y,st.player.dir,t);ctx.restore();}

        // ─── Level intro overlay ───
        if(st.levelIntro > 0){
          const li=st.levelIntro; // 149 → 0
          let a;
          if(li>120) a=(149-li)/29;       // fade in  (first ~0.5s)
          else if(li<30) a=li/29;          // fade out (last ~0.5s)
          else a=1;
          ctx.save();
          ctx.globalAlpha=a*0.82;
          ctx.fillStyle='rgba(0,0,18,1)';
          ctx.fillRect(0,0,W,ROWS*CELL);
          ctx.globalAlpha=a;
          ctx.textAlign='center';
          ctx.font='bold 16px monospace';
          ctx.fillStyle='#4477aa';
          ctx.fillText(`LEVEL ${levelRef.current+1}`,W/2,ROWS*CELL/2-38);
          ctx.font='bold 40px monospace';
          const lg=ctx.createLinearGradient(W/2-180,0,W/2+180,0);
          lg.addColorStop(0,'#55aaff'); lg.addColorStop(0.5,'#ffffff'); lg.addColorStop(1,'#55aaff');
          ctx.fillStyle=lg;
          ctx.shadowColor='#3388ff'; ctx.shadowBlur=18;
          ctx.fillText(LEVELS[levelRef.current%LEVELS.length].name,W/2,ROWS*CELL/2+12);
          ctx.shadowBlur=0;
          const allSpawning=st.enemies.filter(e=>e.alive&&e.spawning).length;
          if(allSpawning>0){
            ctx.font='13px monospace'; ctx.fillStyle='rgba(180,210,255,0.8)';
            ctx.fillText(`${allSpawning} enem${allSpawning===1?'y':'ies'} incoming — pop their bubbles to stop them!`,W/2,ROWS*CELL/2+46);
          }
          ctx.restore();
        }

        // Stars
        for(const s of starsRef.current) drawStar(ctx,s.x,s.y,t,s.life/s.maxLife);

        // Gem freeze active — rainbow border pulse + banner
        if(st.gemFreeze>0){
          const gfp=st.gemFreeze/600;
          const hue=(t*90)%360;
          ctx.save(); ctx.globalAlpha=0.12+Math.sin(t*8)*0.06;
          ctx.fillStyle=`hsl(${hue},100%,70%)`; ctx.fillRect(0,0,W,ROWS*CELL);
          ctx.restore();
          ctx.save();
          ctx.strokeStyle=`hsl(${hue},100%,70%)`; ctx.lineWidth=6;
          ctx.globalAlpha=0.7+Math.sin(t*10)*0.3;
          ctx.strokeRect(3,3,W-6,ROWS*CELL-6);
          ctx.restore();
          ctx.save(); ctx.textAlign='center'; ctx.font='bold 16px monospace';
          ctx.fillStyle=`hsl(${hue},100%,85%)`; ctx.shadowColor=`hsl(${hue},100%,60%)`; ctx.shadowBlur=10;
          ctx.globalAlpha=0.9;
          ctx.fillText('✨ GEM FRENZY — TOUCH ENEMIES TO DESTROY THEM! ✨', W/2, 22);
          ctx.restore();
        }

        // Gem score popup
        if(st.gemPopupTimer>0){
          ctx.save(); ctx.globalAlpha=Math.min(1,st.gemPopupTimer/30);
          ctx.font="bold 28px monospace"; ctx.textAlign="center";
          ctx.fillStyle="#44ff88"; ctx.shadowColor="#00aa44"; ctx.shadowBlur=12;
          ctx.fillText(`+${st.gemPopupScore}`,W/2,ROWS*CELL/2-60);
          ctx.restore();
        }

        // Kill multiplier popup
        if(st.multiplier>1&&st.multiDisplay>0){
          ctx.save();
          const fade=st.multiDisplay/90;
          ctx.globalAlpha=fade;
          ctx.font="bold 28px monospace"; ctx.textAlign="center";
          ctx.fillStyle="#ff8800"; ctx.shadowColor="#ff4400"; ctx.shadowBlur=12;
          ctx.fillText(`${st.multiplier}x COMBO!`,W/2, ROWS*CELL/2-30);
          ctx.restore();
        }

        // EXTRA complete flash
        if(st.enemyCaptured>260){
          const a=Math.min(1,(st.enemyCaptured-260)/40)*0.5;
          ctx.save();ctx.globalAlpha=a;
          ctx.fillStyle="#aaddff";ctx.fillRect(0,0,W,ROWS*CELL);
          ctx.restore();
        }

        // Level complete overlay
        if(st.levelComplete){const a=Math.min(1,(st.bonusDraining?1:st.levelTransition)/50);ctx.save();ctx.globalAlpha=a;
          ctx.fillStyle="rgba(0,0,0,0.65)";ctx.fillRect(0,0,W,ROWS*CELL);
          ctx.font="bold 32px monospace";ctx.textAlign="center";ctx.fillStyle="#fff";
          ctx.fillText("LEVEL COMPLETE!",W/2,ROWS*CELL/2-30);
          ctx.font="bold 20px monospace";ctx.fillStyle="#ffee00";
          const liveBonus = st.bonus * st.multiplierUsed;
          const bonusLine = st.multiplierUsed>1
            ? `BONUS: ${liveBonus}  (${st.multiplierUsed}x!)`
            : `BONUS: ${liveBonus}`;
          ctx.fillText(bonusLine,W/2,ROWS*CELL/2+10);ctx.restore();}

        // Death flash
        if(st.deathAnim>0){ctx.save();ctx.globalAlpha=Math.min(0.5,st.deathAnim/60);
          ctx.fillStyle="#ff0000";ctx.fillRect(0,0,W,ROWS*CELL);ctx.restore();}

        // ─── HUD ───
        const hy=ROWS*CELL;
        const hg=ctx.createLinearGradient(0,hy,0,hy+HUD_H);
        hg.addColorStop(0,"#1a1a1a");hg.addColorStop(0.1,"#111");hg.addColorStop(1,"#0a0a0a");
        ctx.fillStyle=hg;ctx.fillRect(0,hy,W,HUD_H);
        ctx.strokeStyle="#333";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,hy+0.5);ctx.lineTo(W,hy+0.5);ctx.stroke();

        // Lives
        drawHUDFish(ctx,22,hy+HUD_H/2);
        ctx.font="bold 24px monospace";ctx.fillStyle="#fff";ctx.textAlign="left";
        ctx.fillText(`${livesRef.current}`,42,hy+HUD_H/2+8);

        // Score
        ctx.font="bold 26px monospace";ctx.fillStyle="#fff";ctx.textAlign="left";
        ctx.fillText(`${scoreRef.current}`.padStart(6," "),68,hy+HUD_H/2+9);

        // EXTRA letters (center HUD) - show progress
        const extraLetterColors = {E:'#ff4466',X:'#ff8822',T:'#ffcc00',R:'#44ff88',A:'#44aaff'};
        const letterSpacing = 22;
        const extraStartX = W/2 - letterSpacing*2;
        ctx.font="bold 20px monospace"; ctx.textAlign="center";
        EXTRA_LETTERS.forEach((l,i)=>{
          const lx = extraStartX + i*letterSpacing;
          const collected = extraCollectedRef.current.includes(l);
          if(collected){
            // Glow effect for collected
            ctx.save();ctx.shadowColor=extraLetterColors[l];ctx.shadowBlur=8;
            ctx.fillStyle=extraLetterColors[l];
            ctx.fillText(l, lx, hy+HUD_H/2+8);
            ctx.restore();
          } else {
            ctx.fillStyle='rgba(255,255,255,0.25)';
            ctx.fillText(l, lx, hy+HUD_H/2+8);
          }
        });
        ctx.font="10px monospace";ctx.fillStyle="#556";ctx.textAlign="center";
        ctx.fillText("EXTRA",W/2,hy+14);

        // Status indicators (right of EXTRA, left of bonus)
        ctx.font="bold 16px monospace"; ctx.textAlign="right"; ctx.shadowBlur=0;
        let statusY=hy+HUD_H/2+8;
        if(st.multiplier>1){
          ctx.fillStyle="#ffaa00"; ctx.shadowColor="#ff6600"; ctx.shadowBlur=5;
          ctx.fillText(`x${st.multiplier}`,W-90,statusY); ctx.shadowBlur=0;
        }
        if(st.player&&st.player.invisible>0){
          ctx.fillStyle="#aaffee"; ctx.fillText(`👻`,W-90,statusY);
        }
        if(st.player&&st.player.trapped>0){
          ctx.fillStyle="#88ccff"; ctx.fillText(`🫧`,W-90,statusY);
        }

        // Bonus timer
        const timerColor = st.bonus<=0 ? '#ff4444' : st.bonus<600 ? '#ff8800' : '#fff';
        ctx.font="bold 26px monospace";ctx.fillStyle=timerColor;ctx.textAlign="right";
        ctx.fillText(`${st.bonus}`,W-16,hy+HUD_H/2+9);
        ctx.font="10px monospace";ctx.fillStyle="#556";
        ctx.fillText("BONUS",W-16,hy+14);
      }
      ctx.restore();
      animRef.current = requestAnimationFrame(gameLoop);
    }

    function drawTitle(ctx, t) {
      // ── Background ──
      if(bgCanvases.rocky) ctx.drawImage(bgCanvases.rocky,0,0);
      else { ctx.fillStyle='#0a1018'; ctx.fillRect(0,0,W,H); }

      // Subtle vignette
      const vig=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.85);
      vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.55)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);

      // ── Logo image ──
      const lx = W/2;
      const float = Math.sin(t * 1.2) * 5;
      const scale = 1 + Math.sin(t * 1.8) * 0.015;
      const logoDrawW = 520 * scale;
      const logoDrawH = logoImage ? (logoImage.naturalHeight / logoImage.naturalWidth) * logoDrawW : 200;
      const logoDrawX = lx - logoDrawW / 2;
      const logoDrawY = 44 + float;

      if (logoImage && logoImage.complete) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(logoImage, logoDrawX, logoDrawY, logoDrawW, logoDrawH);
        ctx.restore();
      }

      // ── "not quite" subtitle above logo ──
      {
        const notQuiteFontSize = Math.round(22 * scale);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `italic 700 ${notQuiteFontSize}px Georgia, serif`;
        const nqY = logoDrawY - 16 + float;
        // soft shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText('not quite', lx + 2, nqY + 2);
        // gradient fill
        const nqG = ctx.createLinearGradient(lx - 60, nqY - 12, lx + 60, nqY + 12);
        nqG.addColorStop(0, '#c8e8ff');
        nqG.addColorStop(0.5, '#ffffff');
        nqG.addColorStop(1, '#a0c8f0');
        ctx.fillStyle = nqG;
        ctx.fillText('not quite', lx, nqY);
        ctx.restore();
      }

      // ── Menu items ──
      const menuItems = [
        { key:'newgame', label:'NEW GAME', y: H*0.62 },
        { key:'scores',  label:'SCORES',   y: H*0.75 },
      ];
      menuItems.forEach(item => {
        const hov = titleHoverRef.current === item.key;
        const pulse = hov ? 1+Math.sin(t*8)*0.04 : 1;
        ctx.save();
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font=`900 ${Math.round(38*pulse)}px Arial Black, Impact, sans-serif`;
        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.7)';
        ctx.fillText(item.label, lx+3, item.y+3);
        // 3D depth
        for(let d=3;d>=1;d--){
          ctx.fillStyle=`rgba(${120+d*10},${70+d*5},0,0.8)`;
          ctx.fillText(item.label, lx+d, item.y+d);
        }
        // Main yellow fill
        const mg=ctx.createLinearGradient(lx-150,item.y-22,lx+150,item.y+22);
        if(hov){
          mg.addColorStop(0,'#ffffff'); mg.addColorStop(0.3,'#ffff88');
          mg.addColorStop(0.7,'#ffee44'); mg.addColorStop(1,'#ffcc00');
        } else {
          mg.addColorStop(0,'#ffee66'); mg.addColorStop(0.4,'#ffdd22');
          mg.addColorStop(0.7,'#ffcc00'); mg.addColorStop(1,'#ddaa00');
        }
        ctx.fillStyle=mg; ctx.fillText(item.label, lx, item.y);
        // Outline
        ctx.strokeStyle='rgba(80,50,0,0.85)'; ctx.lineWidth=2.5;
        ctx.strokeText(item.label, lx, item.y);
        ctx.restore();
      });


      // ── Copyright footer ──
      const footerY=H-18;
      ctx.fillStyle='rgba(0,0,0,0.55)';
      ctx.fillRect(W/2-210,footerY-13,420,22);
      ctx.strokeStyle='rgba(180,130,60,0.45)'; ctx.lineWidth=1;
      ctx.strokeRect(W/2-210,footerY-13,420,22);
      ctx.font='10px monospace'; ctx.fillStyle='rgba(200,170,100,0.85)'; ctx.textAlign='center';
      ctx.fillText('Copyright 1995-97 Alex Metcalf/David Wareing & Ambrosia', lx, footerY+1);

      // ── Sound hint ──
      ctx.font='10px monospace'; ctx.fillStyle='rgba(120,140,120,0.55)'; ctx.textAlign='center';
      ctx.fillText(!audioCtx||audioCtx.state==='suspended'?'🔊 click to enable sound':'🔊 sound on', lx, H-32);
    }

    function drawGameOver(ctx, t) {
      if(bgCanvases.lava) ctx.drawImage(bgCanvases.lava,0,0);
      ctx.fillStyle="rgba(0,0,0,0.6)";ctx.fillRect(0,0,W,H);
      ctx.font="bold 44px monospace";ctx.textAlign="center";
      ctx.fillStyle="#222";ctx.fillText("GAME OVER",W/2+3,H/2-48);
      ctx.fillStyle="#ff4444";ctx.fillText("GAME OVER",W/2,H/2-50);
      ctx.font="bold 24px monospace";ctx.fillStyle="#fff";ctx.fillText(`SCORE: ${scoreRef.current}`,W/2,H/2+10);
      ctx.font="16px monospace";ctx.fillStyle="#ffaa44";ctx.fillText(`Reached: ${LEVELS[levelRef.current%LEVELS.length].name}`,W/2,H/2+45);
      ctx.save();ctx.globalAlpha=0.45+Math.sin(t*3)*0.55;ctx.font="bold 18px monospace";ctx.fillStyle="#ffee44";
      ctx.fillText("PRESS ANY KEY TO RETRY",W/2,H/2+100);ctx.restore();
    }

    function drawWin(ctx, t) {
      if(bgCanvases.forest) ctx.drawImage(bgCanvases.forest,0,0);
      ctx.fillStyle="rgba(0,0,0,0.45)";ctx.fillRect(0,0,W,H);
      for(let i=0;i<20;i++){
        const bx=(i/20)*W+Math.sin(t+i)*20, by=H-((t*40+i*50)%(H+100))+50;
        ctx.save();ctx.globalAlpha=0.35;
        const spr=bubbleSprites[['white','blue','magenta','white'][i%4]];
        if(spr) ctx.drawImage(spr,bx-spr.width/2,by-spr.height/2);
        ctx.restore();
      }
      ctx.font="bold 44px monospace";ctx.textAlign="center";
      const wg=ctx.createLinearGradient(W/2-120,H/2-70,W/2+120,H/2-30);
      wg.addColorStop(0,"#55ff55");wg.addColorStop(0.5,"#ffffff");wg.addColorStop(1,"#55ff55");
      ctx.fillStyle=wg;ctx.fillText("YOU WIN!",W/2,H/2-50);
      ctx.font="bold 24px monospace";ctx.fillStyle="#fff";ctx.fillText(`SCORE: ${scoreRef.current}`,W/2,H/2+10);
      ctx.font="16px monospace";ctx.fillStyle="#aaffaa";ctx.fillText("All levels complete!",W/2,H/2+45);
      ctx.save();ctx.globalAlpha=0.45+Math.sin(t*3)*0.55;ctx.font="bold 18px monospace";ctx.fillStyle="#ffee44";
      ctx.fillText("PRESS ANY KEY TO PLAY AGAIN",W/2,H/2+100);ctx.restore();
    }

    function gameLoop() { update(); draw(); }
    animRef.current = requestAnimationFrame(gameLoop);
    return () => { if(animRef.current) cancelAnimationFrame(animRef.current); };
  }, [gameState, addStars]);

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
