
import * as THREE from "three";

export class InputRouter {
  constructor({ renderer, camera }) {
    this.renderer = renderer;
    this.camera = camera;
    this.move = new THREE.Vector2(0, 0);
    this.run = false;
    this.wave = false;
    this.grab = false;
    this.release = false;
    this._keys = new Set();
    window.addEventListener("keydown", e => this._keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", e => this._keys.delete(e.key.toLowerCase()));
  }
  update() {
    this.wave = this.grab = this.release = false;
    let x = 0, y = 0;
    if (this._keys.has("w")) y += 1;
    if (this._keys.has("s")) y -= 1;
    if (this._keys.has("a")) x -= 1;
    if (this._keys.has("d")) x += 1;
    let run = this._keys.has("shift");
    const session = this.renderer?.xr?.getSession?.();
    if (session) {
      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp) continue;
        const axX = gp.axes[0] ?? 0;
        const axY = gp.axes[1] ?? 0;
        const dz = 0.15;
        x = Math.abs(axX) > dz ? axX : x;
        y = Math.abs(axY) > dz ? -axY : y;
        if (gp.buttons?.[0]?.pressed) this.grab = true;
        if (!gp.buttons?.[0]?.pressed) this.release = true;
        if (gp.buttons?.[1]?.pressed) this.wave = true;
        run = run || !!gp.buttons?.[3]?.pressed;
        break;
      }
    }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    this.move.set(x, y);
    this.run = run;
  }
}
