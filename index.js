import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { createMasterAvatar } from './avatar_core.js';
import { updateAvatar } from './avatar_logic.js';
import { setupTouchControls } from './touch_controls.js';

// ---------- Scene / Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151515);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 200);
camera.position.set(0, 1.65, 6);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------- WebXR availability (Quest Browser vs Android Chrome) ----------
const vrMsg = document.getElementById('vrMsg');
let vrSupported = false;

async function checkXR() {
  try {
    if (navigator.xr && navigator.xr.isSessionSupported) {
      vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
    } else {
      vrSupported = false;
    }
  } catch {
    vrSupported = false;
  }
  vrMsg.textContent = vrSupported
    ? 'WebXR: immersive-vr supported. (Use Oculus/Meta Browser for VR)'
    : 'WebXR NOT available in this browser. (Android Chrome often shows this) — debug mode still works.';

  if (vrSupported) document.body.appendChild(VRButton.createButton(renderer));
}
checkXR();

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 0.7));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(8, 12, 6);
dir.castShadow = true;
dir.shadow.mapSize.set(2048, 2048);
scene.add(dir);

// ---------- Floor + Bigger Room Space ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

// Soft "room bounds" markers (no walls to trap spawn)
const ring = new THREE.Mesh(
  new THREE.RingGeometry(10, 10.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x1f1f1f, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI/2;
ring.position.y = 0.01;
scene.add(ring);

// ---------- Poker Table (slightly nicer) ----------
const tableTop = new THREE.Mesh(
  new THREE.CylinderGeometry(0.95, 0.95, 0.14, 48),
  new THREE.MeshStandardMaterial({ color: 0x0b6b2b, roughness: 0.9 })
);
tableTop.position.set(0, 0.78, 0);
tableTop.castShadow = true;
scene.add(tableTop);

const tableBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 0.35, 0.75, 24),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 })
);
tableBase.position.set(0, 0.375, 0);
tableBase.castShadow = true;
scene.add(tableBase);

// ---------- Avatars (Male + Female display) ----------
const male = createMasterAvatar('male');
male.position.set(-2.6, 0, -1.6);
scene.add(male);

const female = createMasterAvatar('female');
female.position.set(-4.0, 0, -1.6);
scene.add(female);

// ---------- Walking NPC ----------
const walker = createMasterAvatar('male');
walker.position.set(3, 0, -2);
scene.add(walker);

// ---------- Android Controls ----------
const touch = setupTouchControls();
let yaw = 0;
let pitch = 0;

// Desktop pointer look (optional)
let pointerLocked = false;
document.body.addEventListener('click', async () => {
  if (document.pointerLockElement) return;
  // Only attempt lock on desktop; harmless on mobile
  try { await renderer.domElement.requestPointerLock(); } catch {}
});
document.addEventListener('pointerlockchange', () => {
  pointerLocked = !!document.pointerLockElement;
});

document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  yaw   -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-1.2, Math.min(1.2, pitch));
});

// Buttons
const hud = document.getElementById('hud');
document.getElementById('toggleHUD').onclick = () => {
  hud.style.display = (hud.style.display === 'none') ? 'block' : 'none';
};
document.getElementById('reset').onclick = () => {
  camera.position.set(0, 1.65, 6);
  yaw = 0; pitch = 0;
};

// Diagnostics HUD
const status = document.getElementById('status');
let fps = 0, frames = 0, lastFpsT = performance.now();

function updateHUD() {
  const p = camera.position;
  status.textContent = `Mode: ${vrSupported ? 'XR-capable' : 'Debug'} | FPS: ${fps.toFixed(0)} | Cam: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
}

// ---------- Animation Loop ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t  = clock.getElapsedTime();

  // Touch look (mobile)
  yaw   += (-touch.lookX) * dt * 2.4;
  pitch += (-touch.lookY) * dt * 1.8;
  pitch = Math.max(-1.0, Math.min(1.0, pitch));

  // Apply camera look (only in non-XR; XR controls camera automatically)
  if (!renderer.xr.isPresenting) {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // Touch move (relative to yaw)
    const forward = new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(0, yaw, 0));
    const right   = new THREE.Vector3(1,0, 0).applyEuler(new THREE.Euler(0, yaw, 0));
    const speed = 2.2;
    camera.position.addScaledVector(forward, (-touch.moveY) * dt * speed);
    camera.position.addScaledVector(right,   ( touch.moveX) * dt * speed);
    camera.position.y = 1.65; // lock eye height for debugging
  }

  // Display avatars idle only
  updateAvatar(male, t, false);
  updateAvatar(female, t, false);

  // Walker path around table
  const R = 4.2;
  walker.position.x = Math.sin(t * 0.45) * R;
  walker.position.z = Math.cos(t * 0.45) * R;
  walker.rotation.y = t * 0.45 + Math.PI/2;
  updateAvatar(walker, t, true);

  // FPS
  frames += 1;
  const now = performance.now();
  if (now - lastFpsT > 500) {
    fps = (frames * 1000) / (now - lastFpsT);
    frames = 0;
    lastFpsT = now;
    updateHUD();
  }

  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
