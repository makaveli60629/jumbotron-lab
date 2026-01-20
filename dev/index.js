import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';

import { DevHUD, toast, setHudVisible } from '../core/dev_hud.js';
import { TouchSticks } from '../core/touch_sticks.js';
import { createPokerTable } from '../modules/table_poker.js';
import { createJumbotron } from '../modules/jumbotron.js';
import { HumanoidAvatar } from '../modules/HumanoidAvatar.js';
import { animateHumanoid, steerWalkCycle } from '../modules/MovementEngine.js';
import { SpineDebug } from '../core/spine_debug.js';
import { safeModule } from '../core/safe_module.js';
import { loadLobbyWorld } from '../worlds/lobby/world.js';

/**
 * Permanent boot:
 * - VRButton always present
 * - HUD/diagnostics stable
 * - Worlds + modules loaded via safe wrappers
 */

const diagEl = document.getElementById('diag');

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// VR button (what you called "WebEx")
try {
  document.body.appendChild(VRButton.createButton(renderer));
  toast('VRButton ready (WebXR). If missing: must be HTTPS + supported browser.');
} catch (e) {
  toast('VRButton failed to create. Check HTTPS / WebXR support.');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b11);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 250);
camera.position.set(0, 1.65, 5);

const hud = new DevHUD(diagEl);
hud.set('boot', 'ok');
hud.set('webxr', renderer.xr.enabled ? 'enabled' : 'disabled');
hud.set('world', 'loading...');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting (more contrast so you can see the screen + avatars)
const hemi = new THREE.HemisphereLight(0xbfd7ff, 0x10131b, 0.9);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(6, 10, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
scene.add(key);

const fill = new THREE.DirectionalLight(0x9fd1ff, 0.45);
fill.position.set(-7, 6, -4);
scene.add(fill);

const rim = new THREE.PointLight(0x88aaff, 0.45, 25);
rim.position.set(0, 2.5, -6);
scene.add(rim);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x0b1320, roughness: 0.95, metalness: 0.0 })
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

// Grid toggle
const grid = new THREE.GridHelper(60, 60, 0x27435f, 0x172739);
grid.position.y = 0.001;
scene.add(grid);

// World (big lobby shell)
safeModule(hud, 'world_lobby', async () => {
  const world = loadLobbyWorld(scene);
  hud.set('world', 'lobby ok');
  return world;
});

// Table (make bigger)
safeModule(hud, 'table', async () => {
  const table = createPokerTable({ radius: 1.65, y: 0.75 }); // bigger than before
  scene.add(table);
  hud.set('table', 'ok');
  return table;
});

// Avatars: male + female display + walking NPC
const padZ = -2.8;
const male = new HumanoidAvatar({ sex:'male', skin:0xd8b59a, hair:true });
male.root.position.set(-1.2, 0, padZ);
scene.add(male.root);

const female = new HumanoidAvatar({ sex:'female', skin:0xf1c7b1, hair:true });
female.root.position.set(1.2, 0, padZ);
scene.add(female.root);

const npc = new HumanoidAvatar({ sex:'male', skin:0xcfae93, hair:true });
npc.root.position.set(0, 0, -6.5);
scene.add(npc.root);

hud.set('avatars', 'male+female+npc');

// Spine debug (permanent option)
const spine = new SpineDebug(scene);
spine.attachTo(male);
spine.attachTo(female);
spine.attachTo(npc);

// Jumbotron wall above avatars
const jumbo = createJumbotron({ width: 4.0, height: 2.2 });
jumbo.group.position.set(0, 2.35, -8.5);
scene.add(jumbo.group);
hud.set('jumbotron', 'ok');

// Android sticks
const sticks = new TouchSticks({
  left: document.getElementById('stickL'),
  right: document.getElementById('stickR')
});

// Buttons
let hudVisible = true;
let spineOn = true;
let gridOn = true;
let speed = 1.0;

document.getElementById('btnHud').onclick = () => {
  hudVisible = !hudVisible;
  setHudVisible(hudVisible);
  document.getElementById('btnHud').textContent = hudVisible ? 'Hide HUD' : 'Show HUD';
};

document.getElementById('btnSpine').onclick = () => {
  spineOn = !spineOn;
  spine.setVisible(spineOn);
  document.getElementById('btnSpine').textContent = spineOn ? 'Spine: ON' : 'Spine: OFF';
};

document.getElementById('btnGrid').onclick = () => {
  gridOn = !gridOn;
  grid.visible = gridOn;
  document.getElementById('btnGrid').textContent = gridOn ? 'Grid: ON' : 'Grid: OFF';
};

document.getElementById('btnReset').onclick = () => {
  camera.position.set(0, 1.65, 5);
  toast('Player reset');
};

document.getElementById('btnSlow').onclick = () => {
  speed = (speed >= 1.5) ? 0.5 : (speed + 0.5);
  document.getElementById('btnSlow').textContent = `Speed: ${speed.toFixed(1)}`;
};

document.getElementById('btnModules').onclick = () => {
  toast(hud.dump());
};

document.getElementById('btnUnmute').onclick = async () => {
  await jumbo.unmute();
  toast('Unmute requested');
};

// Try autoplay muted immediately
jumbo.tryPlay();

// Also try to unmute on XR session start (often counts as gesture)
renderer.xr.addEventListener('sessionstart', async () => {
  try { await jumbo.unmute(); } catch {}
});

// Movement / controls
const clock = new THREE.Clock();

function tick() {
  const t = clock.getElapsedTime();

  // Touch look/move (Android)
  const move = sticks.getMove();
  const look = sticks.getLook();

  // Simple FPS-style movement
  const yawSpeed = 1.9 * (look.x || 0);
  camera.rotation.y -= yawSpeed * 0.02;

  const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
  const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));

  const moveVec = new THREE.Vector3()
    .addScaledVector(forward, (move.y || 0))
    .addScaledVector(right, (move.x || 0));

  if (moveVec.lengthSq() > 0.0001) {
    moveVec.normalize().multiplyScalar(0.06 * speed);
    camera.position.add(moveVec);
  }

  // Display avatars idle breathing + head tracking at camera
  animateHumanoid(male, t, false);
  animateHumanoid(female, t, false);

  male.updateTracking(camera.position);
  female.updateTracking(camera.position);

  // NPC patrol (walk forward) - fix backwards walking by aligning facing + velocity
  const patrolR = 4.2;
  const patrolSpeed = 0.35 * speed;
  const px = Math.sin(t * patrolSpeed) * patrolR;
  const pz = Math.cos(t * patrolSpeed) * patrolR - 7.2;

  const prev = npc.root.position.clone();
  npc.root.position.set(px, 0, pz);

  // face direction of motion
  const vel = npc.root.position.clone().sub(prev);
  if (vel.lengthSq() > 1e-6) {
    const dir = vel.clone().normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    npc.root.rotation.y = yaw;
  }
  // walk cycle aligned to forward motion
  steerWalkCycle(npc, t, vel.length() * 8.0);
  npc.updateTracking(camera.position);

  // Spine updates
  spine.update();

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(tick);

// Safety: show errors to HUD
window.addEventListener('error', (e) => hud.set('error', e.message || 'error'));
window.addEventListener('unhandledrejection', (e) => hud.set('promise', (e.reason && e.reason.message) ? e.reason.message : 'rejection'));
