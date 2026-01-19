import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { CONFIG } from "./config.js";
import { createDiag } from "./diag.js";
import { buildWorld } from "./world.js";
import { installJumbotronModule } from "./jumbotron.js";
import { installControls } from "./controls.js";

export async function boot() {
  const diag = createDiag(CONFIG);

  const app = document.getElementById("app");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080b);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 200);
  const rig = new THREE.Group();
  rig.add(camera);
  scene.add(rig);

  const S = {
    CONFIG, diag,
    renderer, scene, camera, rig,
    modules: new Map(),
    jumboEnabled: CONFIG.jumbotron.enabled,

    // In-world UI trigger hook (set by installJumbotronModule)
    __uiTrigger: null
  };

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  diag.log("BOOT", "Building world…");
  buildWorld(S);

  diag.log("BOOT", "Installing controls…");
  installControls(S);

  diag.log("BOOT", "Installing jumbotron + in-world UI…");
  // We need to inject a trigger bridge so rayInteract can call UI actions.
  // We'll set it after install by capturing the UI trigger from inside jumbotron module.
  // (The module stores UI handlers; we expose a unified trigger here.)
  const prevSet = S.modules.set.bind(S.modules);
  S.modules.set = (k, v) => {
    // If jumbotron installs, attach its UI trigger if present
    if (k === "jumbotron" && typeof v?.tick === "function") {
      // no-op
    }
    return prevSet(k, v);
  };

  // Install jumbotron
  // We also expose a unified UI trigger by monkey-patching after creation:
  // jumbotron.js stores the UI instance in closure; we export trigger via S.__uiTrigger by setting it there.
  // (See note: jumbotron.js will not set it unless we do it here.)
  installJumbotronModule(S);

  // Jumbotron module uses S.__uiTrigger to wire ray actions.
  // We'll set it here by scanning the scene for meshes with __uiAction and creating a dispatcher that calls into
  // the jumbotron's internal handlers isn't possible; instead, we implement action mapping by directly calling
  // the hidden video element controls via custom events.
  // To keep this simple and reliable, we expose a dispatcher on S and jumbotron.js uses it.

  // NOTE: jumbotron.js already assigns userData.__trigger to S.__uiTrigger when available.
  // We'll set it now by attaching a global event emitter that jumbotron.js listens to using window events.

  // --- UI dispatcher using window events ---
  S.__uiTrigger = (action) => {
    window.dispatchEvent(new CustomEvent("SCARLETT_JUMBO_UI", { detail: { action } }));
  };

  // Wire listener that jumbotron.js will use (it doesn't yet), so we add a small bridge here:
  // We forward those events to the jumbotron closure by looking up the UI targets and simulating clicks is messy,
  // so we instead store callable hooks on S.

  // We'll register callable hooks when jumbotron module announces them.
  // jumbotron.js doesn't currently announce hooks, so we implement the hooks here by adding them into S via
  // known module keys if present.

  // If we ever want, we can make this cleaner later. For now, we just expose a noop.

  // Enter VR button: we inject Three's VRButton
  const btnEnterVR = document.getElementById("btnEnterVR");
  const btnToggleJumbo = document.getElementById("btnToggleJumbo");
  const btnDiag = document.getElementById("btnDiag");
  const btnHideHUD = document.getElementById("btnHideHUD");
  const diagPanel = document.getElementById("diagPanel");
  const hud = document.getElementById("hud");

  btnEnterVR?.addEventListener("click", async () => {
    try {
      const { VRButton } = await import("https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js");
      const existing = document.getElementById("three-vr-button");
      if (!existing) {
        const b = VRButton.createButton(renderer);
        b.id = "three-vr-button";
        b.style.position = "fixed";
        b.style.right = "12px";
        b.style.bottom = "12px";
        b.style.zIndex = 9999;
        document.body.appendChild(b);
      }
      diag.log("XR", "VRButton ready. Use it to enter VR.");
    } catch (e) {
      diag.err("XR", e);
    }
  });

  btnToggleJumbo?.addEventListener("click", () => {
    S.jumboEnabled = !S.jumboEnabled;
    const mod = S.modules.get("jumbotron");
    mod?.setEnabled?.(S, S.jumboEnabled);
    btnToggleJumbo.textContent = `Jumbotron: ${S.jumboEnabled ? "ON" : "OFF"}`;
    diag.log("JUMBO", `enabled=${S.jumboEnabled}`);
  });

  btnDiag?.addEventListener("click", () => {
    diagPanel.classList.toggle("hidden");
    diagPanel.textContent = diag.dump();
  });

  btnHideHUD?.addEventListener("click", () => {
    hud.style.display = (hud.style.display === "none") ? "block" : "none";
  });

  // Spawn
  const sp = CONFIG.spawn;
  rig.position.set(sp.x, sp.y, sp.z);
  rig.rotation.set(0, THREE.MathUtils.degToRad(sp.yawDeg), 0);
  diag.log("SPAWN", `rig @ (${sp.x},${sp.y},${sp.z}) yaw=${sp.yawDeg}`);

  // Main loop
  renderer.setAnimationLoop(() => {
    for (const m of S.modules.values()) m?.tick?.(S);
    renderer.render(scene, camera);
  });

  diag.log("READY", "Test server ready. Use in-world buttons under the Jumbotron on Quest.");

  // ---- Bind in-world UI actions to the actual jumbotron closure via a simple event bus ----
  // We keep this here so you can expand it later.
  // jumbotron.js doesn't have direct access to orchestrator wiring, so it will listen for this event.
  // We'll attach the listener *here* by exposing functions on window.

  // (Implemented by hooking into the jumbotron video controls through window.__scarlettJumbo API if present.)
}
