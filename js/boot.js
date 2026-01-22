import { initDiagnostics, log } from './diagnostics.js';
import { initWorld } from './world.js';

const bootLabel = document.getElementById('boot');

function withTimeout(p, label, ms=4000){
  return Promise.race([
    p,
    new Promise((_,r)=>setTimeout(()=>r(new Error('BOOT TIMEOUT: '+label)),ms))
  ]);
}

(async ()=>{
  try{
    initDiagnostics();
    log('Diagnostics online');
    await withTimeout(initWorld(), 'world');
    bootLabel.textContent='Ready';
    log('Boot complete');
  }catch(e){
    bootLabel.textContent='BOOT FAILED';
    log(e.message);
  }
})();

window.enterLobby=()=>log('Lobby');
window.enterGallery=()=>log('Gallery');
window.toggleDiag=()=>document.getElementById('log').classList.toggle('hide');
