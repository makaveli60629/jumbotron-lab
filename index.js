import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { createPerfectAvatar } from './avatar_engine.js';
import { updateAvatarIdle, updateAvatarWalk, mirrorHandsToControllers } from './avatar_logic.js';
import { setupTouchControls } from './touch_controls.js';
import { createSpineDiagnostic } from './diagnostics.js';

const statusEl = document.getElementById('status');
const vrMsgEl = document.getElementById('vrMsg');

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121212);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 250);
camera.position.set(0, 1.65, 6);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// XR support message + VRButton
let xrSupported = false;
async function initXR(){
  try { xrSupported = !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-vr')); }
  catch { xrSupported = false; }
  vrMsgEl.textContent = xrSupported
    ? 'WebXR: immersive-vr supported. (Quest: press Enter VR)'
    : 'WebXR NOT available here. (Android Chrome often) — use Meta/Oculus Browser for VR. Debug controls still work.';
  if (xrSupported) document.body.appendChild(VRButton.createButton(renderer));
}
initXR();

// Lighting (slightly polished, still simple)
scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2a, 0.85));

const key = new THREE.DirectionalLight(0xffffff, 0.95);
key.position.set(6, 10, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far  = 40;
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.25);
fill.position.set(-6, 6, -4);
scene.add(fill);

const rim = new THREE.PointLight(0xffffff, 0.25, 20);
rim.position.set(0, 3, -6);
scene.add(rim);

// Floor (bigger room so you don't spawn into a wall)
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 1 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

// Table (dev reference)
const tableTop = new THREE.Mesh(
  new THREE.CylinderGeometry(0.95, 0.95, 0.14, 64),
  new THREE.MeshStandardMaterial({ color: 0x0b6b2b, roughness: 0.9 })
);
tableTop.position.set(0, 0.78, 0);
tableTop.castShadow = true;
scene.add(tableTop);

const tableBase = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 0.35, 0.75, 32),
  new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1.0 })
);
tableBase.position.set(0, 0.375, 0);
tableBase.castShadow = true;
scene.add(tableBase);

// Avatars: male + female display, and one walking bot (uses spine diagnostics)
const male = createPerfectAvatar('male');
male.position.set(-2.6, 0, -1.6);
scene.add(male);

const female = createPerfectAvatar('female');
female.position.set(-4.0, 0, -1.6);
scene.add(female);

const walker = createPerfectAvatar('male');
walker.position.set(3, 0, -2);
scene.add(walker);

// Spine diagnostics line for walker (PRESERVED)
let spineOn = true;
const spine = createSpineDiagnostic(scene, walker);
spine.line.visible = spineOn;

// Touch controls (Android)
const touch = setupTouchControls();
let yaw = 0;
let pitch = 0;

// Buttons
const hud = document.getElementById('hud');
document.getElementById('toggleHUD').onclick = () => {
  hud.style.display = (hud.style.display === 'none') ? 'block' : 'none';
};
document.getElementById('reset').onclick = () => {
  camera.position.set(0, 1.65, 6);
  yaw = 0; pitch = 0;
};
document.getElementById('toggleSpine').onclick = () => {
  spineOn = !spineOn;
  spine.line.visible = spineOn;
};

let ikOn = true;
document.getElementById('toggleIK').onclick = () => { ikOn = !ikOn; };

// Controllers (Quest)
const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
controllers.forEach(c => scene.add(c));

// Diagnostics HUD
let fps=0, frames=0, lastFpsT=performance.now();
function hudUpdate(){
  const p = camera.position;
  const jCount = Object.keys((walker.userData && walker.userData.joints) ? walker.userData.joints : {}).length;
  statusEl.textContent = `Mode: ${renderer.xr.isPresenting ? 'VR' : 'Debug'} | XR: ${xrSupported?'Yes':'No'} | IK: ${ikOn?'On':'Off'} | Spine: ${spineOn?'On':'Off'} | FPS: ${fps.toFixed(0)} | Joints: ${jCount} | Cam: (${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)})`;
}

// Main loop
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const t  = clock.getElapsedTime();

  // Android look+move when not in XR
  if (!renderer.xr.isPresenting) {
    yaw   += (-touch.lookX) * dt * 2.4;
    pitch += (-touch.lookY) * dt * 1.8;
    pitch = Math.max(-1.0, Math.min(1.0, pitch));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    const forward = new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(0, yaw, 0));
    const right   = new THREE.Vector3(1,0, 0).applyEuler(new THREE.Euler(0, yaw, 0));
    const speed = 2.2;
    camera.position.addScaledVector(forward, (-touch.moveY) * dt * speed);
    camera.position.addScaledVector(right,   ( touch.moveX) * dt * speed);
    camera.position.y = 1.65;
  }

  // Display avatars: idle only
  updateAvatarIdle(male, t);
  updateAvatarIdle(female, t);

  // Walker: patrol + walk
  const R = 4.2;
  walker.position.x = Math.sin(t * 0.45) * R;
  walker.position.z = Math.cos(t * 0.45) * R;
  walker.rotation.y = t * 0.45 + Math.PI/2;
  updateAvatarWalk(walker, t);

  // Spine diagnostic line updates (PRESERVED)
  if (spineOn) spine.update();

  // Hands mirroring to controllers (VR only)
  mirrorHandsToControllers(renderer, walker, controllers, ikOn);

  // FPS update
  frames++;
  const now = performance.now();
  if (now - lastFpsT > 500) {
    fps = (frames * 1000) / (now - lastFpsT);
    frames=0; lastFpsT=now;
    hudUpdate();
  }

  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
