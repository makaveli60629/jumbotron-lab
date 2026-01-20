import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';

import { HumanoidAvatar } from './HumanoidAvatar.js';
import { animateHumanoid } from './MovementEngine.js';
import { SpineDiagnostics, setDiagText, toast } from './diagnostics.js';
import { TouchSticks } from './touch_controls.js';
import { createPokerTable } from './table_poker.js';
import { createJumbotron } from './jumbotron.js';

const canvas = document.getElementById('c');
const diagEl = document.getElementById('diag');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.02, 100);
camera.position.set(0, 1.65, 3.2);

// Player rig (yaw + pitch)
const rig = new THREE.Group();
rig.position.set(0, 0, 2.6); // spawn safe away from walls
scene.add(rig);

const yaw = new THREE.Group();
const pitch = new THREE.Group();
rig.add(yaw);
yaw.add(pitch);
pitch.add(camera);

// Lights (requested)
const hemi = new THREE.HemisphereLight(0xbad7ff, 0x14202c, 0.8);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.15);
key.position.set(4, 7, 3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 30;
key.shadow.camera.left = -8;
key.shadow.camera.right = 8;
key.shadow.camera.top = 8;
key.shadow.camera.bottom = -8;
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.35);
fill.position.set(-4, 5, -3);
scene.add(fill);

// Room (bigger, no wall spawn)
const room = new THREE.Group();
scene.add(room);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x151b22, roughness: 0.95, metalness: 0.0 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMat);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
room.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x10161d, roughness: 0.9, metalness: 0.05 });

function wall(w,h, x,y,z, ry=0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), wallMat);
  m.position.set(x,y,z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  room.add(m);
  return m;
}
wall(18, 6, 0, 3, -9, 0);
wall(18, 6, 0, 3,  9, Math.PI);
wall(18, 6, -9, 3, 0, Math.PI/2);
wall(18, 6,  9, 3, 0, -Math.PI/2);

// A subtle back wall accent light strip
const strip = new THREE.Mesh(new THREE.BoxGeometry(10, 0.08, 0.08), new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0x2a8cff, emissiveIntensity: 1.4, roughness: 0.2, metalness: 0.1
}));
strip.position.set(0, 2.4, -8.95);
room.add(strip);

// Table (felt + pass line)
const table = createPokerTable();
table.position.set(0, 0, 0);
room.add(table);

// Display pads for male/female
const padMat = new THREE.MeshStandardMaterial({ color: 0x1c2630, roughness: 0.7, metalness: 0.05, emissive: 0x04111c, emissiveIntensity: 0.8 });
function pad(x,z,label) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 32), padMat);
  p.position.set(x, 0.04, z);
  p.receiveShadow = true;
  p.castShadow = true;
  room.add(p);

  // label via small canvas texture
  const c = document.createElement('canvas'); c.width=256; c.height=64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0,0,256,64);
  ctx.font = 'bold 36px system-ui, Arial';
  ctx.fillStyle = '#e8e3d6';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), new THREE.MeshStandardMaterial({ map: tex, transparent:true }));
  plane.rotation.x = -Math.PI/2;
  plane.position.set(x, 0.085, z+0.46);
  room.add(plane);

  return p;
}
pad(-1.3, -1.0, 'FEMALE');
pad( 1.3, -1.0, 'MALE');

// Avatars: female + male display
const female = new HumanoidAvatar({ gender:'female', skinColor:0xd9b39c, clothingColor:0x2b3a4a, scale: 1.0 });
female.root.position.set(-1.3, 0.0, -1.0);
room.add(female.root);
animateHumanoid(female, 0, 'idle');

const male = new HumanoidAvatar({ gender:'male', skinColor:0xd3ad8f, clothingColor:0x2b2f38, scale: 1.0 });
male.root.position.set(1.3, 0.0, -1.0);
room.add(male.root);
animateHumanoid(male, 0, 'idle');

// Walking bot (male, patrol) + tracking
const walker = new HumanoidAvatar({ gender:'male', skinColor:0xd3ad8f, clothingColor:0x1f2a34, scale: 1.0 });
walker.root.position.set(0.0, 0.0, -4.2);
room.add(walker.root);

// Patrol path (simple rectangle)
const path = [
  new THREE.Vector3(-3.8, 0, -4.8),
  new THREE.Vector3( 3.8, 0, -4.8),
  new THREE.Vector3( 3.8, 0,  2.2),
  new THREE.Vector3(-3.8, 0,  2.2),
];
let pathIdx = 0;

// Jumbotron on wall above avatars
const j = createJumbotron({ width: 4.8, height: 2.7 });
j.group.position.set(0, 3.2, -8.75);
room.add(j.group);
j.tryPlay();

// Touch controls
const sticks = new TouchSticks();
let showSticks = true; // always on for Android debugging
document.getElementById('stickL')?.classList.toggle('hidden', !showSticks);
document.getElementById('stickR')?.classList.toggle('hidden', !showSticks);

// Diagnostics
const spineDiag = new SpineDiagnostics(scene, walker, { color: 0x00ff88 });
let spineOn = true;

document.getElementById('btnSpine')?.addEventListener('click', () => {
  spineOn = !spineOn;
  spineDiag.setEnabled(spineOn);
  document.getElementById('btnSpine').textContent = `Spine: ${spineOn ? 'ON' : 'OFF'}`;
});

document.getElementById('btnReset')?.addEventListener('click', () => {
  rig.position.set(0, 0, 2.6);
  yaw.rotation.y = 0;
  pitch.rotation.x = 0;
  toast('Reset position');
});

document.getElementById('btnUnmute')?.addEventListener('click', async () => {
  await j.unmute();
});

// Unmute attempt on XR session start (still requires user gesture on many browsers)
renderer.xr.addEventListener('sessionstart', async () => {
  toast('XR session started');
  await j.unmute();
});

// Movement params
const moveSpeed = 2.0; // m/s
const lookSpeed = 1.6; // rad/s
const tmpVec = new THREE.Vector3();
let lastT = performance.now();

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function stepPlayer(dt) {
  // Left stick move: x strafe, y forward (screen up is negative dy; we use -y)
  const mx = sticks.move.x;
  const my = sticks.move.y;

  const forward = -my; // up on stick = forward
  const strafe = mx;

  // yaw basis
  tmpVec.set(strafe, 0, forward);
  if (tmpVec.lengthSq() > 1e-6) tmpVec.normalize();

  tmpVec.multiplyScalar(moveSpeed * dt);

  // rotate move vector by yaw
  const ang = yaw.rotation.y;
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const dx = tmpVec.x * cos - tmpVec.z * sin;
  const dz = tmpVec.x * sin + tmpVec.z * cos;

  rig.position.x += dx;
  rig.position.z += dz;

  // Keep within room bounds (soft clamp)
  rig.position.x = clamp(rig.position.x, -7.5, 7.5);
  rig.position.z = clamp(rig.position.z, -7.5, 7.5);

  // Right stick look
  yaw.rotation.y -= sticks.look.x * lookSpeed * dt;
  pitch.rotation.x -= sticks.look.y * lookSpeed * dt;
  pitch.rotation.x = clamp(pitch.rotation.x, -1.0, 1.0);
}

function stepWalker(timeSec, dt) {
  // Move along path
  const pos = walker.root.position;
  const target = path[pathIdx];
  const to = target.clone().sub(pos);
  const dist = to.length();
  const speed = 1.2;

  if (dist < 0.10) {
    pathIdx = (pathIdx + 1) % path.length;
  } else {
    to.normalize();
    pos.add(to.multiplyScalar(speed * dt));

    // Face direction of motion (avatar forward is -Z, so lookAt a point ahead)
    const lookPt = pos.clone().add(to);
    walker.root.lookAt(lookPt.x, lookPt.y + 1.2, lookPt.z);
    walker.root.rotation.x = 0;
    walker.root.rotation.z = 0;
  }

  // Walk anim + tracking
  animateHumanoid(walker, timeSec, 'walk');

  // tracking target is player's head (camera world pos)
  const camWorld = new THREE.Vector3();
  camera.getWorldPosition(camWorld);
  walker.updateTracking(camWorld, 1.0);
}

function updateDiag(timeSec) {
  const fps = Math.round(1/Math.max(0.0001, (performance.now()-lastT)/1000));
  setDiagText(diagEl, [
    `XR: ${renderer.xr.isPresenting ? 'ON' : 'OFF'} | FPS≈${fps}`,
    `Player: x=${rig.position.x.toFixed(2)} z=${rig.position.z.toFixed(2)}`,
    `Jumbotron: ${j.video?.paused ? 'paused' : 'playing'} | muted=${j.video?.muted ? 'yes' : 'no'}`,
    `Walker: elbows/knees fixed | Tracking: ON`,
    `Touch: L(move) R(look)`
  ]);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  const timeSec = now / 1000;

  // Update player (only when not in XR; in XR headset drives camera)
  if (!renderer.xr.isPresenting) {
    stepPlayer(dt);
  }

  // Display avatars idle
  animateHumanoid(female, timeSec, 'idle');
  animateHumanoid(male, timeSec, 'idle');

  // Walker
  stepWalker(timeSec, dt);

  // Spine diag (walker)
  spineDiag.update();

  updateDiag(timeSec);

  renderer.render(scene, camera);
});

// Helpful first toast
toast('If video is dark: tap Unmute. Autoplay with audio is often blocked on mobile.');
