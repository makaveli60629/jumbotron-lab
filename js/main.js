import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { InputRouter } from "./input_router.js";
import { AvatarWalkController } from "./avatar_walk_controller.js";
import { XRHandsController } from "./xr_hands_controller.js";
import { CardInteractions } from "./card_interactions.js";
import { SeatingController } from "./seating_controller.js";
import { DevWorld } from "./world.js";
import { DiagPanel } from "./diag_panel.js";

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

document.body.appendChild(VRButton.createButton(renderer));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070c);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);
camera.position.set(0, 1.6, 3.2);

const clock = new THREE.Clock();

// Player root (authoritative mover)
const playerRoot = new THREE.Group();
scene.add(playerRoot);
// Spawn point (keeps you OUT of the table)
playerRoot.position.set(0, 0, 4.2);
playerRoot.rotation.y = Math.PI;


// Build dev world
const world = new DevWorld({ scene });
world.buildBase();


// Extra lighting (brighter dev space)
const amb = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(amb);
const p1 = new THREE.PointLight(0xffffff, 2.2, 40);
p1.position.set(0, 4.2, 2.0);
scene.add(p1);
const p2 = new THREE.PointLight(0xffffff, 1.6, 40);
p2.position.set(-6, 3.5, -6);
scene.add(p2);
const p3 = new THREE.PointLight(0xffffff, 1.6, 40);
p3.position.set(6, 3.5, -6);
scene.add(p3);
// --- Poker Table (solid + pretty) ---
const table = world.createPokerTable({ x: 0, z: 0.2, yaw: 0, scale: 1.0 });

// Pedestals for showroom
const ped1 = world.createPedestal({ x: -3.2, z: -1.2, label: "Display Bot" });
const ped2 = world.createPedestal({ x:  3.2, z: -1.2, label: "Avatar Display" });

// Diagnostics HUD
const diag = new DiagPanel();
document.getElementById("toggleDiag").addEventListener("click", () => {
  diag.setEnabled(!diag.enabled);
});

// Input
const input = new InputRouter({ renderer, camera });

// Avatar locomotion (animated avatar)
// IMPORTANT: This now avoids combat clips (fight/punch/etc). If your GLB names are weird, we can override names in clipOverrides.
const avatarPath = "./assets/avatars/Meshy_Merged_Animations.glb";
const avatar = new AvatarWalkController({
  scene,
  playerRoot,
  camera,
  glbUrl: avatarPath,
  faceFixYawRad: Math.PI, // set 0 if not backwards
  clipOverrides: { idle: null, walk: null, run: null }
});

// Hands (WebXR)
const hands = new XRHandsController({ renderer, playerRoot });

// Cards (demo card + play zones on the poker table)
const cards = new CardInteractions({ scene, camera, playerRoot, handsCtrl: hands });

const zoneMat = new THREE.MeshStandardMaterial({ color: 0x14142a, roughness: 0.95 });
const zone1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.36), zoneMat);
zone1.position.set(-0.28, 0.86, 0.0);
zone1.userData.zoneId = "table_slot_1";
scene.add(zone1);
cards.registerPlayZone(zone1, "table_slot_1");

const zone2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.36), zoneMat);
zone2.position.set(0.28, 0.86, 0.0);
zone2.userData.zoneId = "discard";
scene.add(zone2);
cards.registerPlayZone(zone2, "discard");

const cardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
const card1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.26), cardMat);
card1.rotation.x = -Math.PI/2;
card1.position.set(0, 0.87, -0.22);
scene.add(card1);
cards.registerCard(card1, "AS");

// Seating controller (for chairs; we’ll also use it for table seats if you want later)
const seating = new SeatingController({ scene, camera, playerRoot, avatarCtrl: avatar });

// --- Place 2 dev chairs near table (for testing) ---
const chair1 = world.createChair({ x: -1.0, z: 2.5, yaw: Math.PI });
const chair2 = world.createChair({ x:  1.0, z: 2.5, yaw: Math.PI });
seating.registerChair(chair1);
seating.registerChair(chair2);

// --- BOT: seated at poker table (static pose for now) ---
const gltfLoader = new GLTFLoader();
let seatedBotMixer = null;
let seatedBot = null;

async function spawnSeatedBot() {
  try {
    const gltf = await gltfLoader.loadAsync(avatarPath);
    seatedBot = gltf.scene;
    // Pick a "non-combat idle" if available
    if (gltf.animations && gltf.animations.length) {
      seatedBotMixer = new THREE.AnimationMixer(seatedBot);
      // Use same reject list and prefer idle
      const REJECT = ["fight","fighting","punch","box","boxing","kick","attack","combat","uppercut","jab","guard","block","stance"];
      const prefer = ["idle","breath","relax"];
      let best = null, bestScore = -1;
      for (const clip of gltf.animations) {
        const n = (clip.name || "").toLowerCase();
        if (!n) continue;
        if (REJECT.some(w => n.includes(w))) continue;
        let score = 0; for (const w of prefer) if (n.includes(w)) score++;
        if (score > bestScore && score > 0) { bestScore = score; best = clip; }
      }
      if (!best) best = gltf.animations.find(c => !REJECT.some(w => (c.name||"").toLowerCase().includes(w))) || gltf.animations[0];
      if (best) seatedBotMixer.clipAction(best).play();
    }

    // Seat position: use table seat anchor #1 (front)
    const seat0 = table.userData.seats?.[0];
    const hip = seat0?.getObjectByName("SeatAnchor");
    if (hip) {
      hip.add(seatedBot);
      seatedBot.position.set(0, 0, 0);
      seatedBot.rotation.set(0, 0, 0);
      seatedBot.scale.setScalar(1.0);
      // Slight forward/back tweak so it's not inside the backrest
      seatedBot.position.z -= 0.05;
    } else {
      // fallback: place near chair
      seatedBot.position.set(-0.7, 0, 0.9);
      scene.add(seatedBot);
    }
  } catch (e) {
    console.warn("Seated bot failed:", e);
  }
}

// --- BOT: display on pedestal ---
async function spawnDisplayBot() {
  const anchor = ped1.getObjectByName("PedestalAnchor");
  if (!anchor) return;
  try {
    const gltf = await gltfLoader.loadAsync("./assets/avatars/free_pack_male_base_mesh.glb");
    const bot = gltf.scene;
    bot.scale.setScalar(1.0);
    bot.rotation.y = Math.PI;
    anchor.add(bot);
  } catch (e) {
    console.warn("Display bot load failed:", e);
  }
}

// --- Display a second avatar on pedestal (female base mesh) ---
async function spawnSecondDisplay() {
  const anchor = ped2.getObjectByName("PedestalAnchor");
  if (!anchor) return;
  try {
    const gltf = await gltfLoader.loadAsync("./assets/avatars/free_pack_female_base_mesh.glb");
    const av = gltf.scene;
    av.scale.setScalar(1.0);
    av.rotation.y = Math.PI;
    anchor.add(av);
  } catch (e) {
    console.warn("Second display load failed:", e);
  }
}

spawnSeatedBot();
spawnDisplayBot();
spawnSecondDisplay();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function gatherDiagLines() {
  const session = renderer.xr.getSession();
  const xr = session ? "XR: ON" : "XR: OFF";
  const pos = playerRoot.position;
  const vel = avatar.velocity ? `${avatar.velocity.x.toFixed(2)},${avatar.velocity.z.toFixed(2)}` : "n/a";
  return [
    `Admin Dev World v2 (Poker Table + Bots)`,
    xr,
    `FPS: ${diag.fps}`,
    `PlayerRoot: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`,
    `Velocity XZ: (${vel})`,
    `Seated: ${seating.seated} | Locked: ${seating.movementLocked}`,
    `Controls: WASD move | Shift run | E grab | Q wave | C sit | V stand`,
    `Note: locomotion auto-avoids combat clips. If you still see "fighting stance", tell me the clip names and I'll lock exact overrides.`
  ];
}

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  diag.tick();

  input.update();

  // Seat controls
  if (input.sit) seating.trySit();
  if (input.stand) seating.stand();

  if (!seating.movementLocked) {
    avatar.setMoveInput(input.move.x, input.move.y);
    avatar.setRunHeld(input.run);
  } else {
    avatar.setMoveInput(0, 0);
    avatar.setRunHeld(false);
  }

  avatar.update(dt);
  hands.update(dt);

  if (seatedBotMixer) seatedBotMixer.update(dt);

  if (input.wave) hands.startWave(1.2);
  if (input.grab) cards.grabRightHand();
  if (input.release) cards.releaseHeld();

  seating.update(dt);

  // Soft collision: prevent walking through the poker table (no physics needed)
  // Table center is near (0, 0.2). Keep playerRoot outside a radius.
  const tx = 0.0, tz = 0.2;
  const dx = playerRoot.position.x - tx;
  const dz = playerRoot.position.z - tz;
  const r = 1.55; // approx table footprint radius
  const d = Math.hypot(dx, dz);
  if (d < r) {
    const k = (r / Math.max(d, 0.0001));
    playerRoot.position.x = tx + dx * k;
    playerRoot.position.z = tz + dz * k;
  }

  diag.render(gatherDiagLines());
  renderer.render(scene, camera);
});
