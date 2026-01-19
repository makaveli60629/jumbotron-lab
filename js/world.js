import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { TexturePacket } from "./textures.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, controls, log }) {
    const s = { THREE, scene, renderer, camera, player, controls, log, root: new THREE.Group() };
    scene.add(s.root);

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

    // Try load default avatar if present (optional)
    setTimeout(() => s.avatar.load("./assets/avatar.glb").catch(()=>{}), 60);

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

    const gltf = await new Promise((resolve, reject) => loader.load(resolved, resolve, undefined, reject));
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
