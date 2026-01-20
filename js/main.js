// NPC Bot Test - GitHub Pages Safe
// Uses CDN module imports (no importmap, no bare specifiers)

import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import { SkeletonUtils } from "https://unpkg.com/three@0.158.0/examples/jsm/utils/SkeletonUtils.js";
import { VRButton } from "https://unpkg.com/three@0.158.0/examples/jsm/webxr/VRButton.js";

import { BotManager } from "./bots.js";

const UI = {
  status: document.getElementById("status"),
  diag: document.getElementById("diag"),
  diagText: document.getElementById("diagText"),
  btnMouse: document.getElementById("btnMouse"),
  btnReset: document.getElementById("btnReset"),
  btnDiag: document.getElementById("btnDiag"),
};

function setStatus(msg) {
  if (UI.status) UI.status.textContent = msg;
}

// ---- Catch errors (so black screen always shows something) ----
window.addEventListener("error", (e) => {
  console.error(e?.error || e);
  setStatus("❌ Error: " + (e.message || "Unknown"));
  if (UI.diag) UI.diag.textContent += `\n[window.error] ${e.message || e}`;
});
window.addEventListener("unhandledrejection", (e) => {
  console.error(e?.reason || e);
  setStatus("❌ Promise Error: " + (e.reason?.message || String(e.reason)));
  if (UI.diag) UI.diag.textContent += `\n[unhandledrejection] ${e.reason?.message || e.reason}`;
});

// ---- Renderer / Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 500);
camera.position.set(0, 1.7, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// XR button
try {
  document.body.appendChild(VRButton.createButton(renderer));
} catch (e) {
  console.warn("VRButton error", e);
}

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x101018, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 1.25);
dir.position.set(6, 10, 6);
dir.castShadow = true;
dir.shadow.mapSize.set(1024, 1024);
scene.add(dir);

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x0b0e16, roughness: 1, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Big centerpiece table
const tableGroup = new THREE.Group();
const tableTop = new THREE.Mesh(
  new THREE.CylinderGeometry(2.2, 2.2, 0.18, 48),
  new THREE.MeshStandardMaterial({ color: 0x1a6b3a, roughness: 0.85, metalness: 0.05 })
);
tableTop.position.y = 1.0;
tableTop.castShadow = true;
tableTop.receiveShadow = true;
tableGroup.add(tableTop);

const tableEdge = new THREE.Mesh(
  new THREE.TorusGeometry(2.25, 0.12, 16, 64),
  new THREE.MeshStandardMaterial({ color: 0x2a1b12, roughness: 0.6, metalness: 0.15 })
);
tableEdge.position.y = 1.05;
tableEdge.rotation.x = Math.PI / 2;
tableEdge.castShadow = true;
tableGroup.add(tableEdge);

for (let i = 0; i < 4; i++) {
  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 1.0, 18),
    new THREE.MeshStandardMaterial({ color: 0x22160f, roughness: 0.8, metalness: 0.1 })
  );
  const a = (i / 4) * Math.PI * 2;
  leg.position.set(Math.cos(a) * 0.9, 0.5, Math.sin(a) * 0.9);
  leg.castShadow = true;
  leg.receiveShadow = true;
  tableGroup.add(leg);
}
scene.add(tableGroup);

// Pedestal for "display" avatar
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.6, 0.7, 0.6, 24),
  new THREE.MeshStandardMaterial({ color: 0x202431, roughness: 0.8, metalness: 0.1 })
);
pedestal.position.set(-4, 0.3, 0);
pedestal.castShadow = true;
pedestal.receiveShadow = true;
scene.add(pedestal);

// Simple "stage" ring
const stage = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 1.2, 48),
  new THREE.MeshStandardMaterial({ color: 0x0f1420, roughness: 1, metalness: 0 })
);
stage.position.set(-4, 0.01, 0);
stage.rotation.x = -Math.PI / 2;
scene.add(stage);

// ---- Load avatars ----
const loader = new GLTFLoader();

async function loadGLB(url) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    );
  });
}

async function boot() {
  setStatus("Booting…");

  // Display avatar
  try {
    const displayGLB = await loadGLB("./assets/avatars/Character_output.glb");
    const display = displayGLB.scene;
    display.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) o.material.side = THREE.DoubleSide;
      }
    });
    display.position.set(-4, 0.6, 0);
    display.scale.setScalar(1.0);
    // face toward center
    display.rotation.y = Math.PI / 2;
    scene.add(display);
  } catch (e) {
    console.warn("Display avatar failed", e);
    if (UI.diag) UI.diag.textContent += `\nDisplay avatar load failed: ${e?.message || e}`;
  }

  // Bot manager
  const navTargets = [];
  // orbit points around table
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    navTargets.push(new THREE.Vector3(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2));
  }

  const bots = new BotManager({
    scene,
    THREE,
    GLTFLoader,
    SkeletonUtils,
    navTargets,
    debug: false,
  });

  try {
    await bots.spawnBots({
      avatarUrl: "./assets/avatars/Meshy_Merged_Animations.glb",
      count: 1,
      startPositions: [new THREE.Vector3(0, 0, -3.2)],
      scale: 1.0,
      speed: 1.0,
      forwardFlip: false, // set true if you see backwards walking
    });
  } catch (e) {
    console.error("Bot spawn failed", e);
    if (UI.diag) UI.diag.textContent += `\nBot spawn failed: ${e?.message || e}`;
  }

  // ---- Controls ----
  const keys = new Set();
  window.addEventListener("keydown", (e) => keys.add(e.code));
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  let mouseLook = false;
  let yaw = 0;
  let pitch = 0;

  function setMouseLook(on) {
    mouseLook = on;
    if (UI.btnMouse) UI.btnMouse.textContent = on ? "Disable Mouse Look" : "Enable Mouse Look";
  }

  UI.btnMouse?.addEventListener("click", async () => {
    if (!mouseLook) {
      try {
        await renderer.domElement.requestPointerLock();
        setMouseLook(true);
      } catch (_) {
        setMouseLook(true);
      }
    } else {
      document.exitPointerLock?.();
      setMouseLook(false);
    }
  });

  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement) setMouseLook(false);
  });

  window.addEventListener("mousemove", (e) => {
    if (!mouseLook) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    yaw -= dx * 0.0022;
    pitch -= dy * 0.0022;
    pitch = Math.max(-1.2, Math.min(1.2, pitch));
  });

  function resetPosition() {
    camera.position.set(0, 1.7, 6);
    yaw = 0;
    pitch = 0;
  }
  UI.btnReset?.addEventListener("click", resetPosition);

  let showDiag = true;
  UI.btnDiag?.addEventListener("click", () => {
    showDiag = !showDiag;
    if (UI.diag) UI.diag.style.display = showDiag ? "block" : "none";
  });

  // ---- Diagnostics / FPS ----
  let last = performance.now();
  let frames = 0;
  let fps = 0;

  const clock = new THREE.Clock();

  function animate() {
    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();

      // movement
      const moveSpeed = (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 4.0 : 2.2;
      const v = moveSpeed * dt;

      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);

      if (keys.has("KeyW")) camera.position.addScaledVector(forward, -v);
      if (keys.has("KeyS")) camera.position.addScaledVector(forward, v);
      if (keys.has("KeyA")) camera.position.addScaledVector(right, -v);
      if (keys.has("KeyD")) camera.position.addScaledVector(right, v);
      if (keys.has("Space")) camera.position.y += v;
      if (keys.has("KeyC")) camera.position.y -= v;

      // apply look
      camera.rotation.set(pitch, yaw, 0, "YXZ");

      bots.update(dt);

      renderer.render(scene, camera);

      // fps
      frames++;
      const now = performance.now();
      if (now - last > 500) {
        fps = Math.round((frames * 1000) / (now - last));
        frames = 0;
        last = now;
      }

      if (UI.diagText && showDiag) {
        const xr = renderer.xr.isPresenting ? "ON" : "OFF";
        UI.diagText.textContent =
          `FPS: ${fps}\n` +
          `XR: ${xr}\n` +
          `Cam: x=${camera.position.x.toFixed(2)} y=${camera.position.y.toFixed(2)} z=${camera.position.z.toFixed(2)}\n` +
          `GLB Display: ./assets/avatars/Character_output.glb\n` +
          `GLB Bot: ./assets/avatars/Meshy_Merged_Animations.glb\n` +
          `Tip: If bot walks backwards, set forwardFlip:true in main.js`;
      }

      // UI has no separate boot element; status text is enough.
      setStatus("Ready");
    });
  }

  animate();
}

boot();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
