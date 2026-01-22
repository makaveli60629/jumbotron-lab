import { log } from './diagnostics.js';
export async function initWorld(){
  log('World init');
  const canvas=document.createElement('canvas');
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}
  resize(); addEventListener('resize',resize);
  ctx.fillStyle='#0a0'; ctx.fillRect(0,0,100,100);
  log('World ready');
}
