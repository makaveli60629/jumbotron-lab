// Scarlett Gallery v2
// - 2 display pedestals (male + female)
// - 1 outfit stand (viewable on Android + Quest)
// - 1 walking NPC (3rd avatar)
// - "Wear Outfit" attempts to attach outfit to the female avatar's hips (best-effort).

const $ = (id) => document.getElementById(id);

const logEl = $("log");
function log(msg){
  const t = new Date().toLocaleTimeString();
  logEl.textContent = `${logEl.textContent}\n[${t}] ${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
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
  const min = new THREE.Vector3();
  box3.getMin(min);
  model.position.y -= min.y;

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
  let found = null;
  root.traverse((o)=>{
    if(found) return;
    const n = (o.name || "").toLowerCase();
    if(names.some(k => n === k || n.includes(k))) found = o;
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

  // Try to scale outfit near the female scale.
  // We use the female entity scale as reference.
  const s = femaleEnt.object3D.scale.x;
  outfitClone.scale.setScalar(1.0 / Math.max(0.0001, s)); // compensate because target is inside already-scaled entity

  // Position tweak: pants usually need to go down from hips
  outfitClone.position.set(0, -0.02, 0);

  // Ensure render on mobile
  outfitClone.traverse((o)=>{
    if(o.isMesh){
      o.frustumCulled = false;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  target.add(outfitClone);
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
bind("btnNextOutfit", async ()=>{ idxOutfit++; await loadOutfit(); });
bind("btnWear", wearOutfit);
bind("btnReset", resetAll);

boot();
