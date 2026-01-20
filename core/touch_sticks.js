export class TouchSticks{
  constructor({left,right}){
    this.left = this._stick(left);
    this.right = this._stick(right);
  }
  _stick(root){
    const knob = root.querySelector('.stickKnob');
    const state = {x:0,y:0, active:false, id:null};
    const rectOf = ()=>root.getBoundingClientRect();
    const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

    const onStart = (e)=>{
      for (const t of e.changedTouches){
        if (!state.active){
          state.active = true;
          state.id = t.identifier;
          this._move(t.clientX, t.clientY);
          break;
        }
      }
    };
    const onMove = (e)=>{
      for (const t of e.changedTouches){
        if (t.identifier === state.id){
          this._move(t.clientX, t.clientY);
        }
      }
    };
    const onEnd = (e)=>{
      for (const t of e.changedTouches){
        if (t.identifier === state.id){
          state.active = false; state.id = null;
          state.x = 0; state.y = 0;
          knob.style.transform = `translate(0px,0px)`;
        }
      }
    };

    this._move = (cx, cy)=>{
      const r = rectOf();
      const dx = cx - (r.left + r.width/2);
      const dy = cy - (r.top + r.height/2);
      const max = r.width*0.28;
      const x = clamp(dx, -max, max);
      const y = clamp(dy, -max, max);
      state.x = x/max;
      state.y = y/max;
      knob.style.transform = `translate(${x}px,${y}px)`;
    };

    root.addEventListener('touchstart', onStart, {passive:false});
    root.addEventListener('touchmove', onMove, {passive:false});
    root.addEventListener('touchend', onEnd, {passive:false});
    root.addEventListener('touchcancel', onEnd, {passive:false});

    return { state };
  }
  getMove(){ return { x:this.left.state.x, y:this.left.state.y }; }
  getLook(){ return { x:this.right.state.x, y:this.right.state.y }; }
}
