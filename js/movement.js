import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';

export class MovementRig {
  constructor(camera){
    this.camera = camera;

    // rig: group -> yaw -> pitch -> camera
    this.group = new THREE.Group();
    this.yaw = new THREE.Group();
    this.pitch = new THREE.Group();

    this.group.add(this.yaw);
    this.yaw.add(this.pitch);
    this.pitch.add(camera);

    // locomotion
    this.vel = new THREE.Vector3();
    this.tmp = new THREE.Vector3();

    // settings
    this.speed = 1.8;       // meters/sec
    this.turnSpeed = 1.8;   // rad/sec for smooth turn
    this.floorY = 0;

    // state
    this.keys = new Set();
    this.touchMove = {x:0,y:0};
    this.touchLook = {x:0,y:0};

    this.xrGamepads = [];
    this.inXR = false;

    // mouse look
    this.mouseDown = false;
    this.lastMouse = null;

    // bind input
    window.addEventListener('keydown', (e)=>this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e)=>this.keys.delete(e.key.toLowerCase()));

    window.addEventListener('pointerdown', (e)=>{ if (e.button===0){ this.mouseDown = true; this.lastMouse = {x:e.clientX,y:e.clientY}; }});
    window.addEventListener('pointerup', ()=>{ this.mouseDown=false; this.lastMouse=null; });
    window.addEventListener('pointermove', (e)=>{
      if (!this.mouseDown || !this.lastMouse) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse = {x:e.clientX,y:e.clientY};
      this.addLook(dx*0.003, dy*0.003);
    });
  }

  addLook(yawDelta, pitchDelta){
    this.yaw.rotation.y -= yawDelta;
    this.pitch.rotation.x -= pitchDelta;
    const lim = Math.PI/2 - 0.05;
    this.pitch.rotation.x = Math.max(-lim, Math.min(lim, this.pitch.rotation.x));
  }

  setTouch(move, look){
    this.touchMove = move || {x:0,y:0};
    this.touchLook = look || {x:0,y:0};
  }

  setXR(inXR, gamepads){
    this.inXR = !!inXR;
    this.xrGamepads = gamepads || [];
  }

  step(dt){
    // look from touch
    if (Math.abs(this.touchLook.x) + Math.abs(this.touchLook.y) > 0.02){
      this.addLook(this.touchLook.x * 1.2 * dt, this.touchLook.y * 1.2 * dt);
    }

    // choose input vector
    let mx = 0, my = 0;

    // keyboard WASD
    if (this.keys.has('w')) my += 1;
    if (this.keys.has('s')) my -= 1;
    if (this.keys.has('a')) mx -= 1;
    if (this.keys.has('d')) mx += 1;

    // touch move joystick (overrides if stronger)
    if (Math.abs(this.touchMove.x)+Math.abs(this.touchMove.y) > 0.05){
      mx = this.touchMove.x;
      my = -this.touchMove.y;
    }

    // XR controllers thumbstick
    // left stick -> move, right stick -> turn (best-effort)
    let turn = 0;
    for (const gp of this.xrGamepads){
      if (!gp || !gp.axes) continue;
      // many controllers: axes[2],axes[3] is left stick; others use [0],[1]
      const ax0 = gp.axes[0] ?? 0;
      const ax1 = gp.axes[1] ?? 0;
      const ax2 = gp.axes[2] ?? 0;
      const ax3 = gp.axes[3] ?? 0;

      // pick bigger magnitude pair for movement
      const mag01 = Math.abs(ax0)+Math.abs(ax1);
      const mag23 = Math.abs(ax2)+Math.abs(ax3);
      let mvx=0,mvy=0;
      if (mag23 > mag01){ mvx = ax2; mvy = -ax3; }
      else { mvx = ax0; mvy = -ax1; }

      // apply if significant
      if (Math.abs(mvx)+Math.abs(mvy) > 0.12){
        mx = mvx; my = mvy;
      }

      // right stick turn heuristic: use the remaining pair
      const tx = (mag23 > mag01) ? ax0 : ax2;
      if (Math.abs(tx) > 0.15) turn = tx;
    }

    if (turn) this.yaw.rotation.y -= turn * this.turnSpeed * dt;

    // move in yaw-forward space
    const len = Math.hypot(mx, my);
    if (len > 1e-4){
      mx /= Math.max(1, len);
      my /= Math.max(1, len);
    }

    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(this.yaw.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(this.yaw.quaternion);

    this.tmp.copy(right).multiplyScalar(mx);
    this.vel.copy(forward).multiplyScalar(my).add(this.tmp);

    const sp = this.speed;
    this.group.position.addScaledVector(this.vel, sp * dt);

    // keep on floor (simple)
    this.group.position.y = this.floorY;
  }
}
