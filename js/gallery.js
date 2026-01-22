// Scarlett Gallery v2
// - 2 display pedestals (male + female)
// - 1 outfit stand (viewable on Android + Quest)
// - 1 walking NPC (3rd avatar)
// - "Wear Outfit" attempts to attach outfit to the female avatar's hips (best-effort).

const $ = (id) => document.getElementById(id);

const logEl = $("log");
window.__scarlettLogs = window.__scarlettLogs || [];
function log(msg){
  const t = new Date().toLocaleTimeString();
  const line = `[${t}] ${msg}`;
  window.__scarlettLogs.push(line);
  if (window.__scarlettLogs.length > 400) window.__scarlettLogs.shift();
  if (logEl) {
    logEl.textContent = window.__scarlettLogs.slice(-60).join("\n");
    logEl.scrollTop = logEl.scrollHeight;
  }
  console.log(line);
}

function uniq(arr){ return [...new Set(arr.filter(Boolean))]; }

// --- Asset lists (use your folders exactly as shown in your screenshots) ---
const maleList = uniq([
  "assets/avatars/male.glb",
  "assets/models/male_mesh.glb",
  "assets/models/free_pack_male_base_mesh.glb",
  "assets/models/base_male_body_meshy.glb",
  "assets/avatars/free_pack_male_base_mesh.glb",
  "assets/avatars/male_mesh.glb",
]);

const femaleList = uniq([
  "assets/avatars/female.glb",
  "assets/avatars/free_pack_female_base_mesh.glb",
  "assets/models/free_pack_female_base_mesh.glb",
  "assets/avatars/Character_output.glb",
]);

const npcList = uniq([
  "assets/avatars/ninja.glb",
  "assets/models/combat_ninja_inspired_by_jin_roh_wolf_brigade.glb",
  // extra NPCs you may drop into assets/avatars/
  "assets/avatars/Meshy_Merged_Animations.glb",
  "assets/avatars/Character_output.glb",
]);

const outfitList = uniq([
  "assets/clothes/futuristic_apocalypse_female_cargo_pants.glb",
]);

let idxMale = 0;
let idxFemale = 0;
let idxNPC = 0;
let idxOutfit = 0;

const maleEnt = $("maleDisplay");
const femaleEnt = $("femaleDisplay");
const npcEnt = $("npcWalker");
const npcDisplayEnt = document.getElementById("npcDisplay") || null;
const btnNextNPC = document.getElementById("btnNextNPC") || null;
const outfitEnt = $("outfitDisplay");

let femaleModel3D = null;
let outfitModel3D = null;

function setGLB(ent, url){
  return new Promise((resolve) => {
    // Clear first so model-loaded fires again reliably
    ent.removeAttribute("gltf-model");
    ent.setAttribute("gltf-model", url);
    const onLoaded = (e) => {
      ent.removeEventListener("model-loaded", onLoaded);
      resolve(e.detail.model);
    };
    const onErr = (e) => {
      ent.removeEventListener("model-error", onErr);
      resolve(null);
    };
    ent.addEventListener("model-loaded", onLoaded);
    ent.addEventListener("model-error", onErr, { once:true });
  });
}

function bestClipName(model){
  // A-Frame extras animation-mixer uses clip name. We try to pick "walk" over "fight/box".
  const mixer = model?.animations ? model.animations : [];
  const names = mixer.map(a => a?.name || "").filter(Boolean);
  const lower = names.map(n => n.toLowerCase());
  const pick = (needle) => {
    const i = lower.findIndex(n => n.includes(needle));
    return i >= 0 ? names[i] : null;
  };
  return pick("walk") || pick("run") || pick("idle") || pick("stand") || (names[0] || null);
}

function fitModel(ent, model, {targetHeight=1.55, y=0, rotY=0}={}){
  if(!model) return;
  // compute bounding box
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = Math.max(0.0001, size.y);
  const s = targetHeight / h;

  ent.object3D.scale.setScalar(s);

  // center horizontally
  const box2 = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box2.getCenter(center);

  // move model so it stands on pedestal top
  // We shift the entity position by adjusting its object3D children (model) position.
  model.position.x -= center.x;
  model.position.z -= center.z;

  // bring feet to y=0 relative
  const box3 = new THREE.Box3().setFromObject(model);
  // three.js Box3 exposes .min/.max (no getMin)
  model.position.y -= (box3.min ? box3.min.y : 0);

  // apply y offset and rotation
  ent.object3D.position.y = y;
  ent.object3D.rotation.set(0, THREE.MathUtils.degToRad(rotY), 0);
}

async function loadMale(){
  const url = maleList[idxMale % maleList.length];
  log(`[MALE] Loading ${url}`);
  const model = await setGLB(maleEnt, url);
  if(!model){ log(`[MALE] Failed to load ${url}`); return; }
  fitModel(maleEnt, model, {targetHeight:1.55, y:0.5, rotY:20});
}

async function loadFemale(){
  const url = femaleList[idxFemale % femaleList.length];
  log(`[FEMALE] Loading ${url}`);
  const model = await setGLB(femaleEnt, url);
  if(!model){ log(`[FEMALE] Failed to load ${url}`); femaleModel3D=null; return; }
  femaleModel3D = model;
  fitModel(femaleEnt, model, {targetHeight:1.55, y:0.5, rotY:-20});
}

async function loadOutfit(){
  const url = outfitList[idxOutfit % outfitList.length];
  log(`[OUTFIT] Loading ${url}`);
  const model = await setGLB(outfitEnt, url);
  if(!model){ log(`[OUTFIT] Failed to load ${url}`); outfitModel3D=null; return; }
  outfitModel3D = model;
  // outfit is a standalone mesh, so just display it nicely
  fitModel(outfitEnt, model, {targetHeight:1.2, y:0.55, rotY:180});
}

async function loadNPC(){
  const url = npcList[idxNPC % npcList.length];
  log(`[NPC] Loading ${url}`);
  const model = await setGLB(npcEnt, url);
  if(!model){ log(`[NPC] Failed to load ${url}`); return; }

  // Fit and enable animation-mixer (prefer walk/idle)
  fitModel(npcEnt, model, {targetHeight:1.75, y:0.0, rotY:0});

  // ALSO show the same NPC on a 3rd pedestal (static preview) if the entity exists.
  // This lets you see: Male pedestal + Female pedestal + NPC pedestal + NPC walking.
  if (npcDisplayEnt){
    const dModel = await setGLB(npcDisplayEnt, url);
    if(dModel){
      fitModel(npcDisplayEnt, dModel, {targetHeight:1.65, y:0.0, rotY:180});
      npcDisplayEnt.removeAttribute("animation-mixer");
    }
  }

  const clip = bestClipName(model);
  if(clip){
    // Force loop; if it's a fight clip, it will still play, but we try to avoid that by clip selection.
    npcEnt.setAttribute("animation-mixer", `clip: ${clip}; loop: repeat; timeScale: 1`);
    log(`[NPC] Playing clip: ${clip}`);
  } else {
    npcEnt.removeAttribute("animation-mixer");
    log(`[NPC] No animation clips found; will still walk (movement only).`);
  }
}

// --- Wear Outfit (best-effort attach) ---
function findBoneByName(root, names){
  if(!root) return null;
  const wanted = (names||[]).map(n => String(n).toLowerCase());
  let found = null;
  root.traverse(o=>{
    if(found) return;
    if(o.isBone){
      const nm = String(o.name||"").toLowerCase();
      if(wanted.includes(nm)) found = o;
    }
  });
  if(found) return found;
  // fallback fuzzy
  root.traverse(o=>{
    if(found) return;
    if(o.isBone){
      const nm = String(o.name||"").toLowerCase();
      if(/hip|pelvis/.test(nm)) found = o;
    }
  });
  return found;
}

function wearOutfit(){
  if(!femaleModel3D || !outfitModel3D){
    log("[WEAR] Need female + outfit loaded first.");
    return;
  }

  // IMPORTANT: If the clothing is NOT skinned/rigged to the same armature,
  // true deformation-binding is impossible. We do a practical parent-attach to hips.
  const hips = findBoneByName(femaleModel3D, ["hips", "pelvis", "mixamorig:hips", "mixamorig_hips"]);
  const target = hips || femaleModel3D;

  // Clone outfit model so the pedestal version stays visible
  const outfitClone = outfitModel3D.clone(true);

  // Remove any previous attached outfit
  const prev = target.getObjectByName("__scarlett_outfit__");
  if(prev) target.remove(prev);

  outfitClone.name = "__scarlett_outfit__";

  // --- auto-fit: scale + align outfit to the avatar around hips ---
  // NOTE: this is still a VISUAL attach (no skinning), but it will look lined-up on both Android + Quest.
  target.add(outfitClone); // attach first so it shares the same coordinate space
  target.updateMatrixWorld(true);

  const avatarBox = new THREE.Box3().setFromObject(femaleEnt.getObject3D("mesh"));
  const avatarSize = new THREE.Vector3();
  avatarBox.getSize(avatarSize);
  const avatarH = Math.max(0.01, avatarSize.y);

  const outfitBox = new THREE.Box3().setFromObject(outfitClone);
  const outfitSize = new THREE.Vector3();
  outfitBox.getSize(outfitSize);
  const outfitH = Math.max(0.01, outfitSize.y);

  const name = (outfitList[idxOutfit % outfitList.length] || "").toLowerCase();
  const ratio = name.includes("pants") || name.includes("cargo") ? 0.62 : 0.90;
  const desiredH = avatarH * ratio;
  const k = desiredH / outfitH;

  outfitClone.scale.multiplyScalar(k);
  outfitClone.updateMatrixWorld(true);

  // center X/Z and put top at y=0 (hips pivot), then nudge down a touch for pants
  const box2 = new THREE.Box3().setFromObject(outfitClone);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  const downNudge = avatarH * (name.includes("pants") || name.includes("cargo") ? 0.03 : 0.01);
  outfitClone.position.x -= center.x;
  outfitClone.position.z -= center.z;
  outfitClone.position.y -= (box2.max.y + downNudge);

  // Ensure render on mobile
  outfitClone.traverse((o)=>{
    if(o.isMesh){
      o.frustumCulled = false;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // (already added above)
  log(`[WEAR] Attached outfit to ${hips ? "hips bone" : "avatar root"} (visual attach, not true skinning).`);
  log(`[WEAR] If you want REAL binding (pants deform with legs), the pants GLB must be rigged/skinned to the same skeleton as the female avatar.`);
}

// --- NPC path (simple circle walk) ---
let t0 = performance.now();
AFRAME.registerComponent("npc-path", {
  schema: { radius: {default: 2.2}, speed: {default: 0.00035}, height: {default: 0.0} },
  tick: function(time){
    const r = this.data.radius;
    const a = (time - t0) * this.data.speed * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = -5 + Math.sin(a) * r;
    this.el.object3D.position.set(x, this.data.height, z);

    // face direction of motion
    const dx = -Math.sin(a);
    const dz = Math.cos(a);
    const yaw = Math.atan2(dx, dz);
    this.el.object3D.rotation.set(0, yaw, 0);
  }
});

function resetAll(){
  idxMale = 0; idxFemale = 0; idxNPC = 0; idxOutfit = 0;
  log("[RESET] Reloading all models...");
  boot();
}

async function boot(){
  try{
    log(`[AUDIT] A-Frame=${AFRAME?.version || "?"}`);
    log(`[AUDIT] navigator.xr=${("xr" in navigator) ? "present" : "missing"}`);

    // Load initial set
    await loadMale();
    await loadFemale();
    await loadOutfit();
    await loadNPC();

    // Give NPC a walking path regardless of animation clip.
    npcEnt.setAttribute("npc-path", "radius: 2.2; speed: 0.00035; height: 0.0");

    log("[BOOT] Gallery ready.");
  setupTouchJoysticks();
  } catch (e){
    console.error(e);
    log(`[BOOT] ERROR: ${e?.message || e}`);
  }
}

// UI bindings (safe even if buttons missing)
function bind(id, fn){
  const el = $(id);
  if(!el){ log(`[BOOT] WARN: missing #${id}`); return; }
  el.addEventListener("click", fn);
}

bind("btnNextMale", async ()=>{ idxMale++; await loadMale(); });
bind("btnNextFemale", async ()=>{ idxFemale++; await loadFemale(); });
bind("btnNextNPC", async ()=>{ idxNPC++; await loadNPC(); });
bind("btnNextOutfit", async ()=>{ idxOutfit++; await loadOutfit(); });
bind("btnWear", wearOutfit);
bind("btnReset", resetAll);

boot();btnCopyLogs && btnCopyLogs.addEventListener("click", async () => {
  try{
    const txt = (window.__scarlettLogs||[]).join("\n");
    await navigator.clipboard.writeText(txt);
    log("[COPY] Logs copied to clipboard.");
  }catch(e){
    log("[COPY] Failed: " + (e && e.message ? e.message : e));
  }
});


// --- Android Touch Joysticks (move + look)
function setupTouchJoysticks(){
  const joyL = $("joyL");
  const joyR = $("joyR");
  const rig = $("rig");
  const cam = $("camera");
  if(!joyL || !joyR || !rig || !cam) return;

  const state = {mx:0, my:0, lx:0, ly:0, speed:2.2, look:1.1};

  function bind(el, cb){
    const knob = el.querySelector(".joy-knob");
    const radius = 55;
    let active=false, pid=null, cx=0, cy=0;

    const setKnob=(x,y)=>{ if(knob) knob.style.transform = `translate(${x}px, ${y}px)`; };

    el.addEventListener("pointerdown",(e)=>{
      active=true; pid=e.pointerId; el.setPointerCapture(pid);
      const r=el.getBoundingClientRect();
      cx=r.left+r.width/2; cy=r.top+r.height/2;
      setKnob(0,0); cb(0,0); e.preventDefault();
    }, {passive:false});

    el.addEventListener("pointermove",(e)=>{
      if(!active || e.pointerId!==pid) return;
      const dx=e.clientX-cx, dy=e.clientY-cy;
      const d=Math.hypot(dx,dy) || 1;
      const k = d>radius ? radius/d : 1;
      const nx = (dx*k)/radius;
      const ny = (dy*k)/radius;
      setKnob(nx*radius, ny*radius);
      cb(nx, ny);
      e.preventDefault();
    }, {passive:false});

    const end=(e)=>{
      if(!active || e.pointerId!==pid) return;
      active=false; pid=null;
      setKnob(0,0); cb(0,0); e.preventDefault();
    };
    el.addEventListener("pointerup", end, {passive:false});
    el.addEventListener("pointercancel", end, {passive:false});
  }

  bind(joyL, (x,y)=>{ state.mx=x; state.my=-y; });
  bind(joyR, (x,y)=>{ state.lx=x; state.ly=-y; });

  let last=performance.now();
  function tick(now){
    const dt=Math.min(0.05,(now-last)/1000); last=now;

    // yaw on rig
    rig.object3D.rotation.y += state.lx * state.look * dt;

    // pitch on camera
    const p = cam.object3D.rotation.x + state.ly * state.look * dt;
    cam.object3D.rotation.x = Math.max(-1.2, Math.min(1.2, p));

    // move
    const mx = state.mx * state.speed * dt;
    const mz = state.my * state.speed * dt;
    if(Math.abs(mx)+Math.abs(mz) > 1e-4){
      const a = rig.object3D.rotation.y;
      const cos=Math.cos(a), sin=Math.sin(a);
      const dx = mx*cos + mz*sin;
      const dz = mz*cos - mx*sin;
      rig.object3D.position.x += dx;
      rig.object3D.position.z += dz;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  log("[TOUCH] Joysticks ready (left=move, right=look).");
}


