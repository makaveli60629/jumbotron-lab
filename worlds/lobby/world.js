import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function loadLobbyWorld(scene){
  // Big room so you never spawn in a wall
  const room = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({ color:0x0f1a26, roughness:0.95, metalness:0.0 });
  const trimMat = new THREE.MeshStandardMaterial({ color:0x1d2d44, roughness:0.8, metalness:0.0 });

  const W = 22, H = 6, D = 22;
  const thickness = 0.25;

  // back wall
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, thickness), wallMat);
  back.position.set(0, H/2, -D/2);
  back.receiveShadow = true;
  room.add(back);

  // front wall (with an opening feel)
  const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, thickness), wallMat);
  front.position.set(0, H/2, D/2);
  front.receiveShadow = true;
  room.add(front);

  // left/right
  const left = new THREE.Mesh(new THREE.BoxGeometry(thickness, H, D), wallMat);
  left.position.set(-W/2, H/2, 0);
  left.receiveShadow = true;
  room.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(thickness, H, D), wallMat);
  right.position.set(W/2, H/2, 0);
  right.receiveShadow = true;
  room.add(right);

  // ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, thickness, D), wallMat);
  ceil.position.set(0, H + thickness/2, 0);
  ceil.receiveShadow = true;
  room.add(ceil);

  // simple trims
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 0.18), trimMat);
  trim.position.set(0, 1.1, -D/2 + 0.1);
  room.add(trim);

  scene.add(room);
  return room;
}
