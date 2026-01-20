(function(){
  const joyWrap = document.getElementById('joyWrap');
  const knob = document.getElementById('joyKnob');
  const state = window.__JOY_STATE__ = { x:0, y:0, active:false };
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouch && joyWrap) joyWrap.style.display = 'block';

  const rect = () => joyWrap.getBoundingClientRect();
  let pid=null, cx=0, cy=0;

  const setKnob = (dx, dy) => {
    const max = 44;
    const mag = Math.hypot(dx,dy);
    if (mag > max) { dx = dx/mag*max; dy = dy/mag*max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    state.x = dx / max;
    state.y = -dy / max;
  };
  const reset = () => {
    pid=null; state.active=false; state.x=0; state.y=0;
    knob.style.transform = 'translate(0px,0px)';
  };

  if (joyWrap) {
    joyWrap.addEventListener('pointerdown', (e)=>{
      joyWrap.setPointerCapture(e.pointerId);
      pid=e.pointerId;
      const r=rect(); cx=r.left+r.width/2; cy=r.top+r.height/2;
      state.active=true;
      setKnob(e.clientX-cx, e.clientY-cy);
    });
    joyWrap.addEventListener('pointermove', (e)=>{ if(e.pointerId!==pid) return; setKnob(e.clientX-cx, e.clientY-cy); });
    joyWrap.addEventListener('pointerup', (e)=>{ if(e.pointerId!==pid) return; reset(); });
    joyWrap.addEventListener('pointercancel', reset);
  }
})();

AFRAME.registerComponent('android-joystick-move', {
  schema: { speed:{type:'number',default:1.15}, runSpeed:{type:'number',default:2.15} },
  init: function(){
    this.keys=new Set();
    window.addEventListener('keydown', e=>this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', e=>this.keys.delete(e.key.toLowerCase()));
    this.fwd=new THREE.Vector3(); this.right=new THREE.Vector3(); this.move=new THREE.Vector3();
  },
  tick: function(t, dt){
    const rig=this.el.object3D;
    const camEl=document.getElementById('camera'); if(!camEl) return;
    const joy=window.__JOY_STATE__||{x:0,y:0};
    let x=joy.x, y=joy.y;

    if(this.keys.has('w')||this.keys.has('arrowup')) y+=1;
    if(this.keys.has('s')||this.keys.has('arrowdown')) y-=1;
    if(this.keys.has('a')||this.keys.has('arrowleft')) x-=1;
    if(this.keys.has('d')||this.keys.has('arrowright')) x+=1;

    let run=this.keys.has('shift');

    const scene=this.el.sceneEl;
    const xrSession = scene.renderer?.xr?.getSession?.();
    if (xrSession) {
      for (const src of xrSession.inputSources) {
        const gp = src.gamepad;
        if (!gp || !gp.axes) continue;
        const axX=gp.axes[0]??0, axY=gp.axes[1]??0, dz=0.15;
        if(Math.abs(axX)>dz) x=axX;
        if(Math.abs(axY)>dz) y=-axY;
        run = run || !!gp.buttons?.[3]?.pressed;
        window.__BTN_GRAB__ = !!gp.buttons?.[0]?.pressed;
        window.__BTN_WAVE__ = !!gp.buttons?.[1]?.pressed;
        break;
      }
    } else { window.__BTN_GRAB__=false; window.__BTN_WAVE__=false; }

    const m=Math.hypot(x,y); if(m>1){x/=m;y/=m;}
    const yaw=camEl.object3D.rotation.y;
    this.fwd.set(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
    this.right.set(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
    this.move.set(0,0,0).addScaledVector(this.right,x).addScaledVector(this.fwd,y);

    const sp = run ? this.data.runSpeed : this.data.speed;
    const step = (dt/1000) * sp;
    rig.position.addScaledVector(this.move, step);
  }
});