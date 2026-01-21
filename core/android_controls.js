// core/android_controls.js
// Robust Android + Desktop controls with on-screen joystick + drag look.

export default {
  init({ THREE, camera, player, domElement, log }) {
    const state = {
      enabled: true,
      move: { x:0, y:0 },
      yaw: 0,
      pitch: 0,
      speed: 3.0,
      lookSpeed: 0.006,
      isPointerDown: false,
      lastX: 0,
      lastY: 0,
      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      ui: { joyActive:false, joyWrap:null }
    };

    const keys = {};
    window.addEventListener("keydown", (e)=> keys[e.key.toLowerCase()] = true, { passive:true });
    window.addEventListener("keyup", (e)=> keys[e.key.toLowerCase()] = false, { passive:true });

    function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

    function onDown(x,y){ state.isPointerDown = true; state.lastX = x; state.lastY = y; }
    function onMove(x,y){
      if(!state.isPointerDown) return;
      const dx = x - state.lastX;
      const dy = y - state.lastY;
      state.lastX = x; state.lastY = y;
      if(state.ui.joyActive) return; // don't look when dragging joystick
      state.yaw   -= dx * state.lookSpeed;
      state.pitch -= dy * state.lookSpeed;
      state.pitch = clamp(state.pitch, -1.2, 1.2);
    }
    function onUp(){ state.isPointerDown = false; }

    domElement.addEventListener("pointerdown", (e)=> onDown(e.clientX, e.clientY));
    domElement.addEventListener("pointermove", (e)=> onMove(e.clientX, e.clientY));
    domElement.addEventListener("pointerup", onUp);
    domElement.addEventListener("pointercancel", onUp);
    domElement.style.touchAction = "none";

    function makeJoy(){
      const wrap = document.createElement("div");
      wrap.id = "scarlett-joy-wrap";
      wrap.style.cssText = "position:fixed;left:18px;bottom:18px;width:140px;height:140px;z-index:9998;touch-action:none;user-select:none;pointer-events:auto;";
      const base = document.createElement("div");
      base.style.cssText = "position:absolute;inset:0;border-radius:999px;background:rgba(0,255,255,0.12);border:1px solid rgba(0,255,255,0.65);backdrop-filter:blur(4px);";
      const knob = document.createElement("div");
      knob.style.cssText = "position:absolute;left:50%;top:50%;width:64px;height:64px;transform:translate(-50%,-50%);border-radius:999px;background:rgba(0,255,255,0.35);border:1px solid rgba(0,255,255,0.9);";
      wrap.appendChild(base); wrap.appendChild(knob);
      document.body.appendChild(wrap);

      const center = { x:0, y:0 };
      const maxR = 52;

      function setKnob(nx, ny){
        knob.style.left = (70 + nx) + "px";
        knob.style.top  = (70 + ny) + "px";
      }
      setKnob(0,0);

      function joyDown(e){
        state.ui.joyActive = true;
        const r = wrap.getBoundingClientRect();
        center.x = r.left + r.width/2;
        center.y = r.top + r.height/2;
        wrap.setPointerCapture(e.pointerId);
        joyMove(e);
        e.preventDefault();
      }
      function joyMove(e){
        if(!state.ui.joyActive) return;
        const dx = e.clientX - center.x;
        const dy = e.clientY - center.y;
        const len = Math.hypot(dx,dy);
        const s = len > maxR ? (maxR/len) : 1;
        const nx = dx*s, ny = dy*s;
        setKnob(nx, ny);
        state.move.x = clamp(nx / maxR, -1, 1);
        state.move.y = clamp(-ny / maxR, -1, 1);
        e.preventDefault();
      }
      function joyUp(e){
        state.ui.joyActive = false;
        state.move.x = 0; state.move.y = 0;
        setKnob(0,0);
        try{ wrap.releasePointerCapture(e.pointerId); }catch(_){}
        e.preventDefault();
      }

      wrap.addEventListener("pointerdown", joyDown);
      wrap.addEventListener("pointermove", joyMove);
      wrap.addEventListener("pointerup", joyUp);
      wrap.addEventListener("pointercancel", joyUp);

      state.ui.joyWrap = wrap;
    }

    if (state.isMobile) makeJoy();

    log?.("Controls: joystick + drag look ready.");

    return {
      update(dt){
        if(!state.enabled) return;

        // Desktop WASD
        let mx = 0, my = 0;
        if(keys["a"]) mx -= 1;
        if(keys["d"]) mx += 1;
        if(keys["w"]) my += 1;
        if(keys["s"]) my -= 1;

        // Mobile joystick
        mx += state.move.x;
        my += state.move.y;

        player.rotation.y = state.yaw;
        camera.rotation.x = state.pitch;

        const speed = state.speed * dt;
        if (mx || my){
          const forward = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
          const right   = new THREE.Vector3(1,0,0).applyQuaternion(player.quaternion);
          forward.y = 0; right.y = 0;
          forward.normalize(); right.normalize();
          player.position.addScaledVector(forward, my * speed);
          player.position.addScaledVector(right,  mx * speed);
        }
      }
    };
  }
};
