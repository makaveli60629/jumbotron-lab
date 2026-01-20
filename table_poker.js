import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function createPokerTable() {
  const g = new THREE.Group();

  // Table base
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.8, metalness: 0.05 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.18, 48), baseMat);
  base.position.y = 0.46;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // Felt top
  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x135c3a, roughness: 0.95, metalness: 0.02,
    emissive: 0x031a10, emissiveIntensity: 0.35
  });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 64), feltMat);
  top.position.y = 0.56;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  // Rim
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x3a2417, roughness: 0.7 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 16, 72), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.59;
  rim.castShadow = true;
  g.add(rim);

  // Pass line + inner lines (procedural decals via thin rings)
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xe8e3d6, roughness: 0.6, metalness: 0.0,
    emissive: 0x222015, emissiveIntensity: 0.12
  });

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.006, 10, 90), lineMat);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 0.592;
  g.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.005, 10, 90), lineMat);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.592;
  g.add(ring2);

  // "PASS LINE" text (CanvasTexture)
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0,0,512,128);
  ctx.font = 'bold 64px system-ui, Arial';
  ctx.fillStyle = '#f3efe5';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 8;
  ctx.fillText('PASS LINE', 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const textMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true });
  const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.14), textMat);
  textPlane.rotation.x = -Math.PI/2;
  textPlane.position.set(0, 0.593, 0.20);
  g.add(textPlane);

  return g;
}
