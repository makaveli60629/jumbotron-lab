/**
 * Dual-stick touch controls for Android debugging.
 * - Left stick: move (x = strafe, y = forward)
 * - Right stick: look (x = yaw, y = pitch)
 */
export class TouchSticks {
  constructor({
    stickL = document.getElementById('stickL'),
    stickR = document.getElementById('stickR'),
    max = 42
  } = {}) {
    this.stickL = stickL;
    this.stickR = stickR;
    this.max = max;

    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };

    this._bind(this.stickL, (v) => this.move = v);
    this._bind(this.stickR, (v) => this.look = v);
  }

  _bind(stick, setter) {
    if (!stick) return;
    const nub = stick.querySelector('.nub');

    let pid = null;
    let start = { x: 0, y: 0 };

    const setNub = (dx, dy) => {
      if (!nub) return;
      nub.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const onDown = (e) => {
      pid = e.pointerId;
      stick.setPointerCapture(pid);
      start = { x: e.clientX, y: e.clientY };
      setter({ x: 0, y: 0 });
      setNub(0, 0);
    };

    const onMove = (e) => {
      if (pid !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      const len = Math.hypot(dx, dy);
      const cl = Math.min(this.max, len);
      const nx = len > 0 ? dx / len : 0;
      const ny = len > 0 ? dy / len : 0;

      const mx = nx * (cl / this.max);
      const my = ny * (cl / this.max);

      setNub(mx * this.max, my * this.max);
      setter({ x: mx, y: my });
    };

    const onUp = (e) => {
      if (pid !== e.pointerId) return;
      pid = null;
      setter({ x: 0, y: 0 });
      setNub(0, 0);
    };

    stick.addEventListener('pointerdown', onDown, { passive: true });
    stick.addEventListener('pointermove', onMove, { passive: true });
    stick.addEventListener('pointerup', onUp, { passive: true });
    stick.addEventListener('pointercancel', onUp, { passive: true });
    stick.addEventListener('lostpointercapture', onUp, { passive: true });
  }
}
