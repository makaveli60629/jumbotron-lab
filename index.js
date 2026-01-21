import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";

// Scarlett Avatar Lab — Lazy-Loaded Modules (Mode B)
// Goal: render something IMMEDIATELY, then lazy-load world + modules safely.

const $log = document.getElementById("hudlog");
function log(msg){
  try{
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if ($log){
      $log.textContent += "\n" + line;
      $log.scrollTop = $log.scrollHeight;
    }
    console.log(line);
  }catch(_){}
}

// Catch silent mobile errors
window.addEventListener("error", (e)=> log(`JS ERROR: ${e?.message || e}`));
window.addEventListener("unhandledrejection", (e)=> log(`PROMISE ERROR: ${e?.reason?.message || e?.reason || e}`));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.05, 2000);
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

const player = new THREE.Group();
player.add(camera);
scene.add(player);

// --- GUARANTEED VISUALS (draw immediately) ---
renderer.setClearColor(0x000000, 1);

const amb = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(amb);

const dir = new THREE.DirectionalLight(0xffffff, 0.85);
dir.position.set(5, 10, 7);
scene.add(dir);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200,200),
  new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 1.0, metalness: 0.0 })
);
floor.rotation.x = -Math.PI/2;
floor.position.y = 0;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, 0x00ffff, 0x223344);
grid.position.y = 0.001;
scene.add(grid);

const beacon = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0x00ffff, roughness: 0.4 })
);
beacon.position.set(0, 1.2, 0);
scene.add(beacon);

// Standing dev view default
player.position.set(0, 0, 8);
camera.position.set(0, 1.65, 0);

document.getElementById("app").appendChild(renderer.domElement);

// WebXR gating
async function setupVRButton(){
  if (!("xr" in navigator) || !navigator.xr){
    log("WebXR: NOT AVAILABLE in this browser. Non‑VR mode OK.");
    return;
  }
  try{
    const ok = await navigator.xr.isSessionSupported("immersive-vr");
    if (!ok){
      log("WebXR: immersive-vr NOT supported here. Use Quest Browser on headset.");
      return;
    }
    document.body.appendChild(VRButton.createButton(renderer));
    log("WebXR: VRButton ready.");
  }catch(err){
    log(`WebXR: check failed (${err?.message || err}).`);
  }
}
await setupVRButton();

// Lazy-load controls/world/modules AFTER first frame so we never black-screen
let controls = null;
let world = { update(){} };
let modules = [];

async function lazyBoot(){
  log("BOOT: Stage 1 OK (floor/grid/beacon). Lazy-loading systems…");

  // 1) Controls (lazy)
  try{
    const mod = await import("./core/android_controls.js");
    // supports either default export or named init
    controls = mod.default?.init?.({ THREE, camera, player, domElement: renderer.domElement, log }) 
            || mod.init?.({ THREE, camera, player, domElement: renderer.domElement, log })
            || mod.default
            || null;
    log("Controls: OK");
  }catch(err){
    log(`Controls: FAIL (${err?.message || err}). Movement may be disabled.`);
  }

  // 2) World (lazy with timeout)
  try{
    const { World } = await Promise.race([
      import("./js/world.js"),
      new Promise((_,rej)=> setTimeout(()=>rej(new Error("world.js import timeout (8s)")), 8000))
    ]);
    world = await Promise.race([
      World.init({ THREE, scene, renderer, camera, player, controls, log }),
      new Promise((_,rej)=> setTimeout(()=>rej(new Error("World.init timeout (8s)")), 8000))
    ]);
    log("World: OK");
  }catch(err){
    log(`World: FAIL (${err?.message || err}). Staying in SAFE MODE.`);
    world = { update(){} };
  }

  // 3) Modules registry (lazy; never blocks render)
  try{
    const reg = await import("./js/modules_registry.js");
    window.__scarlett_MODULES = reg.MODULES;
    window.__scarlett_reloadModules = async () => {
      for (const m of modules){ try{ m?.dispose?.(); }catch(_){} }
      modules = await reg.loadEnabledModules({ THREE, scene, renderer, camera, player, world, controls, log });
      log(`Modules loaded: ${modules.length}`);
    };
    await window.__scarlett_reloadModules();
    log("Modules: OK");
  }catch(err){
    log(`Modules: FAIL (${err?.message || err}).`);
  }

  log("BOOT: COMPLETE (Lazy Mode B).");
}

// Kick lazy boot after 1 rendered frame
let kicked = false;
renderer.setAnimationLoop((t)=>{
  // kick once
  if (!kicked){
    kicked = true;
    // defer boot to let the renderer present at least one frame
    setTimeout(lazyBoot, 0);
  }

  const dt = 0.016;
  try{
    if (controls?.update) controls.update(dt, t/1000);
  }catch(err){ log(`Controls update error: ${err?.message || err}`); controls = null; }

  try{
    if (world?.update) world.update(dt, t/1000);
  }catch(err){ log(`World update error: ${err?.message || err}`); world = { update(){} }; }

  for (const m of modules){
    try{ m?.update?.(dt, t/1000); }catch(err){ log(`Module update error: ${err?.message || err}`); }
  }

  renderer.render(scene, camera);
});

renderer.xr.addEventListener("sessionstart", ()=>{
  player.rotation.y = Math.PI;
  const hud = document.getElementById("hud");
  if (hud) hud.style.display = "none";
});

window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
