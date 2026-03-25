export function drawGem(ctx, x, y, t) {
  const bob = Math.sin(t*3)*3;
  ctx.save(); ctx.translate(x, y+bob); ctx.rotate(Math.sin(t*1.5)*0.15);
  const s = 12;
  const glow = ctx.createRadialGradient(0,0,0,0,0,s*1.8);
  glow.addColorStop(0,"rgba(0,255,100,0.25)"); glow.addColorStop(1,"rgba(0,255,100,0)");
  ctx.fillStyle=glow; ctx.fillRect(-s*2,-s*2,s*4,s*4);
  ctx.beginPath(); ctx.moveTo(0,-s); ctx.lineTo(s*0.7,-s*0.15); ctx.lineTo(s*0.5,s*0.2);
  ctx.lineTo(0,s); ctx.lineTo(-s*0.5,s*0.2); ctx.lineTo(-s*0.7,-s*0.15); ctx.closePath();
  const grd = ctx.createLinearGradient(-s,-s,s,s);
  grd.addColorStop(0,"#44ff88"); grd.addColorStop(0.3,"#22ee66");
  grd.addColorStop(0.7,"#00cc44"); grd.addColorStop(1,"#008833");
  ctx.fillStyle=grd; ctx.fill();
  ctx.strokeStyle="#88ffbb"; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s*0.7,-s*0.15); ctx.lineTo(0,s*0.1); ctx.lineTo(s*0.7,-s*0.15);
  ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s*0.15,-s*0.7); ctx.lineTo(s*0.15,-s*0.5); ctx.lineTo(-s*0.05,-s*0.2); ctx.closePath();
  ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.fill();
  ctx.restore();
}

// Draw a floating EXTRA letter bubble
export function drawExtraBubble(ctx, eb, t) {
  const letterColors = {E:'#ff4466',X:'#ff8822',T:'#ffcc00',R:'#44ff88',A:'#44aaff'};
  const col = letterColors[eb.letter] || '#ffffff';
  const pulse = 1 + Math.sin(t*4 + eb.x)*0.06;
  ctx.save(); ctx.translate(eb.x, eb.y); ctx.scale(pulse, pulse);
  // Glow
  const glow = ctx.createRadialGradient(0,0,0,0,0,BUBBLE_R*1.5);
  glow.addColorStop(0,col+'55'); glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow; ctx.fillRect(-BUBBLE_R*2,-BUBBLE_R*2,BUBBLE_R*4,BUBBLE_R*4);
  // Bubble body (tinted)
  const bg = ctx.createRadialGradient(-BUBBLE_R*0.3,-BUBBLE_R*0.35,BUBBLE_R*0.05,BUBBLE_R*0.1,BUBBLE_R*0.1,BUBBLE_R);
  bg.addColorStop(0,'rgba(255,255,255,0.9)'); bg.addColorStop(0.3,col+'cc');
  bg.addColorStop(0.7,col+'99'); bg.addColorStop(1,col+'66');
  ctx.beginPath(); ctx.arc(0,0,BUBBLE_R,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
  // Highlight
  const hl = ctx.createRadialGradient(-BUBBLE_R*0.28,-BUBBLE_R*0.3,0,-BUBBLE_R*0.28,-BUBBLE_R*0.3,BUBBLE_R*0.55);
  hl.addColorStop(0,'rgba(255,255,255,0.85)'); hl.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(0,0,BUBBLE_R,0,Math.PI*2); ctx.fillStyle=hl; ctx.fill();
  // Letter
  ctx.font = `bold ${CELL*0.38}px monospace`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillText(eb.letter, 1, 2);
  ctx.fillStyle='#ffffff'; ctx.fillText(eb.letter, 0, 1);
  ctx.restore();
}

export function drawPowerupBubble(ctx, pb, t) {
  const typeColors = {
    rubber:'#44aaff', multiplier:'#ffaa00', invisible:'#aaffee',
    capture:'#44ff88', points:'#ffee44',
  };
  const col = typeColors[pb.type] || '#ffffff';
  const pulse = 1 + Math.sin(t*5 + pb.x*0.01)*0.08;
  ctx.save(); ctx.translate(pb.x, pb.y); ctx.scale(pulse, pulse);
  // Glow
  const glow = ctx.createRadialGradient(0,0,0,0,0,BUBBLE_R*1.6);
  glow.addColorStop(0,col+'66'); glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow; ctx.fillRect(-BUBBLE_R*2,-BUBBLE_R*2,BUBBLE_R*4,BUBBLE_R*4);
  // Body
  const bg = ctx.createRadialGradient(-BUBBLE_R*0.3,-BUBBLE_R*0.35,BUBBLE_R*0.05,BUBBLE_R*0.1,BUBBLE_R*0.1,BUBBLE_R);
  bg.addColorStop(0,'rgba(255,255,255,0.9)'); bg.addColorStop(0.3,col+'dd');
  bg.addColorStop(0.8,col+'99'); bg.addColorStop(1,col+'55');
  ctx.beginPath(); ctx.arc(0,0,BUBBLE_R,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
  // Highlight
  const hl=ctx.createRadialGradient(-BUBBLE_R*0.28,-BUBBLE_R*0.3,0,-BUBBLE_R*0.28,-BUBBLE_R*0.3,BUBBLE_R*0.55);
  hl.addColorStop(0,'rgba(255,255,255,0.85)'); hl.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(0,0,BUBBLE_R,0,Math.PI*2); ctx.fillStyle=hl; ctx.fill();
  // Icon
  ctx.font=`bold ${CELL*0.3}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
  const icons = {rubber:'🏀', multiplier:`x${pb.value}`, invisible:'👻', capture:'🫧', points:`+${pb.value}`};
  const icon = icons[pb.type] || '?';
  // Use text for non-emoji (multiplier, points)
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillText(icon, 1, 2);
  ctx.fillStyle='#ffffff'; ctx.fillText(icon, 0, 1);
  ctx.restore();
}


export function drawPlayer(ctx, x, y, dir, t) {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t*5)*1.2;
  const faceLeft = dir==="left"?-1:1;
  const faceAngle = dir==="up"?-0.2:dir==="down"?0.2:0;
  ctx.rotate(faceAngle);
  const bodyR = 18;
  // Tail — forked fan shape
  ctx.save();
  const tailWag = Math.sin(t*8)*0.18; ctx.rotate(tailWag);
  const tbx = -faceLeft*17;
  const tGrad = ctx.createLinearGradient(tbx-faceLeft*2,bob-18,tbx-faceLeft*2,bob+18);
  tGrad.addColorStop(0,"#cc1100"); tGrad.addColorStop(0.5,"#bb0800"); tGrad.addColorStop(1,"#991000");
  ctx.fillStyle=tGrad;
  // Upper lobe
  ctx.beginPath(); ctx.moveTo(tbx+faceLeft*4,bob-3);
  ctx.quadraticCurveTo(tbx,bob-8,tbx-faceLeft*10,bob-18);
  ctx.quadraticCurveTo(tbx-faceLeft*8,bob-1,tbx+faceLeft*3,bob);
  ctx.closePath(); ctx.fill();
  // Lower lobe
  ctx.beginPath(); ctx.moveTo(tbx+faceLeft*4,bob+3);
  ctx.quadraticCurveTo(tbx,bob+8,tbx-faceLeft*10,bob+18);
  ctx.quadraticCurveTo(tbx-faceLeft*8,bob+1,tbx+faceLeft*3,bob);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Dorsal fin
  const dfGrad = ctx.createLinearGradient(0,bob-17,0,bob-32);
  dfGrad.addColorStop(0,"#dd1100"); dfGrad.addColorStop(1,"#aa0500");
  ctx.fillStyle=dfGrad; ctx.beginPath(); ctx.moveTo(-7,bob-16);
  ctx.quadraticCurveTo(-2,bob-32,5,bob-27); ctx.quadraticCurveTo(9,bob-21,9,bob-16); ctx.closePath(); ctx.fill();
  // Bottom fin
  const bfGrad = ctx.createLinearGradient(0,bob+15,0,bob+28);
  bfGrad.addColorStop(0,"#dd1100"); bfGrad.addColorStop(1,"#aa0500");
  ctx.fillStyle=bfGrad; ctx.beginPath(); ctx.moveTo(faceLeft*3,bob+15);
  ctx.quadraticCurveTo(faceLeft*6,bob+28,faceLeft*-3,bob+26);
  ctx.quadraticCurveTo(faceLeft*-6,bob+19,faceLeft*-3,bob+15); ctx.closePath(); ctx.fill();
  // Side fin — flapping pectoral
  const sfx = -faceLeft*5; const finFlap = Math.sin(t*6)*0.3;
  ctx.save(); ctx.translate(sfx,bob+6); ctx.rotate(finFlap-faceLeft*0.35);
  const sfGrad = ctx.createLinearGradient(0,0,-faceLeft*13,9);
  sfGrad.addColorStop(0,"#ee1a00"); sfGrad.addColorStop(1,"#aa0800");
  ctx.fillStyle=sfGrad; ctx.beginPath(); ctx.moveTo(0,0);
  ctx.quadraticCurveTo(-faceLeft*7,-3,-faceLeft*14,5); ctx.quadraticCurveTo(-faceLeft*9,9,-faceLeft*1,5);
  ctx.closePath(); ctx.fill(); ctx.restore();
  // Body — chubby sphere with rich gold gradient
  const bodyGrad = ctx.createRadialGradient(faceLeft*3-2,-6+bob,1,0,bob,bodyR+2);
  bodyGrad.addColorStop(0,"#fff5b0"); bodyGrad.addColorStop(0.12,"#ffe633");
  bodyGrad.addColorStop(0.45,"#f5b800"); bodyGrad.addColorStop(0.78,"#d97800"); bodyGrad.addColorStop(1,"#b04800");
  ctx.beginPath(); ctx.arc(0,bob,bodyR,0,Math.PI*2); ctx.fillStyle=bodyGrad; ctx.fill();
  ctx.strokeStyle="rgba(100,40,0,0.3)"; ctx.lineWidth=1.2; ctx.stroke();
  // Snout bump
  const nx=faceLeft*15, ny=bob+3;
  const noseGrad = ctx.createRadialGradient(nx-faceLeft,ny-1,1,nx,ny,6);
  noseGrad.addColorStop(0,"#ffe850"); noseGrad.addColorStop(1,"#d98000");
  ctx.beginPath(); ctx.ellipse(nx,ny,5.5,5,0,0,Math.PI*2); ctx.fillStyle=noseGrad; ctx.fill();
  // Mouth — small round opening
  ctx.beginPath(); ctx.arc(faceLeft*18,bob+5,3.2,0,Math.PI*2);
  ctx.fillStyle="#aa3300"; ctx.fill();
  ctx.beginPath(); ctx.arc(faceLeft*18,bob+5,2,0,Math.PI*2);
  ctx.fillStyle="#551500"; ctx.fill();
  // Eyes — big and prominent, Blinky-style
  const eyeLookX = dir==="left"?-1.5:dir==="right"?1.5:0;
  const eyeLookY = dir==="up"?-1.5:dir==="down"?1.5:0;
  for (let side=-1;side<=1;side+=2){
    const ex=faceLeft*5+side*5.5, ey=bob-6;
    const lidGrad = ctx.createRadialGradient(ex,ey-3,1,ex,ey-2,10);
    lidGrad.addColorStop(0,"#ff5511"); lidGrad.addColorStop(1,"#cc1100");
    ctx.fillStyle=lidGrad; ctx.beginPath(); ctx.ellipse(ex,ey-3,8.5,6.5,0,Math.PI+0.15,-0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(ex,ey,7.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(60,20,0,0.2)"; ctx.lineWidth=0.8; ctx.stroke();
    ctx.fillStyle="#1a0800"; ctx.beginPath(); ctx.arc(ex+eyeLookX,ey+eyeLookY,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(ex+eyeLookX-1.8,ey+eyeLookY-1.8,2,0,Math.PI*2); ctx.fill();
  }
  // Strong specular highlight — top-left gloss
  const spec = ctx.createRadialGradient(-6,-10+bob,0,-5,-8+bob,9);
  spec.addColorStop(0,"rgba(255,255,255,0.82)"); spec.addColorStop(0.45,"rgba(255,255,230,0.35)"); spec.addColorStop(1,"rgba(255,255,200,0)");
  ctx.fillStyle=spec; ctx.beginPath(); ctx.arc(0,bob,bodyR,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

export function drawChombert(ctx, x, y, dir, t) {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t * 5) * 1.5;
  const faceLeft = (dir && dir.dx < 0) ? -1 : 1;
  const bodyR = 18;

  // Tail — forked fan at the back
  const tbx = -faceLeft * 16;
  const tailWag = Math.sin(t * 7) * 0.15;
  ctx.save(); ctx.rotate(tailWag);
  const tGrad = ctx.createLinearGradient(tbx, bob - 12, tbx, bob + 12);
  tGrad.addColorStop(0, "#00cc88"); tGrad.addColorStop(0.5, "#009966"); tGrad.addColorStop(1, "#006644");
  ctx.fillStyle = tGrad;
  // Upper lobe
  ctx.beginPath(); ctx.moveTo(tbx + faceLeft * 4, bob - 2);
  ctx.quadraticCurveTo(tbx, bob - 6, tbx - faceLeft * 9, bob - 14);
  ctx.quadraticCurveTo(tbx - faceLeft * 7, bob - 1, tbx + faceLeft * 3, bob);
  ctx.closePath(); ctx.fill();
  // Lower lobe
  ctx.beginPath(); ctx.moveTo(tbx + faceLeft * 4, bob + 2);
  ctx.quadraticCurveTo(tbx, bob + 6, tbx - faceLeft * 9, bob + 14);
  ctx.quadraticCurveTo(tbx - faceLeft * 7, bob + 1, tbx + faceLeft * 3, bob);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Dorsal fin — small triangular ridge on top
  const dfGrad = ctx.createLinearGradient(0, bob - 16, 0, bob - 26);
  dfGrad.addColorStop(0, "#0099cc"); dfGrad.addColorStop(1, "#006699");
  ctx.fillStyle = dfGrad;
  ctx.beginPath(); ctx.moveTo(-5, bob - 16);
  ctx.quadraticCurveTo(-1, bob - 26, 5, bob - 22);
  ctx.quadraticCurveTo(7, bob - 17, 7, bob - 16);
  ctx.closePath(); ctx.fill();

  // Pectoral fin — small stubby flipper, flapping
  const finFlap = Math.sin(t * 6) * 0.28;
  const pfx = faceLeft * 6;
  ctx.save(); ctx.translate(pfx, bob + 5); ctx.rotate(finFlap + faceLeft * 0.3);
  const pfGrad = ctx.createLinearGradient(0, 0, faceLeft * 12, 8);
  pfGrad.addColorStop(0, "#00bbaa"); pfGrad.addColorStop(1, "#007755");
  ctx.fillStyle = pfGrad;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(faceLeft * 6, -2, faceLeft * 12, 4);
  ctx.quadraticCurveTo(faceLeft * 8, 8, faceLeft * 1, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Body — chubby sphere, deep royal blue with teal highlight and green-teal base
  const bodyGrad = ctx.createRadialGradient(faceLeft * 2 - 3, -7 + bob, 2, 0, bob, bodyR + 2);
  bodyGrad.addColorStop(0, "#66eeff");    // bright teal specular
  bodyGrad.addColorStop(0.18, "#22aadd"); // mid teal-blue
  bodyGrad.addColorStop(0.5, "#1155cc");  // deep royal blue
  bodyGrad.addColorStop(0.8, "#003388");  // dark blue
  bodyGrad.addColorStop(1, "#001155");    // near-black blue edge
  ctx.beginPath(); ctx.arc(0, bob, bodyR, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad; ctx.fill();
  ctx.strokeStyle = "rgba(0,20,60,0.35)"; ctx.lineWidth = 1.2; ctx.stroke();

  // Green-teal belly tint at the bottom
  const bellyGrad = ctx.createRadialGradient(0, bob + 10, 2, 0, bob + 8, 14);
  bellyGrad.addColorStop(0, "rgba(0,200,100,0.55)");
  bellyGrad.addColorStop(1, "rgba(0,200,100,0)");
  ctx.beginPath(); ctx.arc(0, bob, bodyR, 0, Math.PI * 2);
  ctx.fillStyle = bellyGrad; ctx.fill();

  // Eyes — two large round eyes, wide-set, very prominent
  for (let side = -1; side <= 1; side += 2) {
    const ex = faceLeft * 4 + side * 6, ey = bob - 4;
    // White sclera
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex, ey, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(0,30,80,0.2)"; ctx.lineWidth = 0.8; ctx.stroke();
    // Pupil
    ctx.fillStyle = "#111133";
    ctx.beginPath(); ctx.arc(ex + faceLeft * 0.5, ey + 0.5, 3.5, 0, Math.PI * 2); ctx.fill();
    // Specular highlight
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(ex + faceLeft * 0.5 - 1.5, ey - 1.2, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // Mouth — small curved line at the snout
  ctx.strokeStyle = "#002255"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(faceLeft * 15, bob + 5, 4, Math.PI * 0.6, Math.PI * 1.4);
  ctx.stroke();

  // Body specular highlight — top-left gloss
  const spec = ctx.createRadialGradient(-5, -9 + bob, 0, -4, -7 + bob, 9);
  spec.addColorStop(0, "rgba(160,240,255,0.75)");
  spec.addColorStop(0.5, "rgba(100,200,255,0.25)");
  spec.addColorStop(1, "rgba(100,200,255,0)");
  ctx.fillStyle = spec;
  ctx.beginPath(); ctx.arc(0, bob, bodyR, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// Draw crawler with freeze effect (for EXTRA complete)
export function drawFrozenEnemy(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const pulse = 1 + Math.sin(t*8)*0.05;
  ctx.scale(pulse, pulse);
  // Ice bubble encasing the enemy
  const iceGrad = ctx.createRadialGradient(-8,-8,0,0,0,20);
  iceGrad.addColorStop(0,'rgba(180,230,255,0.6)');
  iceGrad.addColorStop(0.5,'rgba(100,180,255,0.35)');
  iceGrad.addColorStop(1,'rgba(50,120,220,0.15)');
  ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2);
  ctx.fillStyle=iceGrad; ctx.fill();
  ctx.strokeStyle='rgba(150,210,255,0.7)'; ctx.lineWidth=2; ctx.stroke();
  // Star sparkles
  for(let i=0;i<4;i++){
    const a=(i/4)*Math.PI*2+t*2, r=15;
    const sx=Math.cos(a)*r, sy=Math.sin(a)*r;
    ctx.beginPath(); ctx.arc(sx,sy,2,0,Math.PI*2);
    ctx.fillStyle=`rgba(200,240,255,${0.4+Math.sin(t*6+i)*0.3})`; ctx.fill();
  }
  ctx.restore();
}

export function drawBouncer(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const sq=1+Math.sin(t*6)*0.1, bob=Math.cos(t*6)*3;
  ctx.scale(1/sq,sq);
  ctx.save();ctx.scale(1,0.3);ctx.beginPath();ctx.arc(0,25,12,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,30,0.2)";ctx.fill();ctx.restore();
  const grad=ctx.createRadialGradient(-4,-6+bob,2,0,bob,16);
  grad.addColorStop(0,"#88aaff");grad.addColorStop(0.35,"#5577ee");
  grad.addColorStop(0.7,"#3344cc");grad.addColorStop(1,"#1a2288");
  ctx.beginPath();ctx.arc(0,bob,15,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
  ctx.strokeStyle="#111855";ctx.lineWidth=1.5;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.arc(0,bob,15,0,Math.PI*2);ctx.clip();
  ctx.strokeStyle="rgba(20,20,80,0.25)";ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,bob+2,15,4,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  const hl=ctx.createRadialGradient(-5,-8+bob,0,-3,-5+bob,10);
  hl.addColorStop(0,"rgba(200,220,255,0.6)");hl.addColorStop(0.5,"rgba(200,220,255,0.15)");
  hl.addColorStop(1,"rgba(200,220,255,0)");
  ctx.fillStyle=hl;ctx.beginPath();ctx.arc(0,bob,15,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(-5,-7+bob,3,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,0.65)";ctx.fill();
  ctx.fillStyle="#fff";
  ctx.beginPath();ctx.ellipse(-5,-1+bob,5,5.5,0,0,Math.PI*2);ctx.ellipse(5,-1+bob,5,5.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#cc2200";ctx.beginPath();ctx.arc(-5,bob,3,0,Math.PI*2);ctx.arc(5,bob,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#220000";ctx.beginPath();ctx.arc(-5,bob,1.5,0,Math.PI*2);ctx.arc(5,bob,1.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-6,-1+bob,1,0,Math.PI*2);ctx.arc(4,-1+bob,1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#111855";ctx.lineWidth=2.5;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-10,-7+bob);ctx.lineTo(-2,-5+bob);ctx.stroke();
  ctx.beginPath();ctx.moveTo(10,-7+bob);ctx.lineTo(2,-5+bob);ctx.stroke();
  ctx.beginPath();ctx.arc(0,11+bob,4,Math.PI+0.3,-0.3);ctx.strokeStyle="#111855";ctx.lineWidth=1.5;ctx.stroke();
  ctx.restore();
}

// Remington Eel - sinuous purple eel
export function drawEel(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const wave = Math.sin(t*7)*0.15;
  // Eel body segments
  for(let i=3;i>=0;i--){
    const seg = i/3;
    const sx = -Math.sin(t*7+i*0.8)*8*seg;
    const sy = i*5;
    const r = 9-i*1.5;
    const grad = ctx.createRadialGradient(sx-2,-sy-2,1,sx,-sy,r);
    grad.addColorStop(0,'#cc88ff'); grad.addColorStop(0.5,'#8833cc'); grad.addColorStop(1,'#551188');
    ctx.beginPath(); ctx.ellipse(sx,-sy,r,r*0.85,wave*seg,0,Math.PI*2);
    ctx.fillStyle=grad; ctx.fill();
  }
  // Head
  ctx.save(); ctx.rotate(wave);
  const hg=ctx.createRadialGradient(-3,-3,2,0,0,11);
  hg.addColorStop(0,'#dd99ff'); hg.addColorStop(0.4,'#9944dd'); hg.addColorStop(1,'#660099');
  ctx.beginPath(); ctx.ellipse(0,0,11,9,0,0,Math.PI*2); ctx.fillStyle=hg; ctx.fill();
  ctx.strokeStyle='#330066'; ctx.lineWidth=1.5; ctx.stroke();
  // Eyes
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(5,-4,3.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#220033'; ctx.beginPath(); ctx.arc(6,-4,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(6.5,-5,0.8,0,Math.PI*2); ctx.fill();
  // Fin ridges
  ctx.strokeStyle='rgba(200,130,255,0.5)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-4,-8); ctx.quadraticCurveTo(0,-14,5,-8); ctx.stroke();
  ctx.restore();
  // Highlight
  const hl=ctx.createRadialGradient(-4,-5,0,-4,-5,7);
  hl.addColorStop(0,'rgba(220,180,255,0.4)'); hl.addColorStop(1,'rgba(220,180,255,0)');
  ctx.fillStyle=hl; ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Normal Shark - sleek grey shark
export function drawShark(ctx, x, y, dir, t) {
  ctx.save(); ctx.translate(x, y);
  const bob = Math.sin(t*4)*1.5;
  const facing = (dir&&dir.dx<0)?-1:1;
  ctx.scale(facing, 1);
  // Tail
  const tailWag = Math.sin(t*9)*0.2;
  ctx.save(); ctx.rotate(tailWag);
  ctx.beginPath(); ctx.moveTo(-13,bob);
  ctx.quadraticCurveTo(-20,bob-10,-22,bob-16);
  ctx.quadraticCurveTo(-19,bob-3,-22,bob+10);
  ctx.quadraticCurveTo(-20,bob+3,-13,bob);
  ctx.fillStyle='#778899'; ctx.fill();
  ctx.restore();
  // Dorsal fin
  ctx.beginPath(); ctx.moveTo(-2,bob-12); ctx.lineTo(5,bob-22); ctx.lineTo(10,bob-13); ctx.closePath();
  ctx.fillStyle='#667788'; ctx.fill();
  // Body
  const bg=ctx.createRadialGradient(-2,-3+bob,3,0,bob,15);
  bg.addColorStop(0,'#aabbcc'); bg.addColorStop(0.4,'#889aaa'); bg.addColorStop(0.8,'#667788'); bg.addColorStop(1,'#445566');
  ctx.beginPath(); ctx.ellipse(0,bob,15,11,0,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle='#334455'; ctx.lineWidth=1.2; ctx.stroke();
  // Belly
  ctx.beginPath(); ctx.ellipse(2,bob+5,9,5,0.3,0,Math.PI);
  ctx.fillStyle='rgba(220,230,240,0.6)'; ctx.fill();
  // Eye
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(9,bob-3,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(10,bob-3,2.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(10.5,bob-4,1,0,Math.PI*2); ctx.fill();
  // Mouth (menacing)
  ctx.strokeStyle='#334455'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(12,bob+4); ctx.lineTo(16,bob+1); ctx.lineTo(12,bob-1); ctx.stroke();
  // Glow when spitting
  ctx.restore();
}

// Haarrfish - spiky dangerous starfish
export function drawHaarrfish(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.rotate(t*4); // spins fast
  const pulse = 1+Math.sin(t*12)*0.08;
  ctx.scale(pulse,pulse);
  // Danger glow
  const glow=ctx.createRadialGradient(0,0,0,0,0,20);
  glow.addColorStop(0,'rgba(255,80,0,0.3)'); glow.addColorStop(1,'rgba(255,80,0,0)');
  ctx.fillStyle=glow; ctx.fillRect(-22,-22,44,44);
  // Star points
  for(let i=0;i<5;i++){
    const a=(i/5)*Math.PI*2-Math.PI/2;
    const a1=(i/5)*Math.PI*2-Math.PI/2-0.35, a2=a-0.35, a3=a+0.35, a4=(i/5)*Math.PI*2-Math.PI/2+0.35;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a1)*7,Math.sin(a1)*7);
    ctx.lineTo(Math.cos(a)*18,Math.sin(a)*18);
    ctx.lineTo(Math.cos(a4)*7,Math.sin(a4)*7);
    const seg=ctx.createRadialGradient(Math.cos(a)*8,Math.sin(a)*8,0,Math.cos(a)*8,Math.sin(a)*8,14);
    seg.addColorStop(0,'#ff8833'); seg.addColorStop(0.5,'#ee4400'); seg.addColorStop(1,'#aa2200');
    ctx.fillStyle=seg; ctx.fill();
    ctx.strokeStyle='#771100'; ctx.lineWidth=1; ctx.stroke();
  }
  // Center disc
  const cd=ctx.createRadialGradient(-3,-3,1,0,0,9);
  cd.addColorStop(0,'#ffcc44'); cd.addColorStop(0.5,'#ff8800'); cd.addColorStop(1,'#cc4400');
  ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fillStyle=cd; ctx.fill();
  ctx.strokeStyle='#882200'; ctx.lineWidth=1.5; ctx.stroke();
  // Menacing eyes
  ctx.restore(); ctx.save(); ctx.translate(x,y);
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(-3,-2,2.5,0,Math.PI*2); ctx.arc(3,-2,2.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff2200'; ctx.beginPath(); ctx.arc(-3,-2,1.2,0,Math.PI*2); ctx.arc(3,-2,1.2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// Trap bubble (Normal shark spit) - encases the player
export function drawTrapBubble(ctx, tb, t) {
  ctx.save(); ctx.translate(tb.x, tb.y);
  const pulse=1+Math.sin(t*6)*0.05;
  ctx.scale(pulse,pulse);
  const bg=ctx.createRadialGradient(-BUBBLE_R*0.3,-BUBBLE_R*0.35,BUBBLE_R*0.05,0,0,BUBBLE_R);
  bg.addColorStop(0,'rgba(255,255,255,0.7)'); bg.addColorStop(0.3,'rgba(200,230,255,0.5)');
  bg.addColorStop(0.8,'rgba(100,180,255,0.3)'); bg.addColorStop(1,'rgba(50,150,255,0.15)');
  ctx.beginPath(); ctx.arc(0,0,BUBBLE_R,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle='rgba(150,210,255,0.8)'; ctx.lineWidth=2; ctx.stroke();
  const hl=ctx.createRadialGradient(-BUBBLE_R*0.28,-BUBBLE_R*0.3,0,-BUBBLE_R*0.28,-BUBBLE_R*0.3,BUBBLE_R*0.55);
  hl.addColorStop(0,'rgba(255,255,255,0.8)'); hl.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(0,0,BUBBLE_R,0,Math.PI*2); ctx.fillStyle=hl; ctx.fill();
  ctx.restore();
}


export function drawPopEffect(ctx, x, y, frame) {
  const p=frame/BUBBLE_POP_FRAMES; if(p>=1) return;
  const alpha=(1-p)*0.8, r=BUBBLE_R+p*25;
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=`rgba(180,220,255,${alpha})`; ctx.lineWidth=3*(1-p); ctx.stroke();
  if(p<0.3){const fa=(0.3-p)/0.3;
    const fg=ctx.createRadialGradient(x,y,0,x,y,BUBBLE_R);
    fg.addColorStop(0,`rgba(255,255,255,${fa*0.5})`); fg.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(x,y,BUBBLE_R,0,Math.PI*2); ctx.fill();}
  for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2+p*1.5, d=r*0.7+p*15, sz=3.5-p*3.5;
    if(sz>0){const px=x+Math.cos(a)*d, py=y+Math.sin(a)*d;
      ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2);
      const pg=ctx.createRadialGradient(px-1,py-1,0,px,py,sz);
      pg.addColorStop(0,"#ffffff"); pg.addColorStop(1,"#aaccee");
      ctx.fillStyle=pg; ctx.fill();}}
  ctx.restore();
}

export function drawStar(ctx, x, y, t, alpha) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(t*3); ctx.globalAlpha=alpha;
  ctx.beginPath();
  for(let i=0;i<8;i++){const r=i%2===0?6:2.5, a=(i/8)*Math.PI*2-Math.PI/2;
    i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  ctx.closePath(); ctx.fillStyle="#ffee33"; ctx.fill(); ctx.restore();
}

export function drawHUDFish(ctx, x, y) {
  const grad=ctx.createRadialGradient(x-2,y-2,1,x,y,10);
  grad.addColorStop(0,"#ffe855"); grad.addColorStop(0.4,"#f5b800");
  grad.addColorStop(0.8,"#dd8c00"); grad.addColorStop(1,"#bb6600");
  ctx.beginPath(); ctx.arc(x,y,9,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();
  ctx.fillStyle="#ee5500";
  ctx.beginPath(); ctx.moveTo(x-8,y-1); ctx.quadraticCurveTo(x-13,y-2,x-15,y-7);
  ctx.quadraticCurveTo(x-12,y,x-15,y+7); ctx.quadraticCurveTo(x-13,y+2,x-8,y+1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x-2,y-8); ctx.quadraticCurveTo(x,y-14,x+2,y-10);
  ctx.quadraticCurveTo(x+3,y-8,x+3,y-7); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x+3,y-2,3.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#ff7722"; ctx.beginPath(); ctx.arc(x+3,y-3.5,3,Math.PI+0.2,-0.2); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#111"; ctx.beginPath(); ctx.arc(x+3,y-1.5,1.8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x+2.5,y-2.5,0.7,0,Math.PI*2); ctx.fill();
}

// ─── Weighted enemy type selector ───
// Tiers: L1-2 Chombert only | L3-5 +Remington | L6-9 +Normal | L10+ +Haarrfish
