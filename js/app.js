/* Scarlett VR Poker — Update 3.0 (A-Frame)
   - Fixes Android movement (pads)
   - Teleport reticle + teleport
   - Solid table collision (simple radius)
   - Bots: 1 walker (no fighting), 1 seated
   - Diagnostics panel + 3D diag text toggle
*/
const $ = (sel)=>document.querySelector(sel);

const diagPanel = $("#diagPanel");
const diagText = $("#diagText");
const diagText3d = $("#diagText3d");
const loader = $("#loader");
const loaderErr = $("#loaderErr");
const loaderTitle = $("#loaderTitle");
const hud = $("#hud");

const btnEnterVR = $("#btnEnterVR");
const btnTeleport = $("#btnTeleport");
const btnReset = $("#btnReset");
const btnAudit = $("#btnAudit");
const btnDiag = $("#btnDiag");
const btnHideHUD = $("#btnHideHUD");

const androidPads = $("#androidPads");
const padMove = $("#padMove");
const padTurn = $("#padTurn");
const knobMove = $("#knobMove");
const knobTurn = $("#knobTurn");

const scene = $("#scene");
const rig = $("#rig");

const BOOT_LOG = [];
function log(line){
  BOOT_LOG.push(line);
  if (diagText) diagText.textContent = BOOT_LOG.slice(-180).join("\n");
  try{ console.log(line); }catch(_){}
}
function showError(msg){
  if (!loaderErr) return;
  loaderErr.style.display = "block";
  loaderErr.textContent = msg;
}
function setLoaderTitle(t){
  if (loaderTitle) loaderTitle.textContent = t;
}
function hideLoader(){ if (loader) loader.style.display = "none"; }
function isTouchDevice(){
  return matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

// -------------------- Components --------------------

AFRAME.registerComponent("teleport-ray", {
  schema: { hand: {default:"right"} },
  init(){
    this.enabled = true;
    this.rig = document.querySelector("#rig");
    this.raycaster = this.el.components.raycaster;
    this.reticle = document.createElement("a-entity");
    this.reticle.setAttribute("geometry", "primitive: ring; radiusInner: 0.09; radiusOuter: 0.12");
    this.reticle.setAttribute("material", "color: #33fff6; emissive: #33fff6; emissiveIntensity: 1; opacity: 0.9; transparent: true");
    this.reticle.setAttribute("rotation", "-90 0 0");
    this.reticle.setAttribute("visible", "false");
    this.el.sceneEl.appendChild(this.reticle);

    this._onTrigger = this._onTrigger.bind(this);
    this.el.addEventListener("triggerdown", this._onTrigger);
    this.el.addEventListener("abuttondown", this._onTrigger);
    this.el.addEventListener("gripdown", this._onTrigger);
    // desktop fallback: click while aiming
    this.el.addEventListener("mousedown", this._onTrigger);

    this.hitPoint = null;
  },
  remove(){
    this.el.removeEventListener("triggerdown", this._onTrigger);
    this.el.removeEventListener("abuttondown", this._onTrigger);
    this.el.removeEventListener("gripdown", this._onTrigger);
    this.el.removeEventListener("mousedown", this._onTrigger);
    if (this.reticle && this.reticle.parentNode) this.reticle.parentNode.removeChild(this.reticle);
  },
  setEnabled(on){
    this.enabled = !!on;
    if (!this.enabled) this.reticle.setAttribute("visible","false");
  },
  _onTrigger(){
    if (!this.enabled) return;
    if (!this.hitPoint) return;
    // keep Y = 0 for rig, since camera has height
    this.rig.object3D.position.set(this.hitPoint.x, 0, this.hitPoint.z);
  },
  tick(){
    if (!this.enabled) return;
    const rc = this.el.components.raycaster;
    if (!rc) return;
    const hits = rc.intersections || [];
    if (!hits.length){
      this.hitPoint = null;
      this.reticle.setAttribute("visible","false");
      return;
    }
    const h = hits[0];
    if (!h || !h.point){
      this.hitPoint = null;
      this.reticle.setAttribute("visible","false");
      return;
    }
    this.hitPoint = h.point;
    this.reticle.object3D.position.copy(h.point);
    this.reticle.setAttribute("visible","true");
  }
});

AFRAME.registerComponent("smooth-locomotion", {
  schema: {},
  init(){
    this.rig = document.querySelector("#rig");
    this.head = document.querySelector("#head");
    this.speed = 2.0;
    this.turnSpeed = 1.8; // radians/sec

    // pad vectors
    this.moveVec = {x:0,y:0};
    this.turnVec = {x:0,y:0};
    this.keys = new Set();

    this._onKeyDown = (e)=>this.keys.add(e.code);
    this._onKeyUp = (e)=>this.keys.delete(e.code);
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    // Simple “solid table” push-out (cylinder around center)
    this.tableCenter = new THREE.Vector3(0,0,0);
    this.tableRadius = 2.75; // matches big table
    this.playerRadius = 0.28;

    this._bindPads();
  },
  remove(){
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  },
  _bindPads(){
    if (!isTouchDevice()) return;
    if (!androidPads) return;
    androidPads.style.display = "block";
    androidPads.setAttribute("aria-hidden","false");

    const bindPad = (pad, knob, setVec)=>{
      let active=false, sx=0, sy=0;
      const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
      const setKnob=(nx,ny)=>{ if(knob) knob.style.transform=`translate(${nx}px,${ny}px)`; };
      pad.addEventListener("pointerdown",(e)=>{
        active=true; sx=e.clientX; sy=e.clientY;
        pad.setPointerCapture(e.pointerId);
      });
      pad.addEventListener("pointermove",(e)=>{
        if(!active) return;
        const dx=e.clientX-sx, dy=e.clientY-sy;
        const max=45;
        const nx=clamp(dx,-max,max), ny=clamp(dy,-max,max);
        setVec.x = nx/max;
        setVec.y = ny/max;
        setKnob(nx,ny);
      });
      const end=()=>{
        active=false; setVec.x=0; setVec.y=0; setKnob(0,0);
      };
      pad.addEventListener("pointerup", end);
      pad.addEventListener("pointercancel", end);
      pad.addEventListener("lostpointercapture", end);
    };

    bindPad(padMove, knobMove, this.moveVec);
    bindPad(padTurn, knobTurn, this.turnVec);
  },
  _applyTableCollision(pos){
    // Keep out of a cylinder around table center (XZ only)
    const dx = pos.x - this.tableCenter.x;
    const dz = pos.z - this.tableCenter.z;
    const dist = Math.hypot(dx, dz);
    const minDist = this.tableRadius + this.playerRadius;
    if (dist < minDist && dist > 1e-5){
      const push = (minDist - dist);
      pos.x += (dx/dist) * push;
      pos.z += (dz/dist) * push;
    }
  },
  tick(t, dtMs){
    const dt = Math.min(dtMs/1000, 0.05);

    // keyboard fallback (desktop)
    let fwd = 0, str = 0;
    if (this.keys.has("KeyW")) fwd += 1;
    if (this.keys.has("KeyS")) fwd -= 1;
    if (this.keys.has("KeyA")) str -= 1;
    if (this.keys.has("KeyD")) str += 1;

    // touch pads
    fwd += -this.moveVec.y;
    str += this.moveVec.x;

    // normalize
    const len = Math.hypot(fwd, str);
    if (len > 1e-6){ fwd/=len; str/=len; }

    // heading from head yaw
    const rig3 = this.rig.object3D;
    const head3 = this.head.object3D;

    // turning: right pad x
    const turn = this.turnVec.x * this.turnSpeed * dt;
    rig3.rotation.y -= turn;

    // movement in head-forward space but grounded
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(head3.quaternion);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();

    const step = this.speed * dt;
    const pos = rig3.position.clone();
    pos.addScaledVector(forward, fwd * step);
    pos.addScaledVector(right, str * step);

    // ground y
    pos.y = 0;

    // solid table
    this._applyTableCollision(pos);

    rig3.position.copy(pos);
  }
});

// -------------------- World Build --------------------

function ensureWorld(){
  // Floor (teleportable)
  const floor = document.createElement("a-entity");
  floor.setAttribute("geometry", "primitive: plane; width: 80; height: 80");
  floor.setAttribute("rotation", "-90 0 0");
  floor.setAttribute("material", "color: #061017; roughness: 1; metalness: 0");
  floor.classList.add("teleportable");
  scene.appendChild(floor);

  // Grid feel (subtle)
  const grid = document.createElement("a-entity");
  grid.setAttribute("geometry", "primitive: plane; width: 80; height: 80");
  grid.setAttribute("rotation", "-90 0 0");
  grid.setAttribute("position", "0 0.002 0");
  grid.setAttribute("material", "shader: flat; color: #0b2230; opacity: 0.35; transparent: true; side: double");
  scene.appendChild(grid);

  // Big poker table (solid via locomotion cylinder)
  const table = document.createElement("a-entity");
  table.setAttribute("position", "0 0 0");

  const base = document.createElement("a-entity");
  base.setAttribute("geometry", "primitive: cylinder; radius: 2.7; height: 0.35; segmentsRadial: 48");
  base.setAttribute("material", "color: #0a0c0f; roughness: 0.9; metalness: 0.05");
  base.setAttribute("position", "0 0.35 0");
  table.appendChild(base);

  const felt = document.createElement("a-entity");
  felt.setAttribute("geometry", "primitive: cylinder; radius: 2.45; height: 0.12; segmentsRadial: 48");
  felt.setAttribute("material", "color: #0f2a24; roughness: 1; metalness: 0");
  felt.setAttribute("position", "0 0.55 0");
  table.appendChild(felt);

  // inner ring
  const ring = document.createElement("a-entity");
  ring.setAttribute("geometry", "primitive: torus; radius: 1.9; radiusTubular: 0.22; segmentsRadial: 24; segmentsTubular: 64");
  ring.setAttribute("material", "color: #070809; roughness: 1; metalness: 0");
  ring.setAttribute("rotation", "90 0 0");
  ring.setAttribute("position", "0 0.62 0");
  table.appendChild(ring);

  scene.appendChild(table);

  // Chairs + seated bot
  const chairR = 3.35;
  for (let i=0;i<6;i++){
    const ang = (i/6)*Math.PI*2;
    const x = Math.cos(ang)*chairR;
    const z = Math.sin(ang)*chairR;

    const chair = document.createElement("a-entity");
    chair.setAttribute("position", `${x} 0 ${z}`);
    chair.setAttribute("rotation", `0 ${(-ang*180/Math.PI)+90} 0`);

    const seat = document.createElement("a-entity");
    seat.setAttribute("geometry","primitive: box; width:0.6; height:0.08; depth:0.6");
    seat.setAttribute("material","color:#11161a; roughness:1");
    seat.setAttribute("position","0 0.45 0");
    chair.appendChild(seat);

    const back = document.createElement("a-entity");
    back.setAttribute("geometry","primitive: box; width:0.6; height:0.55; depth:0.08");
    back.setAttribute("material","color:#0c1014; roughness:1");
    back.setAttribute("position","0 0.72 -0.26");
    chair.appendChild(back);

    scene.appendChild(chair);

    // Put seated bot on chair 0
    if (i === 0){
      const botSit = makeBot("#ff8844");
      botSit.setAttribute("position", `${x} 0 ${z}`);
      botSit.setAttribute("rotation", `0 ${(-ang*180/Math.PI)+90} 0`);
      botSit.setAttribute("bot-sit", "");
      scene.appendChild(botSit);
    }
  }

  // Walking bot around table (no fighting)
  const botWalk = makeBot("#2aa4ff");
  botWalk.setAttribute("position", "4.2 0 0");
  botWalk.setAttribute("bot-walk", "radius: 4.2; speed: 0.6");
  scene.appendChild(botWalk);

  // Backdrop wall (for contrast)
  const wall = document.createElement("a-entity");
  wall.setAttribute("geometry", "primitive: plane; width: 40; height: 18");
  wall.setAttribute("material", "color: #030506; roughness: 1");
  wall.setAttribute("position", "0 9 -18");
  scene.appendChild(wall);

  // Teleportable spawn marker
  const spawnMarker = document.createElement("a-entity");
  spawnMarker.setAttribute("geometry","primitive: ring; radiusInner:0.18; radiusOuter:0.24");
  spawnMarker.setAttribute("material","color:#33fff6; opacity:0.18; transparent:true");
  spawnMarker.setAttribute("rotation","-90 0 0");
  spawnMarker.setAttribute("position","0 0.01 3");
  scene.appendChild(spawnMarker);
}

function makeBot(color){
  const bot = document.createElement("a-entity");
  bot.setAttribute("position","0 0 0");

  const head = document.createElement("a-entity");
  head.setAttribute("geometry","primitive: sphere; radius: 0.22; segmentsWidth: 24; segmentsHeight:24");
  head.setAttribute("material", `color:${color}; roughness:0.4`);
  head.setAttribute("position","0 1.55 0");
  bot.appendChild(head);

  const body = document.createElement("a-entity");
  body.setAttribute("geometry","primitive: capsule; radius: 0.22; height: 0.95");
  body.setAttribute("material","color:#0f6aa8; roughness:0.6");
  body.setAttribute("position","0 1.0 0");
  bot.appendChild(body);

  const armL = document.createElement("a-entity");
  armL.setAttribute("geometry","primitive: capsule; radius:0.08; height: 0.45");
  armL.setAttribute("material","color:#1e6b6b; roughness:0.8");
  armL.setAttribute("position","-0.32 1.05 0");
  armL.setAttribute("rotation","0 0 18");
  bot.appendChild(armL);

  const armR = document.createElement("a-entity");
  armR.setAttribute("geometry","primitive: capsule; radius:0.08; height: 0.45");
  armR.setAttribute("material","color:#1e6b6b; roughness:0.8");
  armR.setAttribute("position","0.32 1.05 0");
  armR.setAttribute("rotation","0 0 -18");
  bot.appendChild(armR);

  return bot;
}

AFRAME.registerComponent("bot-walk", {
  schema: { radius: {default: 4.2}, speed: {default: 0.6} },
  init(){ this.t = 0; },
  tick(t, dtMs){
    const dt = Math.min(dtMs/1000, 0.05);
    this.t += dt * this.data.speed;
    const r = this.data.radius;
    const x = Math.cos(this.t) * r;
    const z = Math.sin(this.t) * r;
    this.el.object3D.position.set(x, 0, z);
    // face center
    this.el.object3D.lookAt(0, 1.0, 0);
  }
});

AFRAME.registerComponent("bot-sit", {
  init(){
    // lower bot to appear seated
    const o = this.el.object3D;
    o.position.y = 0.0;
    // nudge children down
    this.el.childNodes.forEach((n)=>{
      if (!n.object3D) return;
      n.object3D.position.y -= 0.45;
    });
  }
});

// -------------------- UI / Boot --------------------

let teleportOn = true;

function setTeleport(on){
  teleportOn = !!on;
  btnTeleport.textContent = `Teleport: ${teleportOn ? "ON" : "OFF"}`;
  const hands = [$("#leftHand"), $("#rightHand")].filter(Boolean);
  hands.forEach(h=>{
    const comp = h.components["teleport-ray"];
    if (comp && comp.setEnabled) comp.setEnabled(teleportOn);
    // also stop raycaster visuals when off
    if (!teleportOn) h.setAttribute("raycaster","objects: .teleportable; far: 0.01");
    else h.setAttribute("raycaster","objects: .teleportable; far: 30");
  });
}

function toggleDiagnostics(){
  const show = diagPanel.style.display !== "block";
  diagPanel.style.display = show ? "block" : "none";
  // Optional 3D diag text inside world
  if (diagText3d){
    diagText3d.setAttribute("visible", show ? "true" : "false");
    diagText3d.setAttribute("text", `value: ${BOOT_LOG.slice(-12).join("\\n").replace(/;/g,",")}; width: 2.8; align:center; color:#d9e6ff;`);
  }
}

function audit(){
  const hasXR = !!navigator.xr;
  const aframe = (window.AFRAME && AFRAME.version) ? AFRAME.version : "missing";
  const three = (AFRAME && AFRAME.THREE && AFRAME.THREE.REVISION) ? AFRAME.THREE.REVISION : "unknown";
  log(`[AUDIT] A-Frame=${aframe} THREE(rev)=${three} navigator.xr=${hasXR ? "present" : "missing"}`);
  log(`[AUDIT] Teleport=${teleportOn ? "ON" : "OFF"} TouchPads=${isTouchDevice() ? "yes" : "no"}`);
}

btnTeleport?.addEventListener("click", ()=>setTeleport(!teleportOn));
btnReset?.addEventListener("click", ()=>{
  rig.object3D.position.set(0,0,3);
  rig.object3D.rotation.set(0,0,0);
  log("[UI] Reset to Spawn.");
});
btnDiag?.addEventListener("click", toggleDiagnostics);
btnAudit?.addEventListener("click", audit);
btnHideHUD?.addEventListener("click", ()=>{
  hud.setAttribute("aria-hidden","true");
  log("[UI] HUD hidden.");
});
btnEnterVR?.addEventListener("click", async ()=>{
  try{
    if (!scene || !scene.enterVR) throw new Error("scene.enterVR not available yet.");
    await scene.enterVR();
    // auto-hide HUD so it never blocks VR overlays
    hud.setAttribute("aria-hidden","true");
    log("[XR] EnterVR requested. HUD auto-hidden.");
  }catch(e){
    log(`[XR] EnterVR failed: ${e?.message || e}`);
    showError(`Enter VR failed: ${e?.message || e}`);
  }
});

// Boot sequence
(async function boot(){
  try{
    log("[BOOT] Starting…");
    log(`[XR] navigator.xr = ${navigator.xr ? "present" : "missing"}`);

    // Wait for scene to be loaded
    setLoaderTitle("loader active");
    await new Promise((resolve, reject)=>{
      const timeout = setTimeout(()=>reject(new Error("Scene load timeout")), 15000);
      scene.addEventListener("loaded", ()=>{
        clearTimeout(timeout);
        resolve();
      }, {once:true});
    });

    ensureWorld();

    // If not XR capable (Android Chrome often), give hint only
    if (!navigator.xr){
      log("[XR] WebXR not available (normal on Android Chrome). Use Quest Browser for VR.");
    }

    setTeleport(true);
    audit();

    hideLoader();
    log("[BOOT] World init OK.");
  }catch(e){
    log(`[BOOT] ERROR: ${e?.message || e}`);
    showError(e?.message || String(e));
  }
})();
