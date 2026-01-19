/**
 * Simple dual-stick touch controls:
 * - Left stick: move (x/z)
 * - Right stick: look (yaw/pitch)
 * Returns a state object { moveX, moveY, lookX, lookY }
 */
export function setupTouchControls() {
  const state = { moveX:0, moveY:0, lookX:0, lookY:0 };

  const bindStick = (stickEl, nubEl, setFn) => {
    let active = false;
    let origin = { x:0, y:0 };

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const onDown = (e) => {
      active = true;
      const t = e.touches ? e.touches[0] : e;
      origin.x = t.clientX;
      origin.y = t.clientY;
      nubEl.style.transform = 'translate(0px, 0px)';
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!active) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - origin.x;
      const dy = t.clientY - origin.y;
      const max = 46; // px radius
      const cx = clamp(dx, -max, max);
      const cy = clamp(dy, -max, max);
      nubEl.style.transform = `translate(${cx}px, ${cy}px)`;
      setFn(cx/max, cy/max);
      e.preventDefault();
    };

    const onUp = (e) => {
      active = false;
      nubEl.style.transform = 'translate(0px, 0px)';
      setFn(0,0);
      e.preventDefault();
    };

    stickEl.addEventListener('touchstart', onDown, {passive:false});
    stickEl.addEventListener('touchmove', onMove, {passive:false});
    stickEl.addEventListener('touchend', onUp, {passive:false});
    stickEl.addEventListener('touchcancel', onUp, {passive:false});
  };

  const stickL = document.getElementById('stickL');
  const nubL = document.getElementById('nubL');
  const stickR = document.getElementById('stickR');
  const nubR = document.getElementById('nubR');

  bindStick(stickL, nubL, (x,y)=>{ state.moveX = x; state.moveY = y; });
  bindStick(stickR, nubR, (x,y)=>{ state.lookX = x; state.lookY = y; });

  return state;
}
