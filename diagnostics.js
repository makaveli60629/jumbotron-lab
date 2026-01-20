import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

/**
 * Spine diagnostic: draws a polyline through pelvis -> spine0 -> spine1 -> neck -> head
 * Call update() every frame.
 */
export class SpineDiagnostics {
  constructor(scene, avatar, { color = 0x00ff88 } = {}) {
    this.scene = scene;
    this.avatar = avatar;
    this.enabled = true;

    const geom = new THREE.BufferGeometry();
    const pts = new Float32Array(5 * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(pts, 3));

    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    this.line = new THREE.Line(geom, mat);
    this.line.frustumCulled = false;
    scene.add(this.line);
  }

  setEnabled(v) {
    this.enabled = v;
    this.line.visible = v;
  }

  update() {
    if (!this.enabled) return;

    const p = this.avatar.parts;
    const nodes = [p.pelvis, p.spine0, p.spine1, p.neck, p.head].filter(Boolean);
    if (nodes.length < 5) return;

    const arr = this.line.geometry.attributes.position.array;
    for (let i = 0; i < 5; i++) {
      const w = new THREE.Vector3();
      nodes[i].getWorldPosition(w);
      arr[i*3+0] = w.x;
      arr[i*3+1] = w.y;
      arr[i*3+2] = w.z;
    }
    this.line.geometry.attributes.position.needsUpdate = true;
  }
}

/**
 * Simple screen HUD helper.
 */
export function setDiagText(el, lines) {
  el.textContent = lines.join('\n');
}

export function toast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._to);
  toast._to = setTimeout(() => t.classList.remove('show'), ms);
}
