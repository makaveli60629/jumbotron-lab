export function installControls(S) {
  const state = { vx: 0, vz: 0, dragging: false, lastX: 0, lastY: 0 };
  const SPEED = 2.2;

  const keys = new Set();
  window.addEventListener("keydown", (e) => keys.add(e.code));
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  window.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    if (!t) return;
    state.dragging = true;
    state.lastX = t.clientX;
    state.lastY = t.clientY;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!state.dragging) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - state.lastX;
    const dy = t.clientY - state.lastY;
    state.lastX = t.clientX;
    state.lastY = t.clientY;
    state.vx = clamp(dx / 220, -1, 1);
    state.vz = clamp(dy / 220, -1, 1);
  }, { passive: true });

  window.addEventListener("touchend", () => {
    state.dragging = false;
    state.vx = 0; state.vz = 0;
  }, { passive: true });

  S.modules.set("controls", {
    tick: (S) => {
      const dt = 1/60;
      let ix = 0, iz = 0;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) iz -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) iz += 1;
      ix += state.vx;
      iz += state.vz;
      if (ix === 0 && iz === 0) return;

      const yaw = S.rig.rotation.y;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const dx = (ix * cos - iz * sin) * SPEED * dt;
      const dz = (ix * sin + iz * cos) * SPEED * dt;
      S.rig.position.x += dx;
      S.rig.position.z += dz;
    }
  });

  S.diag.log("MOD", "Controls installed (WASD + touch drag).");
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
