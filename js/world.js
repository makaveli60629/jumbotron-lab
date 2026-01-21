import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { TexturePacket } from "./textures.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, controls, log }) {
    const s = { THREE, scene, renderer, camera, player, controls, log, root: new THREE.Group() };
    scene.add(s.root);
    // Soft fog for depth
    scene.fog = new THREE.Fog(0x05080f, 8, 45);


    // Lighting (avatar-friendly)
    s.root.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(3, 6, 3);
    s.root.add(key);

    const rim = new THREE.DirectionalLight(0x66ffff, 0.35);
    rim.position.set(-4, 3, -3);
    s.root.add(rim);

    // Scale grid
    const grid = new THREE.GridHelper(40, 40, 0x003333, 0x001a1a);
    s.root.add(grid);

    // Room shell (simple walls)
    buildRoomShell(s);

    // Tables
    buildShowroom(s);
    buildScorpion(s);

    // Mirror wall (Reflector)
    buildMirror(s);

    // Avatar preview system
    s.avatar = createAvatarApi(s);
    // Avatar is loaded MANUALLY from HUD to avoid mobile/Quest fetch stalls.

    log?.("World init OK. Use the Avatar Lab sliders + mirror to tune body scale/rotation.");
    return {
      avatar: s.avatar,
      update: (dt, t) => {
        if (s._previewRing) s._previewRing.rotation.y += dt * 0.25;
        s.avatar._update?.(dt, t);
      }
    };
  }
};

function buildRoomShell(s){
  const mat = new s.THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.95, metalness: 0.0 });
  const floor = new s.THREE.Mesh(new s.THREE.PlaneGeometry(60,60), mat);
  floor.rotation.x = -Math.PI/2;
  floor.position.y = 0;
  s.root.add(floor);

  const wallMat = new s.THREE.MeshStandardMaterial({ color: 0x070c18, roughness: 0.9, metalness: 0.05 });
  const back = new s.THREE.Mesh(new s.THREE.PlaneGeometry(60,12), wallMat);
  back.position.set(0, 6, -18);
  s.root.add(back);

  const left = new s.THREE.Mesh(new s.THREE.PlaneGeometry(36,12), wallMat);
  left.position.set(-18, 6, 0);
  left.rotation.y = Math.PI/2;
  s.root.add(left);

  const right = new s.THREE.Mesh(new s.THREE.PlaneGeometry(36,12), wallMat);
  right.position.set(18, 6, 0);
  right.rotation.y = -Math.PI/2;
  s.root.add(right);
}

function buildShowroom(s){
  const feltTex = TexturePacket.getShowroomFelt();
  const mat = new s.THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.9, metalness: 0.02 });

  const table = new s.THREE.Mesh(new s.THREE.CylinderGeometry(3.2, 3.3, 0.38, 72), mat);
  table.position.set(0, 0.95, 0);
  s.root.add(table);

  const base = new s.THREE.Mesh(
    new s.THREE.CylinderGeometry(1.2, 1.4, 0.9, 48),
    new s.THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 })
  );
  base.position.set(0, 0.45, 0);
  s.root.add(base);

  // Avatar preview pedestal (in front of player)
  const pedestal = new s.THREE.Mesh(
    new s.THREE.CylinderGeometry(0.55, 0.65, 0.2, 32),
    new s.THREE.MeshStandardMaterial({ color: 0x0b0f16, roughness: 0.7, metalness: 0.2 })
  );
  pedestal.position.set(0, 0.10, 2.6);
  s.root.add(pedestal);

  const ring = new s.THREE.Mesh(
    new s.THREE.TorusGeometry(0.75, 0.02, 12, 64),
    new s.THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x003333, roughness: 0.25, metalness: 0.2 })
  );
  ring.position.set(0, 0.30, 2.6);
  ring.rotation.x = Math.PI/2;
  s.root.add(ring);
  s._previewRing = ring;

  // Position marker at feet (helps judge height)
  const feet = new s.THREE.Mesh(
    new s.THREE.CircleGeometry(0.28, 32),
    new s.THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0.25 })
  );
  feet.rotation.x = -Math.PI/2;
  feet.position.set(0, 0.01, 2.6);
  s.root.add(feet);
}

function buildScorpion(s){
  const scTex = TexturePacket.getScorpionFelt();
  const mat = new s.THREE.MeshStandardMaterial({ map: scTex, roughness: 0.85, metalness: 0.04 });
  const table = new s.THREE.Mesh(new s.THREE.CylinderGeometry(1.9, 2.0, 0.34, 48), mat);
  table.position.set(8, 0.95, -2);
  s.root.add(table);
}

function buildMirror(s){
  // Mirror wall positioned behind the avatar preview so you can see front + back easily.
  const geom = new s.THREE.PlaneGeometry(6.5, 4.2);
  const mirror = new Reflector(geom, {
    clipBias: 0.003,
    textureWidth: Math.floor(window.innerWidth * (window.devicePixelRatio || 1)),
    textureHeight: Math.floor(window.innerHeight * (window.devicePixelRatio || 1)),
    color: 0x202020
  });
  mirror.position.set(0, 2.2, 5.4);
  mirror.rotation.y = Math.PI; // face toward avatar/player
  s.root.add(mirror);

  // Frame
  const frame = new s.THREE.Mesh(
    new s.THREE.BoxGeometry(6.7, 4.4, 0.08),
    new s.THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.8, metalness: 0.2 })
  );
  frame.position.copy(mirror.position);
  frame.rotation.copy(mirror.rotation);
  frame.position.z += 0.02;
  s.root.add(frame);
}

function createAvatarApi(s){
  const loader = new GLTFLoader();

  const tuning = {
    scale: 1.0,
    yaw: Math.PI,
    y: 0.22,
    z: 2.6,
    x: 0.0
  };

  let avatarRoot = null;
  let skeletonHelper = null;

  async function load(url, opts = {}){
    const resolved = url || "./assets/avatar.glb";
    s.log?.(`Avatar load: ${resolved}`);

    // cleanup old
    // Walker bot patrol + leg animation
    if (s._walker) updateWalkerBot(s, dt, t);

    if (avatarRoot){
      s.root.remove(avatarRoot);
      avatarRoot.traverse?.((o)=>{
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) disposeMaterial(o.material);
      });
      avatarRoot = null;
    }
    if (skeletonHelper){
      s.root.remove(skeletonHelper);
      skeletonHelper = null;
    }

    const gltf = await Promise.race([
    new Promise((resolve, reject) => loader.load(resolved, resolve, undefined, reject)),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Avatar load timeout (6s)")), 6000))
  ]);
    avatarRoot = gltf.scene || gltf.scenes?.[0];
    if (!avatarRoot) throw new Error("GLTF has no scene.");

    // normalize scale to ~1.7m (then multiply tuning.scale)
    avatarRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(avatarRoot);
    const size = new THREE.Vector3();
    box.getSize(size);

    let auto = 1.0;
    if (size.y > 0.1){
      auto = 1.70 / size.y;
      s.log?.(`Avatar auto-scale: ${size.y.toFixed(2)}m -> 1.70m (x${auto.toFixed(2)})`);
    }

    avatarRoot.position.set(tuning.x, tuning.y, tuning.z);
    avatarRoot.rotation.y = tuning.yaw;
    avatarRoot.scale.setScalar(auto * tuning.scale);

    s.root.add(avatarRoot);
    s.log?.("Avatar OK (preview station).");
  }

  function setScale(v){
    tuning.scale = clamp(v, 0.01, 10);
    applyTuning();
  }
  function setYawDeg(deg){
    tuning.yaw = THREE.MathUtils.degToRad(deg % 360);
    applyTuning();
  }
  function setY(v){
    tuning.y = v;
    applyTuning();
  }
  function resetTuning(){
    tuning.scale = 1.0;
    tuning.yaw = Math.PI;
    tuning.y = 0.22;
    applyTuning();
  }
  function getTuning(){ return { ...tuning }; }

  function applyTuning(){
    if (!avatarRoot) return;
    avatarRoot.position.set(tuning.x, tuning.y, tuning.z);
    avatarRoot.rotation.y = tuning.yaw;

    // keep existing base scale but multiply by tuning.scale
    avatarRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(avatarRoot);
    const size = new THREE.Vector3(); box.getSize(size);
    // If we can't infer, just apply scalar
    const current = avatarRoot.scale.x || 1;
    const base = current / (tuning._lastAppliedScale || 1);
    avatarRoot.scale.setScalar(base * tuning.scale);
    tuning._lastAppliedScale = tuning.scale;

    if (skeletonHelper){
      skeletonHelper.update();
    }
  }

  function toggleSkeleton(){
    if (!avatarRoot) return false;
    if (skeletonHelper){
      s.root.remove(skeletonHelper);
      skeletonHelper = null;
      return false;
    }
    skeletonHelper = new THREE.SkeletonHelper(avatarRoot);
    skeletonHelper.visible = true;
    s.root.add(skeletonHelper);
    return true;
  }

  function _update(){
    if (skeletonHelper) skeletonHelper.update();
  }

  return { load, setScale, setYawDeg, setY, resetTuning, toggleSkeleton, getTuning, _update };
}

function disposeMaterial(mat){
  if (Array.isArray(mat)) return mat.forEach(disposeMaterial);
  mat.map?.dispose?.();
  mat.normalMap?.dispose?.();
  mat.roughnessMap?.dispose?.();
  mat.metalnessMap?.dispose?.();
  mat.emissiveMap?.dispose?.();
  mat.dispose?.();
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }


// --- Simple collision: keeps player out of table + walls ---

function collidePlayer(s){
  if(!s?.player) return;
  const p = s.player.position;
  // Room bounds (match buildRoomShell)
  const minX=-17.2, maxX=17.2, minZ=-17.2, maxZ=17.2;
  p.x = Math.max(minX, Math.min(maxX, p.x));
  p.z = Math.max(minZ, Math.min(maxZ, p.z));

  // Center table collider (radius slightly larger than table)
  const cx=0, cz=0, r=3.55;
  const dx=p.x-cx, dz=p.z-cz;
  const d=Math.hypot(dx,dz);
  if(d < r){
    const sgn = (d===0)?1:(r/d);
    p.x = cx + dx*sgn;
    p.z = cz + dz*sgn;
  }
}


// --- World visual upgrades (safe for Quest/Android) ---

function buildEnvironmentEnhancements(s){
  // Ceiling
  const ceiling = new s.THREE.Mesh(
    new s.THREE.PlaneGeometry(60,60),
    new s.THREE.MeshStandardMaterial({ color: 0x03050b, roughness: 1.0, metalness: 0.0, side: s.THREE.DoubleSide })
  );
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.y = 12;
  s.root.add(ceiling);

  // Neon strip lights (emissive planes)
  const stripMat = new s.THREE.MeshStandardMaterial({
    color: 0x001a1a, emissive: 0x00ffff, emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.2
  });
  const stripGeo = new s.THREE.PlaneGeometry(18, 0.35);
  for (const z of [-10, 0, 10]){
    const strip = new s.THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, 11.6, z);
    strip.rotation.x = Math.PI/2;
    s.root.add(strip);
  }

  // Extra fill lights to remove “black corners”
  const cyan = new s.THREE.PointLight(0x00ffff, 0.7, 18, 2);
  cyan.position.set(0, 5.5, 4);
  s.root.add(cyan);

  const warm = new s.THREE.PointLight(0xffcc88, 0.45, 20, 2);
  warm.position.set(-6, 4.5, -4);
  s.root.add(warm);

  // Subtle floor grid for debugging scale
  const grid = new s.THREE.GridHelper(60, 60, 0x006666, 0x003333);
  grid.position.y = 0.02;
  s.root.add(grid);

  // Jumbotron placeholder (safe)
  const screen = new s.THREE.Mesh(
    new s.THREE.PlaneGeometry(6.4, 3.6),
    new s.THREE.MeshStandardMaterial({ color: 0x061018, emissive: 0x001b22, emissiveIntensity: 1.0, roughness: 0.7 })
  );
  screen.position.set(0, 4.2, -16.8);
  s.root.add(screen);

  const frame = new s.THREE.Mesh(
    new s.THREE.BoxGeometry(6.7, 3.9, 0.12),
    new s.THREE.MeshStandardMaterial({ color: 0x0b1428, roughness: 0.5, metalness: 0.3 })
  );
  frame.position.copy(screen.position);
  frame.position.z -= 0.08;
  s.root.add(frame);
}

function buildChairs(s){
  // 6 chairs around the showroom table, sized for scale reference
  const chairMat = new s.THREE.MeshStandardMaterial({ color: 0x0b1428, roughness: 0.85, metalness: 0.1 });
  const seatMat  = new s.THREE.MeshStandardMaterial({ color: 0x08101f, roughness: 0.95, metalness: 0.05 });

  const seatGeo = new s.THREE.BoxGeometry(0.55, 0.08, 0.55);
  const backGeo = new s.THREE.BoxGeometry(0.55, 0.65, 0.08);
  const legGeo  = new s.THREE.CylinderGeometry(0.03, 0.03, 0.45, 10);

  const R = 5.0;
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2 + Math.PI/6;
    const x = Math.cos(a)*R;
    const z = Math.sin(a)*R;
    const g = new s.THREE.Group();

    const seat = new s.THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.48, 0);
    g.add(seat);

    const back = new s.THREE.Mesh(backGeo, chairMat);
    back.position.set(0, 0.82, -0.24);
    g.add(back);

    for (const lx of [-0.22, 0.22]){
      for (const lz of [-0.22, 0.22]){
        const leg = new s.THREE.Mesh(legGeo, chairMat);
        leg.position.set(lx, 0.24, lz);
        g.add(leg);
      }
    }

    g.position.set(x, 0, z);
    g.rotation.y = -a + Math.PI; // face table
    g.name = "chair_"+i;
    s.root.add(g);
  }
}

function createWalkerBot(s){
  // Procedural bot with animated legs/arms (no GLB needed)
  const bot = new s.THREE.Group();
  bot.name = "walker_bot";

  const bodyMat = new s.THREE.MeshStandardMaterial({ color: 0x55aaff, roughness: 0.65, metalness: 0.1 });
  const limbMat = new s.THREE.MeshStandardMaterial({ color: 0x0b1428, roughness: 0.9, metalness: 0.05 });

  const torso = new s.THREE.Mesh(new s.THREE.CapsuleGeometry(0.18, 0.34, 6, 12), bodyMat);
  torso.position.set(0, 0.95, 0);
  bot.add(torso);

  const head = new s.THREE.Mesh(new s.THREE.SphereGeometry(0.14, 18, 18), bodyMat);
  head.position.set(0, 1.28, 0.03);
  bot.add(head);

  function limb(){
    const g = new s.THREE.Group();
    const upper = new s.THREE.Mesh(new s.THREE.CapsuleGeometry(0.06, 0.22, 4, 10), limbMat);
    upper.position.set(0, 0.18, 0);
    g.add(upper);
    return g;
  }

  const legL = limb(); legL.position.set(-0.10, 0.46, 0.02);
  const legR = limb(); legR.position.set( 0.10, 0.46, 0.02);
  bot.add(legL); bot.add(legR);

  const armL = limb(); armL.position.set(-0.26, 1.05, 0.0);
  const armR = limb(); armR.position.set( 0.26, 1.05, 0.0);
  bot.add(armL); bot.add(armR);

  bot.userData = {
    legL, legR, armL, armR,
    radius: 6.3,
    speed: 1.1,
    phase: 0,
    angle: 0,
    lastPos: new s.THREE.Vector3()
  };

  // start position
  bot.position.set(6.3, 0, 0);
  bot.userData.lastPos.copy(bot.position);
  s.root.add(bot);
  return bot;
}

function updateWalkerBot(s, dt, t){
  const bot = s._walker;
  if(!bot) return;
  const u = bot.userData;
  // Walk in a circle around the table
  u.angle += dt * (u.speed / u.radius);
  const tx = Math.cos(u.angle) * u.radius;
  const tz = Math.sin(u.angle) * u.radius;

  // Compute movement
  const prev = u.lastPos;
  const next = new s.THREE.Vector3(tx, 0, tz);
  const vel = next.clone().sub(prev);
  const dist = vel.length();
  bot.position.copy(next);
  u.lastPos.copy(next);

  // Face direction of travel
  if(dist > 1e-4){
    const dir = vel.normalize();
    bot.rotation.y = Math.atan2(dir.x, dir.z);
  }

  // Stride phase based on distance traveled (prevents “sliding”)
  u.phase += dist * 7.0;
  const swing = Math.sin(u.phase) * 0.7;
  const swing2 = Math.sin(u.phase + Math.PI) * 0.7;

  u.legL.rotation.x = swing;
  u.legR.rotation.x = swing2;
  u.armL.rotation.x = swing2 * 0.8;
  u.armR.rotation.x = swing * 0.8;

  // Tiny up-down bob while walking
  bot.position.y = 0.02 + Math.abs(Math.sin(u.phase)) * 0.03;
}
