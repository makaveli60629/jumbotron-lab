import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { World } from "./js/world.js";
import { loadEnabledModules } from "./js/modules_registry.js";
import { AndroidControls } from "./core/android_controls.js";

const hud = document.getElementById("hud");
const hudlog = document.getElementById("hudlog");
const statline = document.getElementById("statline");

const avatarUrlInput = document.getElementById("avatarUrl");
const scaleSlider = document.getElementById("scaleSlider");
const yawSlider = document.getElementById("yawSlider");
const ySlider = document.getElementById("ySlider");
const scaleVal = document.getElementById("scaleVal");
const yawVal = document.getElementById("yawVal");
const yVal = document.getElementById("yVal");

function log(msg){
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  hudlog.textContent = (hudlog.textContent + "\n" + line).slice(-9000);
  hudlog.scrollTop = hudlog.scrollHeight;
  console.log(line);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

document.getElementById("app").appendChild(renderer.domElement);

async function setupVRButton(){
  if (!("xr" in navigator) || !navigator.xr){
    log("WebXR: NOT AVAILABLE in this browser (Android Chrome often shows this). Non‑VR mode will still work.");
    return;
  }
  try{
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    if (!ok){
      log("WebXR: immersive-vr NOT supported here. Use Quest Browser on headset, or ensure HTTPS + WebXR enabled.");
      return;
    }
    document.body.appendChild(VRButton.createButton(renderer));
    log("WebXR: immersive-vr supported. VRButton ready.");
  }catch(err){
    log(`WebXR: check failed (${err?.message || err}). Running non‑VR mode.`);
  }
}

await setupVRButton();

const player = new THREE.Group();
player.add(camera);
scene.add(player);

player.position.set(0, 0, 6);
camera.position.set(0, 1.65, 0);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const controls = new AndroidControls({ player, camera, dom: renderer.domElement, log });
const world = await World.init({ THREE, scene, renderer, camera, player, controls, log });

let modules = [];
async function reloadModules(){
  modules = await loadEnabledModules({ THREE, scene, renderer, camera, player, world, controls, log });
  log(`Modules loaded: ${modules.length}`);
}
await reloadModules();

// ---- UI wiring ----
document.getElementById("btnHideHud").onclick = () => { hud.style.display = "none"; };
document.getElementById("btnReloadModules").onclick = async () => { log("Reloading modules…"); await reloadModules(); };

document.getElementById("btnLoadAvatar").onclick = async () => {
  const url = avatarUrlInput.value.trim();
  await world.avatar.load(url || "./assets/avatar.glb", { resetPose: true }).catch(err => log(`AVATAR ERROR: ${err?.message || err}`));
  // sync sliders to current
  const t = world.avatar.getTuning();
  scaleSlider.value = t.scale.toFixed(2);
  yawSlider.value = String(Math.round(THREE.MathUtils.radToDeg(t.yaw)));
  ySlider.value = t.y.toFixed(2);
  updateLabels();
};

document.getElementById("btnToggleSkeleton").onclick = () => {
  const on = world.avatar.toggleSkeleton();
  log(`Skeleton: ${on ? "ON" : "OFF"}`);
};

document.getElementById("btnResetAvatar").onclick = () => {
  world.avatar.resetTuning();
  const t = world.avatar.getTuning();
  scaleSlider.value = t.scale.toFixed(2);
  yawSlider.value = String(Math.round(THREE.MathUtils.radToDeg(t.yaw)));
  ySlider.value = t.y.toFixed(2);
  updateLabels();
  log("Avatar tuning reset.");
};

function updateLabels(){
  scaleVal.textContent = Number(scaleSlider.value).toFixed(2);
  yawVal.textContent = `${Math.round(Number(yawSlider.value))}°`;
  yVal.textContent = Number(ySlider.value).toFixed(2);
}
updateLabels();

scaleSlider.addEventListener("input", () => {
  updateLabels();
  world.avatar.setScale(Number(scaleSlider.value));
});

yawSlider.addEventListener("input", () => {
  updateLabels();
  world.avatar.setYawDeg(Number(yawSlider.value));
});

ySlider.addEventListener("input", () => {
  updateLabels();
  world.avatar.setY(Number(ySlider.value));
});

renderer.xr.addEventListener("sessionstart", () => {
  log("XR session started — hiding HUD, flipping player 180°.");
  player.rotation.y = Math.PI;
  hud.style.display = "none";
});

let lastT = performance.now();
let fpsAcc = 0, fpsCount = 0;

renderer.setAnimationLoop((t) => {
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;

  controls.update(dt, t/1000);
  world.update(dt, t/1000);
  for (const m of modules) m?.update?.(dt, t/1000);

  renderer.render(scene, camera);

  fpsAcc += dt; fpsCount++;
  if (fpsAcc >= 0.5){
    const fps = Math.round(fpsCount / fpsAcc);
    fpsAcc = 0; fpsCount = 0;
    const p = player.position;
    statline.textContent = `FPS ${fps} | pos ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} | XR ${renderer.xr.isPresenting ? "ON" : "OFF"}`;
  }
});

log("Boot complete. Tip: do NOT run from file:// — use GitHub Pages or any HTTP server.");
