import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { CONFIG } from "./config.js";

export function buildWorld(S) {
  const { scene } = S;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, CONFIG.lighting.ambient));

  const key = new THREE.DirectionalLight(0xffffff, CONFIG.lighting.key.intensity);
  key.position.set(CONFIG.lighting.key.x, CONFIG.lighting.key.y, CONFIG.lighting.key.z);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, CONFIG.lighting.fill.intensity);
  fill.position.set(CONFIG.lighting.fill.x, CONFIG.lighting.fill.y, CONFIG.lighting.fill.z);
  scene.add(fill);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.95, metalness: 0.0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Carpet marker
  const carpet = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b2b1f, roughness: 0.9 })
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.01;
  scene.add(carpet);

  // Table placeholder
  const table = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.4, 0.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
  );
  table.position.set(0, 0.55, 0);
  scene.add(table);

  // Origin pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.4 })
  );
  pole.position.set(0, 1.1, 0);
  scene.add(pole);
}
