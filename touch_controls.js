export function setupTouchControls(){
  const state={moveX:0,moveY:0,lookX:0,lookY:0};
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function bind(stick,nub,setFn){
    let active=false; let ox=0,oy=0; const max=46;
    const down=(e)=>{active=true;const t=e.touches[0];ox=t.clientX;oy=t.clientY;nub.style.transform='translate(0px,0px)';e.preventDefault();};
    const move=(e)=>{if(!active)return;const t=e.touches[0];const dx=t.clientX-ox;const dy=t.clientY-oy;
      const cx=clamp(dx,-max,max);const cy=clamp(dy,-max,max);
      nub.style.transform=`translate(${cx}px,${cy}px)`;setFn(cx/max,cy/max);e.preventDefault();};
    const up=(e)=>{active=false;nub.style.transform='translate(0px,0px)';setFn(0,0);e.preventDefault();};
    stick.addEventListener('touchstart',down,{passive:false});
    stick.addEventListener('touchmove',move,{passive:false});
    stick.addEventListener('touchend',up,{passive:false});
    stick.addEventListener('touchcancel',up,{passive:false});
  }
  bind(document.getElementById('stickL'),document.getElementById('nubL'),(x,y)=>{state.moveX=x;state.moveY=y;});
  bind(document.getElementById('stickR'),document.getElementById('nubR'),(x,y)=>{state.lookX=x;state.lookY=y;});
  return state;
}
