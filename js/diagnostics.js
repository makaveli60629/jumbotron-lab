const logEl=document.getElementById('log');
export function log(msg){
  const d=document.createElement('div');
  d.textContent=new Date().toLocaleTimeString()+' | '+msg;
  logEl.appendChild(d);
}
export function initDiagnostics(){
  log('Diagnostics init');
}
