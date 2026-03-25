import { W, H, ROWS, CELL, HUD_H, BUBBLE_R, BUBBLE_POP_FRAMES, EXTRA_LETTERS } from '../constants';
import { LEVELS } from '../game/levels';
import { bubbleSprites, bgCanvases } from './sprites';
import {
  drawExtraBubble,
  drawPowerupBubble,
  drawPlayer,
  drawChombert,
  drawFrozenEnemy,
  drawEel,
  drawShark,
  drawHaarrfish,
  drawTrapBubble,
  drawPopEffect,
  drawStar,
  drawHUDFish,
} from './entities';
import { drawTitleScreen, drawGameOverScreen, drawWinScreen } from './screenDrawers';

export function drawFrame({
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
  logoImage,
}) {
  const drawTitle = (ctx, t) => drawTitleScreen(ctx, t, { titleHoverRef, logoImage });
  const drawGameOver = (ctx, t) => drawGameOverScreen(ctx, t, { scoreRef, levelRef });
  const drawWin = (ctx, t) => drawWinScreen(ctx, t, { scoreRef });

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
    }
}
