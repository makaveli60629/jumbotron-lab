export function mountDiagnostics(){
 const d=document.createElement('div');
 d.style.position='fixed';
 d.style.bottom='10px';
 d.style.left='10px';
 d.textContent='Diagnostics OK';
 document.body.appendChild(d);
}