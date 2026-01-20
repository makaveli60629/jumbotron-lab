export function createDiagnostics(panelEl) {
  const state = {
    enabled: true,
    lastT: performance.now(),
    frames: 0,
    fps: 0,
    warnings: [],
    lastError: null,
  };

  function logWarn(msg) {
    state.warnings.push({ t: new Date().toISOString(), msg });
    if (state.warnings.length > 6) state.warnings.shift();
  }

  window.addEventListener('error', (e) => {
    const msg = e?.message || String(e);
    state.lastError = msg;
    logWarn(`ERROR: ${msg}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e?.reason?.message || String(e?.reason || e);
    state.lastError = msg;
    logWarn(`PROMISE: ${msg}`);
  });

  function update({ camera, renderer, extraLines = [] }) {
    if (!state.enabled) return;

    state.frames += 1;
    const now = performance.now();
    const dt = now - state.lastT;
    if (dt > 500) {
      state.fps = Math.round((state.frames * 1000) / dt);
      state.frames = 0;
      state.lastT = now;
    }

    const pos = camera?.position;
    const xr = renderer?.xr;
    const isXR = xr?.isPresenting ? 'YES' : 'no';

    const lines = [];
    lines.push(`FPS: ${state.fps}`);
    if (pos) lines.push(`Camera: x=${pos.x.toFixed(2)} y=${pos.y.toFixed(2)} z=${pos.z.toFixed(2)}`);
    lines.push(`WebXR presenting: ${isXR}`);
    lines.push('');

    for (const ln of extraLines) lines.push(ln);

    if (state.warnings.length) {
      lines.push('');
      lines.push('Recent warnings:');
      for (const w of state.warnings) lines.push(`- ${w.t.split('T')[1].split('.')[0]}  ${w.msg}`);
    }

    if (state.lastError) {
      lines.push('');
      lines.push(`Last error: ${state.lastError}`);
    }

    panelEl.textContent = lines.join('\n');
  }

  function setEnabled(v) {
    state.enabled = !!v;
    panelEl.style.display = state.enabled ? 'block' : 'none';
  }

  return { update, logWarn, setEnabled, state };
}
