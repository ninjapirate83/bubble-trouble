import { W, H, ROWS, CELL } from '../constants';
import { audioCtx } from '../audio/sfx';
import { LEVELS } from '../game/levels';
import { bubbleSprites, bgCanvases } from './sprites';
import { drawChombert, drawEel, drawHaarrfish } from './entities';

export function drawTitleScreen(ctx, t, { titleHoverRef, logoImage }) {

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
}

export function drawGameOverScreen(ctx, t, { scoreRef, levelRef }) {

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
}

export function drawWinScreen(ctx, t, { scoreRef }) {

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
}
