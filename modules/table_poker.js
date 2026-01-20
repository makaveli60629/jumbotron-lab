import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function createPokerTable({ radius=1.65, y=0.75 } = {}){
  const g = new THREE.Group();

  // base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius*0.72, radius*0.9, 0.55, 32),
    new THREE.MeshStandardMaterial({ color:0x18212d, roughness:0.85, metalness:0.02 })
  );
  base.position.y = y - 0.38;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(radius*0.92, 0.12, 18, 64),
    new THREE.MeshStandardMaterial({ color:0x2a1a12, roughness:0.65, metalness:0.02 })
  );
  rail.rotation.x = Math.PI/2;
  rail.position.y = y + 0.02;
  rail.castShadow = true;
  g.add(rail);

  // felt
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(radius*0.88, radius*0.88, 0.08, 64),
    new THREE.MeshStandardMaterial({ color:0x0f6b3f, roughness:0.95, metalness:0.0 })
  );
  felt.position.y = y;
  felt.castShadow = false;
  felt.receiveShadow = true;
  g.add(felt);

  // pass line (white ring + text placeholders)
  const line = new THREE.Mesh(
    new THREE.RingGeometry(radius*0.50, radius*0.52, 96),
    new THREE.MeshStandardMaterial({ color:0xe7f2ff, roughness:0.8, metalness:0.0, side:THREE.DoubleSide })
  );
  line.rotation.x = -Math.PI/2;
  line.position.y = y + 0.041;
  g.add(line);

  // center marker
  const center = new THREE.Mesh(
    new THREE.CircleGeometry(radius*0.12, 48),
    new THREE.MeshStandardMaterial({ color:0x101820, roughness:0.9, metalness:0.0, side:THREE.DoubleSide })
  );
  center.rotation.x = -Math.PI/2;
  center.position.y = y + 0.041;
  g.add(center);

  g.position.set(0, 0, -1.8);
  return g;
}
