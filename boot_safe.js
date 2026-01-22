import { mountDiagnostics } from './diagnostics.js';
import { initWorld } from './world.js';

mountDiagnostics({early:true});

let resolved=false;
setTimeout(async()=>{
 if(!resolved){
  console.warn("BOOT TIMEOUT");
  const f=await import('./fallback_world.js');
  f.initFallback();
 }
},4000);

try{
 await initWorld();
 resolved=true;
 document.getElementById('status').textContent='World Loaded';
}catch(e){
 console.error(e);
}