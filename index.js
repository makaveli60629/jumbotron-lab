import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./js/world.js";
import { loadEnabledModules } from "./js/modules_registry.js";
import { AndroidControls } from "./core/android_controls.js";

// ---------- Diagnostics helpers ----------
const hud = document.getElementById("hud");
const hudlog = document.getElementById("hudlog");
const statline = document.getElementById("statline");
const avatarUrlInput = document.getElementById("avatarUrl");

function log(msg){
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  hudlog.textContent = (hudlog.textContent + "\n" + line).slice(-8000);
  hudlog.scrollTop = hudlog.scrollHeight;
  console.log(line);
}

// ---------- Core Three setup ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

document.getElementById("app").appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Player rig (move this, not the camera directly)
const player = new THREE.Group();
player.add(camera);
scene.add(player);

// Spawn facing forward; world can adjust
player.position.set(0, 0, 6);
camera.position.set(0, 1.65, 0);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Controls ----------
const controls = new AndroidControls({ player, camera, dom: renderer.domElement, log });

// ---------- World ----------
const world = await World.init({ THREE, scene, renderer, camera, player, controls, log });

// ---------- Modules ----------
let modules = [];
async function reloadModules(){
  try{
    modules = await loadEnabledModules({ THREE, scene, renderer, camera, player, world, controls, log });
    log(`Modules loaded: ${modules.length}`);
  }catch(err){
    log(`MODULE LOAD ERROR: ${err?.message || err}`);
  }
}
await reloadModules();

// ---------- UI buttons ----------
document.getElementById("btnHideHud").onclick = () => { hud.style.display = "none"; };
document.getElementById("btnReloadModules").onclick = async () => { log("Reloading modules…"); await reloadModules(); };
document.getElementById("btnLoadAvatar").onclick = async () => {
  const url = avatarUrlInput.value.trim();
  await world.avatar.load(url || "./assets/avatar.glb", { resetPose: true });
};

// Auto-hide HUD on VR entry (fixes “dark hud” / “dark hug”)
renderer.xr.addEventListener("sessionstart", () => {
  log("XR session started — hiding HUD, flipping player 180°.");
  player.rotation.y = Math.PI;   // face table/preview by default
  hud.style.display = "none";
});

// ---------- Main Loop ----------
let lastT = performance.now();
let fpsAcc = 0, fpsCount = 0, fps = 0;

renderer.setAnimationLoop((t) => {
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;

  // controls + world + modules
  controls.update(dt, t/1000);
  world.update(dt, t/1000);
  for (const m of modules) m?.update?.(dt, t/1000);

  renderer.render(scene, camera);

  // FPS calc (lightweight)
  fpsAcc += dt; fpsCount++;
  if (fpsAcc >= 0.5){
    fps = Math.round(fpsCount / fpsAcc);
    fpsAcc = 0; fpsCount = 0;
    const p = player.position;
    statline.textContent = `FPS ${fps} | pos ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} | XR ${renderer.xr.isPresenting ? "ON" : "OFF"}`;
  }
});

log("Boot complete. If you see black screen: open DevTools console / Android Chrome remote inspect.");
