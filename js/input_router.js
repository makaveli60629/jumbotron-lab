import * as THREE from "three";

export class InputRouter {
  constructor({ renderer, camera }) {
    this.renderer = renderer;
    this.camera = camera;

    // output
    this.move = new THREE.Vector2(0, 0);   // x=strafe, y=forward (-1..1)
    this.run = false;
    this.wave = false;
    this.grab = false;
    this.release = false;
    this.sit = false;
    this.stand = false;

    // keyboard fallback (desktop testing)
    this._keys = new Set();
    window.addEventListener("keydown", (e) => this._keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", (e) => this._keys.delete(e.key.toLowerCase()));

    // touch joystick stub (optional): you can wire your UI joystick to these
    this.touchMove = new THREE.Vector2(0,0);
  }

  update() {
    // reset one-frame buttons
    this.wave = false;
    this.grab = false;
    this.release = false;
    this.sit = false;
    this.stand = false;

    // 1) Keyboard fallback
    let x = 0, y = 0;
    if (this._keys.has("w") || this._keys.has("arrowup")) y += 1;
    if (this._keys.has("s") || this._keys.has("arrowdown")) y -= 1;
    if (this._keys.has("a") || this._keys.has("arrowleft")) x -= 1;
    if (this._keys.has("d") || this._keys.has("arrowright")) x += 1;
    let run = this._keys.has("shift");
    if (this._keys.has("e")) this.grab = true;
    if (this._keys.has("q")) this.wave = true;
    if (this._keys.has("c")) this.sit = true;
    if (this._keys.has("v")) this.stand = true;

    // 1b) Touch move (if you wire it)
    if (this.touchMove.lengthSq() > 0.0001) {
      x = this.touchMove.x;
      y = this.touchMove.y;
    }

    // 2) WebXR gamepad input
    const session = this.renderer?.xr?.getSession?.();
    if (session) {
      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp || !gp.axes || gp.axes.length < 2) continue;

        // Prefer axes[2/3] if present (some mappings), else axes[0/1]
        const axX = (gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0]) ?? 0;
        const axY = (gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1]) ?? 0;

        const dz = 0.15;
        const fx = Math.abs(axX) > dz ? axX : 0;
        const fy = Math.abs(axY) > dz ? axY : 0;

        x = fx;
        y = -fy;

        // Buttons (mapping varies; these are sensible defaults)
        // 0: A/X, 1: B/Y, 2: thumbrest, 3: stick click (often)
        if (gp.buttons?.[0]?.pressed) this.grab = true;
        if (!gp.buttons?.[0]?.pressed) this.release = true;
        if (gp.buttons?.[1]?.pressed) this.wave = true;

        // Sit/Stand: use stick click as sit, and B/Y as stand when held with grip (optional)
        if (gp.buttons?.[3]?.pressed) this.sit = true;

        run = !!gp.buttons?.[3]?.pressed || run;
        break;
      }
    }

    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this.move.set(x, y);
    this.run = run;
  }
}
