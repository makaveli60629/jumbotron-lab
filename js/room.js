import * as THREE from "three";

export function buildRoom(scene){
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12,12),
    new THREE.MeshStandardMaterial({ color: 0x121226, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0b12 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(12,4), wallMat);
  back.position.set(0,2,-6);
  scene.add(back);
}
