import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { buildWorld } from './world.js';
import { BotManager } from './bots.js';
import { createFPSControls } from './controls.js';
import { createDiagnostics } from './diagnostics.js';

const app = document.getElementById('app');
const diagEl = document.getElementById('diag');
const toastEl = document.getElementById('toast');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
app.appendChild(renderer.domElement);

// VR button (shows only if XR is available)
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 200);
camera.position.set(0, 1.65, 7.5);

const diagnostics = createDiagnostics(diagEl);

const controls = createFPSControls({ camera, domElement: renderer.domElement, toast: toastEl });

// Hook UI buttons
const btnPointer = document.getElementById('btnPointer');
const btnReset = document.getElementById('btnReset');
const btnToggleDiag = document.getElementById('btnToggleDiag');

btnPointer.addEventListener('click', () => controls.requestPointerLock());
btnReset.addEventListener('click', () => {
  controls.setPosition(0, 1.65, 7.5);
});
btnToggleDiag.addEventListener('click', () => {
  const next = !diagnostics.state.enabled;
  diagnostics.setEnabled(next);
});

// Build world and spawn one walking bot
const worldState = await buildWorld({ scene, diagnostics });
controls.setPosition(worldState.spawn.x, worldState.spawn.y, worldState.spawn.z);

const bots = new BotManager(scene, { navTargets: worldState.navTargets, diagnostics });

// Use the animated GLB for the walking NPC
await bots.spawnWalkingBot({
  avatarUrl: 'assets/avatars/Meshy_Merged_Animations.glb',
  start: new THREE.Vector3(0, 0, -2.2),
  scale: 1.0,
  speed: 1.2,
  forwardFlip: false
});

diagnostics.logWarn('Boot OK. If the bot looks backward, set forwardFlip:true in main.js.');

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());

  // Only run keyboard/mouse controls when not presenting XR
  if (!renderer.xr.isPresenting) {
    controls.update(dt);
  }

  bots.update();

  diagnostics.update({
    camera,
    renderer,
    extraLines: [
      `Bots: ${bots.bots.length}`,
      `Avatar display: assets/avatars/Character_output.glb`,
      `Walking bot: assets/avatars/Meshy_Merged_Animations.glb`,
      `Tip: serve with a local server (not file://).`
    ]
  });

  renderer.render(scene, camera);
});
