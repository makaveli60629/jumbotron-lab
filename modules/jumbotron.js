import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

function makeCanvasTexture(){
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');

  function draw(t){
    // high-contrast frame so it's easy to see
    ctx.fillStyle = '#04070b'; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = '#0b1320'; ctx.fillRect(24,24,c.width-48,c.height-48);
    ctx.strokeStyle = '#7ee0ff'; ctx.lineWidth = 6;
    ctx.strokeRect(24,24,c.width-48,c.height-48);

    // animated content (acts like a playlist without external files)
    const k = (Math.sin(t*0.001)+1)/2;
    const grad = ctx.createLinearGradient(24,24,c.width-24,c.height-24);
    grad.addColorStop(0, `rgba(126,224,255,${0.15+0.35*k})`);
    grad.addColorStop(1, `rgba(255,204,102,${0.10+0.25*(1-k)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(40,40,c.width-80,c.height-80);

    ctx.fillStyle = '#e9f2ff';
    ctx.font = 'bold 46px system-ui,Arial';
    ctx.fillText('SCARLETT DEV JUMBOTRON', 56, 105);

    ctx.font = '22px ui-monospace, Menlo, monospace';
    ctx.fillText('AUTO VISUAL + SYNTH AUDIO', 56, 150);
    ctx.fillText('Tap UNMUTE for sound (mobile requires gesture).', 56, 184);

    // bars
    const bars = 28;
    for (let i=0;i<bars;i++){
      const x = 70 + i*32;
      const h = 60 + (Math.sin(t*0.004 + i*0.6)*0.5+0.5)*180;
      ctx.fillStyle = `rgba(4,7,11,0.65)`;
      ctx.fillRect(x, c.height-90-h, 18, h);
      ctx.fillStyle = `rgba(231,242,255,0.85)`;
      ctx.fillRect(x, c.height-90-h, 18, h*0.16);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;

  return { tex, draw };
}

export function createJumbotron({ width=4.0, height=2.2 } = {}){
  const group = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width+0.25, height+0.25, 0.18),
    new THREE.MeshStandardMaterial({ color:0x101820, roughness:0.6, metalness:0.1 })
  );
  frame.castShadow = true;
  group.add(frame);

  const { tex, draw } = makeCanvasTexture();
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map:tex, emissive:0x223344, emissiveIntensity:1.2, side:THREE.DoubleSide })
  );
  screen.position.z = 0.10;
  group.add(screen);

  // Simple "synth music" with WebAudio (always available, no external mp3)
  let ctx=null, master=null, osc1=null, osc2=null, lfo=null, gainLfo=null;
  let muted = true;

  async function ensureAudio(){
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    osc1 = ctx.createOscillator(); osc1.type='sine'; osc1.frequency.value = 220;
    osc2 = ctx.createOscillator(); osc2.type='triangle'; osc2.frequency.value = 330;

    const g1 = ctx.createGain(); g1.gain.value = 0.08;
    const g2 = ctx.createGain(); g2.gain.value = 0.05;

    // LFO for gentle pulsing
    lfo = ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value = 0.18;
    gainLfo = ctx.createGain(); gainLfo.gain.value = 0.04;
    lfo.connect(gainLfo);

    gainLfo.connect(g1.gain);
    gainLfo.connect(g2.gain);

    osc1.connect(g1); osc2.connect(g2);
    g1.connect(master); g2.connect(master);

    osc1.start(); osc2.start(); lfo.start();
  }

  async function tryPlay(){
    // start muted audio context so it is ready; unmute needs gesture
    try{
      await ensureAudio();
      if (ctx.state === 'suspended') await ctx.resume();
    }catch{}
  }

  async function unmute(){
    await ensureAudio();
    if (ctx.state === 'suspended') await ctx.resume();
    master.gain.value = 0.35;
    muted = false;
  }

  function update(t){
    draw(t);
    tex.needsUpdate = true;
    // subtle tone changes
    if (ctx && !muted){
      osc1.frequency.value = 190 + (Math.sin(t*0.0006)*0.5+0.5)*80;
      osc2.frequency.value = 260 + (Math.cos(t*0.0007)*0.5+0.5)*120;
    }
  }

  return { group, screen, update, tryPlay, unmute };
}
