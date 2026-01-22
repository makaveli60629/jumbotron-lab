export function initFallback(){
 const f=document.createElement('div');
 f.textContent='Fallback World Loaded';
 f.style.position='fixed';
 f.style.top='50%';
 f.style.left='50%';
 f.style.transform='translate(-50%,-50%)';
 document.body.appendChild(f);
}