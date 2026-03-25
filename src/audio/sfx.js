import { ModPlayer, BONGALONGA_B64 } from './modPlayer';

let audioCtx = null;
function getAudio() { return audioCtx; }

// ── BubbleSFX: watery rubber bubble SFX engine ───────────────────────────
const BubbleSFX = (() => {
  let _ctx=null, _masterGain=null, _noiseBuffer=null, _wetness=0.55;
  const MAX_VOICES=6, _voices=[];
  const COOLDOWNS={pop:70,push:175,merge:120,bump:40};
  const FRAME_CAPS={pop:2,push:1,merge:2,bump:3};
  const PRIORITY  ={pop:3,push:2,merge:4,bump:1};
  const _cooldownAt={};
  let _frameAudioIdx=-1;
  const _frameCounts={};
  const FRAME_DUR=1/60;

  function init(ctx) {
    if (_ctx===ctx && _noiseBuffer) return;
    _ctx=ctx;
    _masterGain=_ctx.createGain(); _masterGain.gain.value=0.88;
    _masterGain.connect(_ctx.destination);
    const len=_ctx.sampleRate*2;
    _noiseBuffer=_ctx.createBuffer(1,len,_ctx.sampleRate);
    const ch=_noiseBuffer.getChannelData(0);
    for(let i=0;i<len;i++) ch[i]=Math.random()*2-1;
  }
  const jit=(v,f)=>v*(1+(Math.random()*2-1)*f);
  function _wetParams(){
    return {
      cutoff: jit(1600-_wetness*1200, 0.10),
      wetGain: jit(0.05+_wetness*0.20, 0.10),
    };
  }
  function _canPlay(type){
    if(!_ctx||!_masterGain) return false;
    const now=_ctx.currentTime;
    const fi=Math.floor(now/FRAME_DUR);
    if(fi!==_frameAudioIdx){_frameAudioIdx=fi; for(const k in _frameCounts) _frameCounts[k]=0;}
    if((_frameCounts[type]||0)>=(FRAME_CAPS[type]??99)) return false;
    const lastAt=_cooldownAt[type];
    if(lastAt!==undefined&&(now-lastAt)*1000<COOLDOWNS[type]) return false;
    return true;
  }
  function _register(type,durSec){
    const now=_ctx.currentTime;
    _cooldownAt[type]=now; _frameCounts[type]=(_frameCounts[type]||0)+1;
    for(let i=_voices.length-1;i>=0;i--) if(_voices[i].endTime<=now) _voices.splice(i,1);
    if(_voices.length>=MAX_VOICES){
      _voices.sort((a,b)=>a.priority-b.priority||a.endTime-b.endTime);
      _voices.shift();
    }
    _voices.push({type,priority:PRIORITY[type]||1,endTime:now+durSec});
  }
  function _body(dest,freqA,freqB,bendSec,attackSec,decaySec,vol){
    const now=_ctx.currentTime;
    const o=_ctx.createOscillator(), g=_ctx.createGain();
    o.type='triangle'; o.connect(g); g.connect(dest);
    o.frequency.setValueAtTime(jit(freqA,0.04),now);
    o.frequency.exponentialRampToValueAtTime(Math.max(jit(freqB,0.04),20),now+jit(bendSec,0.08));
    g.gain.setValueAtTime(0.0001,now);
    g.gain.linearRampToValueAtTime(jit(vol,0.10),now+jit(attackSec,0.12));
    g.gain.exponentialRampToValueAtTime(0.0001,now+decaySec);
    o.start(now); o.stop(now+decaySec+0.02);
  }
  function _wet(dest,dur,filterType='lowpass',cutoffOverride=null,gainOverride=null){
    if(!_noiseBuffer) return;
    const {cutoff,wetGain}=_wetParams(), now=_ctx.currentTime;
    const maxOff=_noiseBuffer.duration-dur-0.05;
    const offset=Math.random()*Math.max(maxOff,0);
    const src=_ctx.createBufferSource(); src.buffer=_noiseBuffer;
    const filt=_ctx.createBiquadFilter(); filt.type=filterType;
    filt.frequency.setValueAtTime(cutoffOverride??cutoff,now); filt.Q.value=filterType==='bandpass'?1.2:0.75;
    const g=_ctx.createGain(); g.gain.setValueAtTime(gainOverride??wetGain,now);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    src.connect(filt); filt.connect(g); g.connect(dest);
    src.start(now,offset,dur+0.02);
  }
  function _click(dest,freq,dur,vol){
    const now=_ctx.currentTime;
    const o=_ctx.createOscillator(), g=_ctx.createGain();
    o.type='sine'; o.frequency.value=freq;
    o.connect(g); g.connect(dest);
    g.gain.setValueAtTime(jit(vol,0.08),now);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    o.start(now); o.stop(now+dur+0.005);
  }
  function _thump(dest,freq,dur,vol){
    const now=_ctx.currentTime;
    const o=_ctx.createOscillator(), g=_ctx.createGain();
    o.type='sine'; o.connect(g); g.connect(dest);
    o.frequency.setValueAtTime(jit(freq,0.06),now);
    o.frequency.exponentialRampToValueAtTime(20,now+dur*0.7);
    g.gain.setValueAtTime(0.0001,now);
    g.gain.linearRampToValueAtTime(jit(vol,0.08),now+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    o.start(now); o.stop(now+dur+0.01);
  }
  function playBubblePop(){
    if(!_canPlay('pop')) return; const DUR=0.28; _register('pop',DUR);
    _click(_masterGain,1200,0.015,0.70);
    _body(_masterGain,800,40,0.180,0.002,DUR,0.65);
    _body(_masterGain,200,50,0.100,0.002,0.13,0.22);
    _thump(_masterGain,90,0.22,0.55);
    _wet(_masterGain,jit(0.090,0.12),'bandpass',jit(1200,0.10),0.50);
  }
  function playBubblePush(){
    if(!_canPlay('push')) return; const DUR=0.40; _register('push',DUR);
    _body(_masterGain,450,250,0.30,0.015,DUR,0.55); _wet(_masterGain,jit(0.080,0.15),'lowpass',null,0.35);
  }
  function playBubbleMerge(){
    if(!_canPlay('merge')) return; const DUR=0.27; _register('merge',DUR);
    _body(_masterGain,380,200,0.140,0.002,DUR,0.24);
    _body(_masterGain,500,200,0.160,0.004,DUR*0.9,0.17);
    _wet(_masterGain,jit(0.062,0.12));
  }
  function playBubbleBump(){
    if(!_canPlay('bump')) return; const DUR=0.11; _register('bump',DUR);
    _body(_masterGain,260,185,0.052,0.004,DUR,0.18); _wet(_masterGain,jit(0.028,0.12));
  }
  function setWetness(v){ _wetness=Math.max(0,Math.min(1,v)); }
  function isReady(){ return !!(_ctx&&_noiseBuffer&&_masterGain); }
  return {init,playBubblePop,playBubblePush,playBubbleMerge,playBubbleBump,setWetness,isReady};
})();

async function unlockAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return; }
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  BubbleSFX.init(audioCtx);
  ModPlayer.init(audioCtx);
  if (!ModPlayer.isReady()) {
    try {
      const raw = atob(BONGALONGA_B64);
      const buf = new ArrayBuffer(raw.length);
      const view = new Uint8Array(buf);
      for (let i=0;i<raw.length;i++) view[i]=raw.charCodeAt(i);
      ModPlayer.load(buf);
    } catch(e) { console.warn('MOD load failed', e); }
  }
}
function playSound(type) {
  const ctx = getAudio(); if (!ctx) return;
  if (type==='pop')    { BubbleSFX.playBubblePop();  return; }
  if (type==='push')   { BubbleSFX.playBubblePush(); return; }
  if (type==='bounce') { BubbleSFX.playBubbleBump(); return; }
  try {
    const now = ctx.currentTime;
    const osc = (type2, freq, attack, decay, vol=0.3) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type2; o.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now+decay);
      o.start(now); o.stop(now+decay+0.01); return {o, g};
    };
    const noise = (dur, filterFreq, vol=0.3) => {
      const buf = ctx.createBuffer(1, ctx.sampleRate*dur, ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=filterFreq; f.Q.value=3;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(now);
    };
    if (type==='crush') {
      const {o} = osc('sawtooth',280,0,0.3,0.4); o.frequency.exponentialRampToValueAtTime(40,now+0.25);
      noise(0.15, 600, 0.3);
      const p = ctx.createOscillator(); const pg = ctx.createGain();
      p.connect(pg); pg.connect(ctx.destination); p.type='sine'; p.frequency.value=880;
      pg.gain.setValueAtTime(0.15,now+0.1); pg.gain.exponentialRampToValueAtTime(0.0001,now+0.35);
      p.start(now+0.1); p.stop(now+0.36);
    }
    if (type==='gem') {
      [523,659,784,1047].forEach((f,i)=>{
        const o2=ctx.createOscillator(), g2=ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination); o2.type='sine'; o2.frequency.value=f;
        const t2=now+i*0.06;
        g2.gain.setValueAtTime(0.001,t2); g2.gain.linearRampToValueAtTime(0.22,t2+0.02);
        g2.gain.exponentialRampToValueAtTime(0.0001,t2+0.18);
        o2.start(t2); o2.stop(t2+0.2);
      });
    }
    if (type==='extra_letter') {
      const {o} = osc('sine',660,0,0.35,0.28);
      o.frequency.setValueAtTime(660,now); o.frequency.linearRampToValueAtTime(880,now+0.1);
    }
    if (type==='extra_complete') {
      [523,659,784,1047,1047,1319].forEach((f,i)=>{
        const o2=ctx.createOscillator(),g2=ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination); o2.type='square'; o2.frequency.value=f;
        const t2=now+i*0.1; const dur=i===5?0.35:0.12;
        g2.gain.setValueAtTime(0.18,t2); g2.gain.exponentialRampToValueAtTime(0.0001,t2+dur);
        o2.start(t2); o2.stop(t2+dur+0.01);
      });
    }
    if (type==='level_complete') {
      [392,523,523,659,523,784,740].forEach((f,i)=>{
        const o2=ctx.createOscillator(),g2=ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination); o2.type='triangle'; o2.frequency.value=f;
        const t2=now+i*0.18;
        g2.gain.setValueAtTime(0.22,t2); g2.gain.exponentialRampToValueAtTime(0.0001,t2+0.25);
        o2.start(t2); o2.stop(t2+0.26);
      });
    }
    if (type==='death') {
      const {o} = osc('sawtooth',400,0,0.9,0.45); o.frequency.exponentialRampToValueAtTime(50,now+0.75);
      noise(0.2, 300, 0.2);
    }
    if (type==='capture') {
      [220,330,440,660].forEach((f,i)=>{
        const o2=ctx.createOscillator(),g2=ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination); o2.type='sine'; o2.frequency.value=f;
        const t2=now+i*0.07;
        g2.gain.setValueAtTime(0.2,t2); g2.gain.exponentialRampToValueAtTime(0.0001,t2+0.4);
        o2.start(t2); o2.stop(t2+0.41);
      });
    }
    if (type==='timer_warn') {
      const {o} = osc('square',200,0,0.1,0.12); o.frequency.setValueAtTime(200,now);
    }
    if (type==='speedup') {
      const {o} = osc('sawtooth',150,0,0.2,0.2); o.frequency.linearRampToValueAtTime(250,now+0.15);
    }
    if (type==='bonus_tick') {
      const o2=ctx.createOscillator(), g2=ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.type='sine'; o2.frequency.setValueAtTime(1200,now); o2.frequency.exponentialRampToValueAtTime(900,now+0.04);
      g2.gain.setValueAtTime(0.18,now); g2.gain.exponentialRampToValueAtTime(0.0001,now+0.05);
      o2.start(now); o2.stop(now+0.06);
    }
    if (type==='level_start') {
      [330,392,523,659].forEach((f,i)=>{
        const o2=ctx.createOscillator(),g2=ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination); o2.type='sine'; o2.frequency.value=f;
        const t2=now+i*0.11;
        g2.gain.setValueAtTime(0.001,t2); g2.gain.linearRampToValueAtTime(0.28,t2+0.03);
        g2.gain.exponentialRampToValueAtTime(0.0001,t2+0.35);
        o2.start(t2); o2.stop(t2+0.36);
      });
      noise(0.08,180,0.18);
    }
  } catch(e) {}
}

export { getAudio, BubbleSFX, unlockAudio, playSound, audioCtx };
