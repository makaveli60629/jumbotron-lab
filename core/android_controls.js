// AndroidControls: left joystick move + right drag look.
// Also supports Desktop: WASD + mouse drag look.
// This is designed to be self-contained and safe for Quest browsers.

export class AndroidControls {
  constructor({ player, camera, dom, log }){
    this._isHudTarget = (ev) => {
      const t = ev.target;
      return !!(t && t.closest && t.closest("#hud"));
    };
    this.player = player;
    this.camera = camera;
    this.dom = dom;
    this.log = log || (()=>{});

    this.move = { x:0, y:0 };
    this.look = { dx:0, dy:0 };
    this.speed = 2.2;          // meters/sec walk
    this.turnSpeed = 1.6;      // radians/sec when using drag
    this.pitch = 0;            // camera pitch
    this.keys = Object.create(null);

    // Touch visuals
    this.joyBase = document.getElementById("joyBase");
    this.joyKnob = document.getElementById("joyKnob");
    this.lookHint = document.getElementById("lookHint");

    // Touch state
    this.leftTouchId = null;
    this.rightTouchId = null;
    this.leftOrigin = null;
    this.rightLast = null;

    this._bind();
    this._showTouchUIIfMobile();
  }

  _showTouchUIIfMobile(){
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile){
      this.joyBase.style.display = "block";
      this.lookHint.style.display = "block";
      this.joyKnob.style.left = "50%";
      this.joyKnob.style.top = "50%";
    }
  }

  _bind(){
    // Keyboard
    window.addEventListener("keydown", (e)=> this.keys[e.code] = true);
    window.addEventListener("keyup", (e)=> this.keys[e.code] = false);

    // Mouse (drag look)
    let dragging = false;
    let last = null;
    this.dom.addEventListener("mousedown",(e)=>{ dragging=true; last={x:e.clientX,y:e.clientY}; });
    window.addEventListener("mouseup",()=>{ dragging=false; last=null; });
    window.addEventListener("mousemove",(e)=>{
      if (!dragging || !last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = {x:e.clientX,y:e.clientY};
      this.look.dx += dx * 0.0022;
      this.look.dy += dy * 0.0022;
    });

    // Touch
    window.addEventListener("touchstart",(e)=>this._onTouchStart(e), {passive:false});
    window.addEventListener("touchmove",(e)=>this._onTouchMove(e), {passive:false});
    window.addEventListener("touchend",(e)=>this._onTouchEnd(e), {passive:false});
    window.addEventListener("touchcancel",(e)=>this._onTouchEnd(e), {passive:false});
  }

  _onTouchStart(e){
    // prevent page scroll/zoom
    if (!this._isHudTarget(e)) e.preventDefault();

    for (const t of e.changedTouches){
      const isLeft = t.clientX < window.innerWidth * 0.5;

      if (isLeft && this.leftTouchId === null){
        this.leftTouchId = t.identifier;
        this.leftOrigin = { x: t.clientX, y: t.clientY };
        // move joystick base to touch start
        this.joyBase.style.left = Math.max(18, Math.min(window.innerWidth-160, t.clientX-70)) + "px";
        this.joyBase.style.bottom = Math.max(18, Math.min(window.innerHeight-160, (window.innerHeight - t.clientY)-70)) + "px";
        this._setKnob(0,0);
      }else if (!isLeft && this.rightTouchId === null){
        this.rightTouchId = t.identifier;
        this.rightLast = { x: t.clientX, y: t.clientY };
      }
    }
  }

  _onTouchMove(e){
    if (!this._isHudTarget(e)) e.preventDefault();
    for (const t of e.changedTouches){
      if (t.identifier === this.leftTouchId && this.leftOrigin){
        const dx = t.clientX - this.leftOrigin.x;
        const dy = t.clientY - this.leftOrigin.y;
        const r = 50; // max radius
        const nx = Math.max(-r, Math.min(r, dx));
        const ny = Math.max(-r, Math.min(r, dy));
        this._setKnob(nx, ny);
        // move vector: x=strafe, y=forward (invert Y)
        this.move.x = (nx / r);
        this.move.y = (-ny / r);
      }
      if (t.identifier === this.rightTouchId && this.rightLast){
        const dx = t.clientX - this.rightLast.x;
        const dy = t.clientY - this.rightLast.y;
        this.rightLast = { x: t.clientX, y: t.clientY };
        this.look.dx += dx * 0.0030;
        this.look.dy += dy * 0.0030;
      }
    }
  }

  _onTouchEnd(e){
    if (!this._isHudTarget(e)) e.preventDefault();
    for (const t of e.changedTouches){
      if (t.identifier === this.leftTouchId){
        this.leftTouchId = null;
        this.leftOrigin = null;
        this.move.x = 0; this.move.y = 0;
        this._setKnob(0,0);
      }
      if (t.identifier === this.rightTouchId){
        this.rightTouchId = null;
        this.rightLast = null;
      }
    }
  }

  _setKnob(x,y){
    // x,y in px relative to center
    this.joyKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  update(dt){
    // Keyboard input blended with joystick
    let mx = this.move.x;
    let my = this.move.y;

    if (this.keys["KeyW"]) my += 1;
    if (this.keys["KeyS"]) my -= 1;
    if (this.keys["KeyA"]) mx -= 1;
    if (this.keys["KeyD"]) mx += 1;

    // normalize (avoid faster diagonal)
    const len = Math.hypot(mx, my);
    if (len > 1){ mx /= len; my /= len; }

    // Apply yaw + pitch from look deltas
    const yawDelta = this.look.dx * this.turnSpeed;
    this.player.rotation.y -= yawDelta;

    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - this.look.dy * 1.2));
    this.camera.rotation.x = this.pitch;

    // decay look deltas
    this.look.dx *= 0.65;
    this.look.dy *= 0.65;

    // Move in player-local space (XZ plane)
    const speed = this.speed;
    const forward = my * speed * dt;
    const strafe  = mx * speed * dt;

    // player forward vector (based on yaw)
    const yaw = this.player.rotation.y;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    // forward is -Z in three, but we move player in world coords
    this.player.position.x += (strafe * cos) + (forward * sin);
    this.player.position.z += (strafe * -sin) + (forward * cos);
  }
}
