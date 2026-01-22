import { clamp } from './utils.js';

export class TouchSticks {
  constructor({rootEl, moveEl, lookEl}){
    this.rootEl = rootEl;
    this.moveEl = moveEl;
    this.lookEl = lookEl;
    this.enabled = false;

    this.move = {x:0,y:0};
    this.look = {x:0,y:0};

    this._bindStick(moveEl, (v)=>{ this.move = v; });
    this._bindStick(lookEl, (v)=>{ this.look = v; });
  }

  setEnabled(v){
    this.enabled = v;
    this.rootEl.style.display = v ? 'block' : 'none';
  }

  _bindStick(el, onChange){
    const knob = el.querySelector('.knob');
    let active = false;
    let start = null;

    const setKnob = (dx, dy)=>{
      knob.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
    };

    const reset = ()=>{
      setKnob(0,0);
      onChange({x:0,y:0});
    };

    const pointerDown = (e)=>{
      active = true;
      const r = el.getBoundingClientRect();
      start = {cx: r.left + r.width/2, cy: r.top + r.height/2, rad: r.width*0.38};
      el.setPointerCapture(e.pointerId);
    };

    const pointerMove = (e)=>{
      if (!active || !start) return;
      const dx = clamp(e.clientX - start.cx, -start.rad, start.rad);
      const dy = clamp(e.clientY - start.cy, -start.rad, start.rad);
      setKnob(dx, dy);
      onChange({x: dx / start.rad, y: dy / start.rad});
    };

    const pointerUp = ()=>{
      active = false; start = null;
      reset();
    };

    el.addEventListener('pointerdown', pointerDown);
    el.addEventListener('pointermove', pointerMove);
    el.addEventListener('pointerup', pointerUp);
    el.addEventListener('pointercancel', pointerUp);
  }
}
