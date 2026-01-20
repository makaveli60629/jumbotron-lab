import { AudioManager } from './audio_manager.js';

// A-Frame components
AFRAME.registerComponent('sfx-pad', {
  schema: { effect: { type: 'string' } },
  init() {
    this.el.addEventListener('click', () => {
      AudioManager.play(this.data.effect);
      // visual feedback
      const old = this.el.getAttribute('scale');
      this.el.setAttribute('scale', { x: old.x*1.05, y: old.y*0.85, z: old.z*1.05 });
      setTimeout(() => this.el.setAttribute('scale', old), 90);
    });
  }
});

// Poll XR gamepads so you can test without clicking pads
AFRAME.registerComponent('controller-sfx', {
  init() {
    this._prev = new Map();
  },
  tick() {
    const scene = this.el.sceneEl;
    const xr = scene && scene.renderer && scene.renderer.xr;
    const session = xr && xr.getSession ? xr.getSession() : null;
    if (!session) return;

    for (const src of session.inputSources) {
      if (!src.gamepad) continue;
      const id = src.handedness || 'none';
      const gp = src.gamepad;
      if (!this._prev.has(id)) this._prev.set(id, { buttons: [], axes: [] });
      const prev = this._prev.get(id);

      const btn = (i) => (gp.buttons && gp.buttons[i] ? gp.buttons[i].pressed : false);
      const edge = (i) => {
        const was = !!prev.buttons[i];
        const now = !!btn(i);
        prev.buttons[i] = now;
        return now && !was;
      };

      // Common Quest mappings (may vary by browser):
      // 0 = trigger, 1 = squeeze/grip, 3 = A/X, 4 = B/Y (often)
      if (edge(0)) AudioManager.play('dealTwo');   // trigger
      if (edge(1)) AudioManager.play('stack');     // squeeze
      if (edge(3)) AudioManager.play('knock');     // A/X
      if (edge(4)) AudioManager.play('vacuum');    // B/Y

      // Thumbstick click is sometimes 2 (varies). We'll try it.
      if (edge(2)) AudioManager.play('slide');
    }
  }
});

// Wire up overlay button
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('enableAudio');
  btn?.addEventListener('click', async () => {
    await AudioManager.unlock();
    btn.textContent = 'Audio Enabled ✅';
    btn.disabled = true;
  });
});
