import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// Jumbotron video texture + in-world laser-clickable controls
export function installJumbotronModule(S) {
  const cfg = S.CONFIG.jumbotron;

  // --- Video element (hidden) ---
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.muted = !!cfg.muted;
  video.volume = clamp01(cfg.volume ?? 0.9);
  video.loop = false;
  video.preload = "auto";
  video.setAttribute("webkit-playsinline", "true");

  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "-9999px";
  document.body.appendChild(video);

  const vtex = new THREE.VideoTexture(video);
  vtex.colorSpace = THREE.SRGBColorSpace;
  vtex.minFilter = THREE.LinearFilter;
  vtex.magFilter = THREE.LinearFilter;

  // --- Jumbotron ---
  const jumbo = new THREE.Group();
  jumbo.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
  S.scene.add(jumbo);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(cfg.size.w, cfg.size.h),
    new THREE.MeshBasicMaterial({ map: vtex })
  );
  jumbo.add(screen);

  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(cfg.size.w + 0.25, cfg.size.h + 0.25),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.9 })
  );
  frame.position.z = -0.02;
  jumbo.add(frame);

  jumbo.visible = !!S.jumboEnabled;

  // --- In-world control panel ---
  const panel = new THREE.Group();
  panel.position.set(cfg.panel.position.x, cfg.panel.position.y, cfg.panel.position.z);
  panel.scale.setScalar(cfg.panel.scale ?? 1.0);
  S.scene.add(panel);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness: 0.9, metalness: 0.0, transparent: true, opacity: 0.85 })
  );
  plate.position.z = -0.01;
  panel.add(plate);

  const ui = makeUI(panel);

  // Channels
  const channels = Array.isArray(cfg.channels) ? cfg.channels.filter(c => c && c.url && (c.type || "hls") !== "youtube") : [];
  let idx = clampInt(cfg.startIndex ?? 0, 0, Math.max(0, channels.length - 1));
  let loadedUrl = "";

  function currentName() {
    if (!channels.length) return "No channels";
    return `${channels[idx].name || ("Channel " + (idx+1))}`;
  }

  function refreshStatus(extra = "") {
    const s1 = `CH ${channels.length ? (idx+1) : 0}/${channels.length} • ${currentName()}`;
    const s2 = extra || (video.paused ? "Paused" : "Playing");
    ui.setStatus(s1, s2);
  }

  async function load() {
    if (!channels.length) {
      S.diag.warn("JUMBO", "No channels configured.");
      refreshStatus("No channels");
      return;
    }

    const ch = channels[idx];
    try { video.pause(); } catch {}
    try { video.removeAttribute("src"); video.load(); } catch {}

    loadedUrl = ch.url;
    video.src = ch.url;

    S.diag.log("JUMBO", `Loaded [${idx}] ${ch.name || "Channel"} :: ${ch.url}`);
    refreshStatus("Loaded");
  }

  async function play() {
    if (!loadedUrl) await load();
    try {
      await video.play();
      S.diag.log("JUMBO", "Play");
      refreshStatus("Playing");
    } catch (e) {
      S.diag.err("JUMBO_PLAY", e);
      refreshStatus("Play blocked (gesture/CORS)");
    }
  }

  async function stop() {
    try {
      video.pause();
      video.currentTime = 0;
      S.diag.log("JUMBO", "Stop");
      refreshStatus("Stopped");
    } catch (e) {
      S.diag.err("JUMBO_STOP", e);
    }
  }

  async function prev() {
    if (!channels.length) return;
    idx = (idx - 1 + channels.length) % channels.length;
    refreshStatus("Selected");
  }

  async function next() {
    if (!channels.length) return;
    idx = (idx + 1) % channels.length;
    refreshStatus("Selected");
  }

  // Hook UI actions
  ui.on("prev", async () => { await prev(); });
  ui.on("next", async () => { await next(); });
  ui.on("load", async () => { await load(); });
  ui.on("play", async () => { await play(); });
  ui.on("stop", async () => { await stop(); });

  // Default state
  refreshStatus("Ready");

  // Events
  video.addEventListener("error", () => {
    S.diag.warn("JUMBO", "Video error (URL/CORS/format)." );
    refreshStatus("Video error (CORS/format)");
  });
  video.addEventListener("playing", () => refreshStatus("Playing"));
  video.addEventListener("pause", () => refreshStatus("Paused"));


  // Expose simple global hooks (lets orchestrator / other modules trigger without HTML HUD)
  window.__scarlettJumbo = {
    prev: () => prev(),
    next: () => next(),
    load: () => load(),
    play: () => play(),
    stop: () => stop(),
    select: (i) => { idx = Math.max(0, Math.min(i|0, Math.max(0, channels.length-1))); refreshStatus('Selected'); }
  };

  // In-world buttons dispatch through this event
  window.addEventListener('SCARLETT_JUMBO_UI', (ev) => {
    const a = ev?.detail?.action;
    if (!a) return;
    if (a === 'prev') prev();
    else if (a === 'next') next();
    else if (a === 'load') load();
    else if (a === 'play') play();
    else if (a === 'stop') stop();
  });

  // Register module
  const api = {
    setEnabled: (_S, enabled) => { jumbo.visible = !!enabled; panel.visible = !!enabled; },
    tick: () => {}
  };
  S.modules.set("jumbotron", api);
  S.diag.log("MOD", "Jumbotron + in-world channel controls installed.");

  // Auto-load first channel so the user can just hit Play in-world
  load().catch(() => {});

  // ---- In-world ray interaction (Quest controllers + desktop mouse) ----
  installRayInteract(S, ui.getTargets());
}

function makeUI(parent) {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);
  parent.add(group);

  const handlers = new Map();
  const targets = [];

  // Status canvas (two lines)
  const status = makeLabelMesh(2.55, 0.28, "…", "…");
  status.mesh.position.set(0, 0.30, 0.01);
  group.add(status.mesh);

  const setStatus = (line1, line2) => status.setText(line1, line2);

  // Buttons row
  const buttons = [
    { id: "prev", label: "PREV",  x: -0.95 },
    { id: "next", label: "NEXT",  x: -0.35 },
    { id: "load", label: "LOAD",  x:  0.25 },
    { id: "play", label: "PLAY",  x:  0.85 }
  ];

  buttons.forEach(b => {
    const btn = makeButtonMesh(0.52, 0.22, b.label);
    btn.mesh.position.set(b.x, 0.02, 0.02);
    btn.mesh.userData.__uiAction = b.id;
    group.add(btn.mesh);
    targets.push(btn.mesh);
  });

  const stopBtn = makeButtonMesh(2.15, 0.22, "STOP");
  stopBtn.mesh.position.set(0, -0.25, 0.02);
  stopBtn.mesh.userData.__uiAction = "stop";
  group.add(stopBtn.mesh);
  targets.push(stopBtn.mesh);

  function on(id, fn) { handlers.set(id, fn); }
  function trigger(id) { const fn = handlers.get(id); if (fn) fn(); }

  return {
    on,
    trigger,
    setStatus,
    getTargets: () => targets
  };
}

function makeButtonMesh(w, h, text) {
  const { canvas, ctx, texture } = makeCanvasTexture(512, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );

  function draw(active = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    roundRect(ctx, 18, 18, canvas.width - 36, canvas.height - 36, 26);
    ctx.fillStyle = active ? "rgba(56,189,248,0.35)" : "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.stroke();

    ctx.fillStyle = "#eaeaea";
    ctx.font = "bold 86px system-ui, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

    texture.needsUpdate = true;
  }
  draw(false);

  return {
    mesh,
    setActive: (v) => draw(!!v)
  };
}

function makeLabelMesh(w, h, line1, line2) {
  const { canvas, ctx, texture } = makeCanvasTexture(1024, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );

  function draw(a, b) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    roundRect(ctx, 18, 18, canvas.width - 36, canvas.height - 36, 26);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.stroke();

    ctx.fillStyle = "#eaeaea";
    ctx.font = "bold 56px system-ui, Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(String(a || ""), 44, 78);

    ctx.fillStyle = "rgba(234,234,234,0.92)";
    ctx.font = "36px system-ui, Arial";
    ctx.fillText(String(b || ""), 44, 170);

    texture.needsUpdate = true;
  }

  draw(line1, line2);

  return { mesh, setText: draw };
}

function makeCanvasTexture(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, texture };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function installRayInteract(S, targets) {
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();

  // XR Controllers
  const c0 = S.renderer.xr.getController(0);
  const c1 = S.renderer.xr.getController(1);
  S.scene.add(c0);
  S.scene.add(c1);

  const lineGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
  const line0 = new THREE.Line(lineGeom, lineMat);
  line0.name = "ray";
  line0.scale.z = 6;
  c0.add(line0);

  const line1 = new THREE.Line(lineGeom, lineMat);
  line1.name = "ray";
  line1.scale.z = 6;
  c1.add(line1);

  function castFrom(controller) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    const hits = raycaster.intersectObjects(targets, false);
    return hits[0] || null;
  }

  function onSelectStart(e) {
    const hit = castFrom(e.target);
    if (!hit) return;
    const action = hit.object.userData.__uiAction;
    if (!action) return;
    // Find the ui trigger by walking up to the module (stored globally by closure isn't exposed)
    // We stored the trigger handler on the mesh itself via userData hook below.
    const trigger = hit.object.userData.__trigger;
    if (typeof trigger === "function") trigger(action);
  }

  // Attach trigger function to each target so we don't need globals
  // We can locate the module UI trigger by capturing it from jumbotron install via S.modules? not stored.
  // So we pass it through S.__uiTrigger when available.
  // If missing, we do nothing.
  const uiTrigger = () => {};
  // We'll overwrite below using a small hack: the orchestrator sets S.__uiTrigger if present.

  // We'll set per-target trigger in next tick once S.__uiTrigger exists.
  let wired = false;

  S.modules.set("rayInteract", {
    tick: (S) => {
      if (!wired && typeof S.__uiTrigger === "function") {
        targets.forEach(t => { t.userData.__trigger = S.__uiTrigger; });
        wired = true;
      }
    }
  });

  c0.addEventListener("selectstart", onSelectStart);
  c1.addEventListener("selectstart", onSelectStart);

  // Desktop click support (for quick testing)
  const canvas = S.renderer.domElement;
  canvas.addEventListener("pointerdown", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const mx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera({ x: mx, y: my }, S.camera);
    const hits = raycaster.intersectObjects(targets, false);
    const hit = hits[0];
    if (!hit) return;
    const action = hit.object.userData.__uiAction;
    if (!action) return;
    const trigger = hit.object.userData.__trigger;
    if (typeof trigger === "function") trigger(action);
  });
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function clampInt(v, a, b) { v = (v|0); return Math.max(a, Math.min(b, v)); }
