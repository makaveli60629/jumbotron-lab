import * as THREE from "three";

export function buildRoom(scene){
  // Floor (lighter so you can see)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a28, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 1.0 });
  const mkWall = (w,h) => new THREE.Mesh(new THREE.PlaneGeometry(w,h), wallMat);

  const back = mkWall(12, 4);
  back.position.set(0, 2, -6);
  scene.add(back);

  const front = mkWall(12, 4);
  front.rotation.y = Math.PI;
  front.position.set(0, 2, 6);
  scene.add(front);

  const left = mkWall(12, 4);
  left.rotation.y = Math.PI/2;
  left.position.set(-6, 2, 0);
  scene.add(left);

  const right = mkWall(12, 4);
  right.rotation.y = -Math.PI/2;
  right.position.set(6, 2, 0);
  scene.add(right);

  // Soft “stage” circle
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 48),
    new THREE.MeshStandardMaterial({ color: 0x2a2a44, roughness: 0.7, metalness: 0.05 })
  );
  pad.rotation.x = -Math.PI/2;
  pad.position.set(0, 0.01, 2.6);
  scene.add(pad);

  // A faint marker column so you always know where “forward” is
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.2, 18),
    new THREE.MeshStandardMaterial({ color: 0x6b74ff, roughness: 0.2, metalness: 0.1, emissive: 0x101030 })
  );
  marker.position.set(0, 0.6, 1.7);
  scene.add(marker);
}
