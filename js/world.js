import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function buildWorld({ scene, diagnostics }) {
  scene.background = new THREE.Color(0x0b0d10);
  scene.fog = new THREE.Fog(0x0b0d10, 12, 60);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.9);
  hemi.position.set(0, 20, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.05);
  dir.position.set(8, 14, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 60;
  dir.shadow.camera.left = -20;
  dir.shadow.camera.right = 20;
  dir.shadow.camera.top = 20;
  dir.shadow.camera.bottom = -20;
  scene.add(dir);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(120, 120);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x141a21, roughness: 0.95, metalness: 0.0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Centerpiece "poker" table
  const table = createPokerTable();
  table.position.set(0, 0, 0);
  scene.add(table);

  // Pedestal for the display avatar
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 0.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x1e2630, roughness: 0.7, metalness: 0.15 })
  );
  pedestal.position.set(4.2, 0.2, 1.0);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  // Simple "jumbotron" panel
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 0.55, metalness: 0.05, emissive: 0x0b1020, emissiveIntensity: 0.8 })
  );
  screen.position.set(-7, 2.0, -2.0);
  screen.rotation.y = Math.PI * 0.18;
  screen.castShadow = true;
  scene.add(screen);

  // Load one avatar as a static display model
  const displayRoot = await loadAvatar(
    'assets/avatars/Character_output.glb',
    diagnostics
  );
  displayRoot.position.set(4.2, 0.4, 1.0);
  displayRoot.rotation.y = -Math.PI * 0.65;
  displayRoot.scale.setScalar(1.0);
  scene.add(displayRoot);

  // Waypoints for walking bot
  const navTargets = [
    new THREE.Vector3(0, 0, -4.0),
    new THREE.Vector3(3.8, 0, -1.0),
    new THREE.Vector3(1.8, 0, 3.2),
    new THREE.Vector3(-2.5, 0, 2.6),
    new THREE.Vector3(-3.6, 0, -2.0),
  ];

  return {
    tableCenter: new THREE.Vector3(0, 0, 0),
    spawn: new THREE.Vector3(0, 1.65, 7.5),
    navTargets,
  };
}

function createPokerTable() {
  const group = new THREE.Group();

  // base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.5, 0.8, 40),
    new THREE.MeshStandardMaterial({ color: 0x2a2f37, roughness: 0.6, metalness: 0.25 })
  );
  base.position.y = 0.4;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // felt top
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(3.3, 3.3, 0.28, 64),
    new THREE.MeshStandardMaterial({ color: 0x0f5a3a, roughness: 0.95, metalness: 0.02 })
  );
  top.position.y = 0.94;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // rail
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(3.33, 0.22, 18, 80),
    new THREE.MeshStandardMaterial({ color: 0x1b1310, roughness: 0.85, metalness: 0.08 })
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 1.05;
  rail.castShadow = true;
  group.add(rail);

  // chips / decor
  for (let i = 0; i < 10; i++) {
    const chip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd9d9d9 : 0xd62d2d, roughness: 0.6, metalness: 0.05 })
    );
    const ang = (i / 10) * Math.PI * 2;
    chip.position.set(Math.cos(ang) * 1.0, 1.12, Math.sin(ang) * 1.0);
    chip.rotation.x = Math.PI / 2;
    chip.castShadow = true;
    group.add(chip);
  }

  return group;
}

async function loadAvatar(url, diagnostics) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material) o.material.side = THREE.DoubleSide;
          }
        });
        resolve(root);
      },
      undefined,
      (err) => {
        diagnostics?.logWarn?.(`Failed to load avatar: ${url}`);
        reject(err);
      }
    );
  });
}
