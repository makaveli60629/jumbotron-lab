// app.mjs — CDN mode with fallback (Cloudflare/CDN-friendly)
// Loads THREE + VRButton from a list of CDNs. No static imports.

async function importWithFallback(urls){
  let lastErr = null;
  for (const u of urls){
    try{
      const mod = await import(u);
      return mod;
    }catch(err){
      lastErr = err;
    }
  }
  throw lastErr || new Error("All CDN imports failed");
}

export async function start({ log } = {}){
  const THREE_CDNS = [
    "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "https://unpkg.com/three@0.160.0/build/three.module.js",
    "https://esm.sh/three@0.160.0"
  ];
  const VRBTN_CDNS = [
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js",
    "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js"
  ];

  log?.("CDN: loading THREE…");
  const THREE = await importWithFallback(THREE_CDNS);
  log?.("CDN: loading VRButton…");
  const { VRButton } = await importWithFallback(VRBTN_CDNS);

  const $log = document.getElementById("hudlog");
  function hud(msg){
    try{
      const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
      if ($log){
        if (!$log.__initDone){ $log.__initDone = true; $log.textContent = ""; }
        $log.textContent += line + "\n";
        $log.scrollTop = $log.scrollHeight;
      }
      console.log(line);
    }catch(_){}
  }
  if (!log) log = hud;

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

  // Guaranteed visuals
  renderer.setClearColor(0x000000, 1);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(5,10,7);
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

  player.position.set(0, 0, 8);
  camera.position.set(0, 1.65, 0);

  document.getElementById("app").appendChild(renderer.domElement);

  // WebXR gating
  async function setupVRButton(){
    if (!("xr" in navigator) || !navigator.xr){
      log("WebXR: NOT AVAILABLE (non-VR mode OK).");
      return;
    }
    try{
      const ok = await navigator.xr.isSessionSupported("immersive-vr");
      if (!ok){
        log("WebXR: immersive-vr NOT supported here.");
        return;
      }
      document.body.appendChild(VRButton.createButton(renderer));
      log("WebXR: VRButton ready.");
    }catch(err){
      log(`WebXR: check failed (${err?.message || err}).`);
    }
  }
  await setupVRButton();

  // Lazy-load controls/world/modules AFTER first frame
  let controls = null;
  let world = { update(){} };
  let modules = [];

  async function lazyBoot(){
    log("BOOT: Stage 1 OK (visuals). Loading controls/world/modules…");

    try{
      const mod = await import(`./core/android_controls.js?v=${Date.now()}`);
      controls = mod.default?.init?.({ THREE, camera, player, domElement: renderer.domElement, log })
              || mod.init?.({ THREE, camera, player, domElement: renderer.domElement, log })
              || mod.default
              || null;
      log("Controls: OK");
      try{ window.__scarlett_setJoystickVisible?.(true); }catch(_){ }

    }catch(err){
      log(`Controls: FAIL (${err?.message || err}).`);
    }

    try{
      const wmod = await import(`./js/world.js?v=${Date.now()}`);
      if (wmod?.World?.init){
        world = await wmod.World.init({ THREE, scene, renderer, camera, player, controls, log });
        log("World: OK");
      }else{
        log("World: missing World.init export (SAFE MODE).");
        world = { update(){} };
      }
    }catch(err){
      log(`World: FAIL (${err?.message || err}). SAFE MODE.`);
      world = { update(){} };
    }

    try{
      const reg = await import(`./js/modules_registry.js?v=${Date.now()}`);
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

    log("BOOT: COMPLETE.");
  }

  let kicked = false;
  renderer.setAnimationLoop((t)=>{
    if (!kicked){
      kicked = true;
      setTimeout(lazyBoot, 0);
    }

    const dt = 0.016;
    try{ controls?.update?.(dt, t/1000); }catch(err){ log(`Controls update error: ${err?.message || err}`); controls = null; }
    try{ world?.update?.(dt, t/1000); }catch(err){ log(`World update error: ${err?.message || err}`); world = { update(){} }; }
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

  log("Renderer: running.");
}