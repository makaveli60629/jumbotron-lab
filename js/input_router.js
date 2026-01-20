import * as THREE from "three";

/**
 * InputRouter v3
 * - WebXR: thumbstick + buttons
 * - Desktop: WASD + Shift + keys
 * - Android (touch): on-screen virtual joystick (left side) + tap buttons (right side)
 *
 * Outputs:
 *  move: Vector2 (x=strafe, y=forward) in -1..1
 *  run: boolean
 *  wave/grab/release/sit/stand: one-frame booleans
 */
export class InputRouter {
  constructor({ renderer, camera }) {
    this.renderer = renderer;
    this.camera = camera;

    this.move = new THREE.Vector2(0, 0);
    this.run = false;

    this.wave = false;
    this.grab = false;
    this.release = false;
    this.sit = false;
    this.stand = false;

    this._keys = new Set();
    window.addEventListener("keydown", (e) => this._keys.add((e.key || "").toLowerCase()));
    window.addEventListener("keyup", (e) => this._keys.delete((e.key || "").toLowerCase()));

    // --- Touch joystick state ---
    this._touchActive = false;
    this._touchId = null;
    this._touchStart = { x: 0, y: 0 };
    this._touchNow = { x: 0, y: 0 };
    this._touchMove = new THREE.Vector2(0, 0);

    // Mobile UI
    this._buildMobileUI();
  }

  _isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  }

  _buildMobileUI() {
    // Always create; hide if not mobile to keep code simple.
    const style = document.createElement("style");
    style.textContent = `
      .hudTouch {
        position: fixed; inset: 0; pointer-events: none; z-index: 50;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      .joyBase {
        position: absolute; left: 18px; bottom: 18px;
        width: 132px; height: 132px; border-radius: 999px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10);
        pointer-events: auto; touch-action: none;
        backdrop-filter: blur(6px);
      }
      .joyKnob {
        position: absolute; left: 50%; top: 50%;
        width: 58px; height: 58px; border-radius: 999px;
        transform: translate(-50%,-50%);
        background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.18);
      }
      .btnCol {
        position: absolute; right: 18px; bottom: 18px;
        display: flex; flex-direction: column; gap: 10px;
        pointer-events: auto;
      }
      .btnTouch {
        width: 132px; height: 44px; border-radius: 14px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.14);
        color: rgba(255,255,255,0.92);
        font-size: 14px;
      }
      .btnTouch:active { transform: translateY(1px); }
    `;
    document.head.appendChild(style);

    const hud = document.createElement("div");
    hud.className = "hudTouch";

    const joy = document.createElement("div");
    joy.className = "joyBase";
    const knob = document.createElement("div");
    knob.className = "joyKnob";
    joy.appendChild(knob);
    hud.appendChild(joy);

    const btnCol = document.createElement("div");
    btnCol.className = "btnCol";

    const mkBtn = (label, onPress) => {
      const b = document.createElement("button");
      b.className = "btnTouch";
      b.textContent = label;
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        onPress();
      });
      return b;
    };

    btnCol.appendChild(mkBtn("GRAB", () => { this.grab = true; }));
    btnCol.appendChild(mkBtn("RELEASE", () => { this.release = true; }));
    btnCol.appendChild(mkBtn("WAVE", () => { this.wave = true; }));
    btnCol.appendChild(mkBtn("SIT", () => { this.sit = true; }));
    btnCol.appendChild(mkBtn("STAND", () => { this.stand = true; }));
    hud.appendChild(btnCol);

    document.body.appendChild(hud);

    // Hide on non-mobile to avoid clutter
    if (!this._isMobile()) {
      joy.style.display = "none";
      btnCol.style.display = "none";
    }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const updateKnob = () => {
      // Limit to radius
      const dx = this._touchNow.x - this._touchStart.x;
      const dy = this._touchNow.y - this._touchStart.y;
      const maxR = 44;
      const dist = Math.hypot(dx, dy);
      const k = dist > maxR ? (maxR / dist) : 1;
      const ndx = dx * k;
      const ndy = dy * k;

      knob.style.transform = `translate(calc(-50% + ${ndx}px), calc(-50% + ${ndy}px))`;

      // Normalize to -1..1 (y forward is up drag)
      this._touchMove.set(clamp(ndx / maxR, -1, 1), clamp(-ndy / maxR, -1, 1));
    };

    joy.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this._touchActive = true;
      this._touchId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      this._touchStart = { x: e.clientX, y: e.clientY };
      this._touchNow = { x: e.clientX, y: e.clientY };
      this._touchMove.set(0, 0);
      updateKnob();
    });

    joy.addEventListener("pointermove", (e) => {
      if (!this._touchActive || e.pointerId !== this._touchId) return;
      this._touchNow = { x: e.clientX, y: e.clientY };
      updateKnob();
    });

    const end = (e) => {
      if (e.pointerId !== this._touchId) return;
      this._touchActive = false;
      this._touchId = null;
      knob.style.transform = "translate(-50%,-50%)";
      this._touchMove.set(0, 0);
    };

    joy.addEventListener("pointerup", end);
    joy.addEventListener("pointercancel", end);
  }

  update() {
    // Reset one-frame buttons each tick
    this.wave = false;
    this.grab = false;
    this.release = false;
    this.sit = false;
    this.stand = false;

    // Desktop fallback
    let x = 0, y = 0;
    if (this._keys.has("w") || this._keys.has("arrowup")) y += 1;
    if (this._keys.has("s") || this._keys.has("arrowdown")) y -= 1;
    if (this._keys.has("a") || this._keys.has("arrowleft")) x -= 1;
    if (this._keys.has("d") || this._keys.has("arrowright")) x += 1;

    // Extra keys
    const run = this._keys.has("shift");
    if (this._keys.has("q")) this.wave = true;
    if (this._keys.has("e")) this.grab = true;
    if (this._keys.has("r")) this.release = true;
    if (this._keys.has("c")) this.sit = true;
    if (this._keys.has("v")) this.stand = true;

    // Mobile joystick (preferred when active)
    if (this._touchMove.lengthSq() > 0.0001) {
      x = this._touchMove.x;
      y = this._touchMove.y;
    }

    // WebXR gamepad input
    const session = this.renderer?.xr?.getSession?.();
    let xrRun = false;
    if (session) {
      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp || !gp.axes || gp.axes.length < 2) continue;

        // Prefer axes[2/3] if present else [0/1]
        const axX = (gp.axes.length >= 4 ? gp.axes[2] : gp.axes[0]) ?? 0;
        const axY = (gp.axes.length >= 4 ? gp.axes[3] : gp.axes[1]) ?? 0;

        const dz = 0.15;
        const fx = Math.abs(axX) > dz ? axX : 0;
        const fy = Math.abs(axY) > dz ? axY : 0;

        x = fx;
        y = -fy;

        // Button mapping (best-effort):
        // 0: primary (A/X) -> grab
        // 1: secondary (B/Y) -> wave
        // 3 or 8: stick click -> run
        if (gp.buttons?.[0]?.pressed) this.grab = true;
        if (!gp.buttons?.[0]?.pressed) this.release = true;
        if (gp.buttons?.[1]?.pressed) this.wave = true;

        xrRun = !!gp.buttons?.[3]?.pressed || !!gp.buttons?.[8]?.pressed;

        // Optional seating: 4/5 triggers
        if (gp.buttons?.[4]?.pressed) this.sit = true;
        if (gp.buttons?.[5]?.pressed) this.stand = true;

        break;
      }
    }

    // Normalize
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }

    this.move.set(x, y);
    this.run = xrRun || run;
  }
}
