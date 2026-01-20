AFRAME.registerComponent('diagnostics-overlay', {
  init: function () {
    this.diag = document.getElementById('diag');
    this.rig = document.getElementById('rig');
    this._fpsAcc = 0; this._fpsN = 0; this._fps = 0;
    if (this.diag) this.diag.textContent = 'READY…';
  },
  tick: function (t, dt) {
    if (!this.diag || !dt) return;
    const fps = 1000 / dt;
    this._fpsAcc += fps; this._fpsN++;
    if (this._fpsN >= 12) { this._fps = this._fpsAcc / this._fpsN; this._fpsAcc=0; this._fpsN=0; }

    const scene = this.el.sceneEl;
    const mode = scene.is('vr-mode') ? 'VR' : 'FLAT';
    const joy = window.__JOY_STATE__ || {x:0,y:0,active:false};
    const pos = this.rig ? this.rig.object3D.position : {x:0,z:0};

    const hasJoy = !!AFRAME.components['android-joystick-move'];
    const hasCol = !!AFRAME.components['world-collisions'];
    const hasBotW = !!AFRAME.components['bot-walker'];
    const hasBotS = !!AFRAME.components['bot-seated'];

    const animLines = [];
    const animDb = window.__ANIM_DIAG__ || {};
    for (const k of Object.keys(animDb)) {
      const a = animDb[k];
      animLines.push(`${k}: active="${a.active||''}"  idle="${a.idle||''}"  walk="${a.walk||''}"  run="${a.run||''}"`);
      if (a.names && a.names.length) {
        const short = a.names.slice(0, 10).join(', ') + (a.names.length > 10 ? ' …' : '');
        animLines.push(`   clips: ${short}`);
      }
    }
    const animText = animLines.length ? animLines.join('\n') : '(waiting for model-loaded)';

    this.diag.textContent =
`Scarlett Lobby v3.1 (Casino Realistic)
FPS: ${this._fps.toFixed(1)}   Mode: ${mode}
Rig: x=${pos.x.toFixed(2)} z=${pos.z.toFixed(2)}
Joy: x=${joy.x.toFixed(2)} y=${joy.y.toFixed(2)} ${joy.active ? '(touch)' : ''}
VR Buttons: grab=${!!window.__BTN_GRAB__} wave=${!!window.__BTN_WAVE__}

Modules:
- android-joystick-move: ${hasJoy ? 'OK' : 'MISSING'}
- world-collisions:     ${hasCol ? 'OK' : 'MISSING'}
- bot-walker:           ${hasBotW ? 'OK' : 'MISSING'}
- bot-seated:           ${hasBotS ? 'OK' : 'MISSING'}

Animation:
${animText}`;
  }
});