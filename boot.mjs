// boot.mjs
// Purpose: bulletproof boot + logging + safe module init (prevents "stuck on INITIALIZING")
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

const hud = document.getElementById('hud');
const hudlog = document.getElementById('hudlog');
const statusEl = document.getElementById('status');
const toastEl = document.getElementById('toast');
const xrBanner = document.getElementById('xrBanner');

const LOG = [];
function toast(msg){
  toastEl.textContent = msg;
  toastEl.style.display='block';
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=>toastEl.style.display='none', 1800);
}
function log(msg){
  const line = String(msg);
  LOG.push(line);
  if(LOG.length>600) LOG.shift();
  hudlog.textContent = LOG.join("\n");
  hudlog.scrollTop = hudlog.scrollHeight;
}
function setStatus(s){ statusEl.textContent = s; }

// Capture errors so we never silently freeze
window.addEventListener('error', (e)=>{
  log('[ERROR] ' + (e?.message || e));
});
window.addEventListener('unhandledrejection', (e)=>{
  log('[PROMISE] ' + (e?.reason?.message || e?.reason || e));
});

// Button binder that works on mobile (click + touchend)
function bindBtn(id, fn){
  const el = document.getElementById(id);
  if(!el) return;
  const handler = (ev)=>{ ev.preventDefault(); ev.stopPropagation(); try{ fn(); }catch(err){ log('[BTN] ' + err.message); } };
  el.addEventListener('click', handler, {passive:false});
  el.addEventListener('touchend', handler, {passive:false});
}

// Copy log robust (clipboard API + execCommand fallback + prompt fallback)
async function copyLog(){
  const text = LOG.join('\n');
  try{
    await navigator.clipboard.writeText(text);
    toast('Log copied.');
    return;
  }catch(_){}
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position='fixed'; ta.style.left='-9999px'; ta.style.top='0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if(ok){ toast('Log copied.'); return; }
  }catch(_){}
  // last resort: prompt
  window.prompt('Copy log:', text.slice(0, 4000));
  toast('Opened copy prompt.');
}

function downloadLog(){
  const blob = new Blob([LOG.join('\n')], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'scarlett_avatar_lab_log.txt';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
  toast('Downloading log…');
}

bindBtn('btnHide', ()=>{ hud.style.display='none'; });
bindBtn('btnShow', ()=>{ hud.style.display='block'; });
bindBtn('btnCopyLog', ()=>{ copyLog(); });
bindBtn('btnDownloadLog', ()=>{ downloadLog(); });
bindBtn('btnReload', ()=>{ location.reload(); });
bindBtn('btnCompact', ()=>{
  const body = document.getElementById('hudBody');
  if(!body) return;
  const compact = body.dataset.compact === '1';
  body.dataset.compact = compact ? '0' : '1';
  body.style.maxHeight = compact ? '72vh' : '46vh';
  toast('Compact: ' + (!compact));
});
bindBtn('btnHudSize', ()=>{
  const root = document.documentElement;
  const cur = parseFloat(getComputedStyle(root).getPropertyValue('--hudScale')) || 1;
  const next = cur > 0.9 ? 0.85 : (cur > 0.8 ? 0.7 : 1);
  root.style.setProperty('--hudScale', String(next));
  log('[HUD] Scale: ' + next);
});

// Quick load buttons
document.querySelectorAll('button[data-path]').forEach(btn=>{
  const path = btn.getAttribute('data-path');
  btn.addEventListener('click', (e)=>{
    e.preventDefault();
    document.getElementById('avatarUrl').value = path;
    document.getElementById('btnLoadAvatar').click();
  }, {passive:false});
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.05, 2000);
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;

document.getElementById('app').appendChild(renderer.domElement);
try{
  document.body.appendChild(VRButton.createButton(renderer));
  log('[XR] VRButton injected.');
}catch(e){
  log('[XR] VRButton unavailable on this browser (ok).');
}

const player = new THREE.Group();
player.add(camera);
scene.add(player);
player.position.set(0, 1.65, 6);

// resize
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let worldApi = null;

async function main(){
  setStatus('INITIALIZING…');
  log('[BOOT] Starting…');

  // XR availability banner
  const xrOk = !!(navigator.xr);
  xrBanner.style.display = xrOk ? 'none' : 'block';
  log('[XR] navigator.xr = ' + (xrOk ? 'present' : 'missing'));

  try{
    const mod = await import('./js/world.js?v=' + Date.now());
    if(!mod || !mod.World){ throw new Error('world.js missing export World'); }
    worldApi = await mod.World.init({ THREE, scene, renderer, camera, player, log });
    log('[BOOT] World init OK.');
    setStatus('OK');
  }catch(e){
    log('[BOOT] World init FAILED: ' + (e?.message||e));
    setStatus('ERROR');
  }

  // auto-hide HUD on XR session start
  renderer.xr.addEventListener('sessionstart', ()=>{
    try{ hud.style.display='none'; }catch(_){}
    log('[XR] sessionstart (HUD hidden).');
    // face table
    player.rotation.y = Math.PI;
  });

  renderer.setAnimationLoop((t)=>{
    const dt = 0.016;
    try{
      if(worldApi && worldApi.update) worldApi.update(dt, t/1000);
    }catch(e){
      log('[LOOP] update error: ' + (e?.message||e));
    }
    renderer.render(scene, camera);
  });
}

main();
