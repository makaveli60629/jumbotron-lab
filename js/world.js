import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TexturePacket } from "./textures.js";

export const World = {
  async init({ THREE, scene, renderer, camera, player, controls, log }) {
    const s = {
      THREE, scene, renderer, camera, player, controls, log,
      root: new THREE.Group(),
      avatar: null,
      clock: new THREE.Clock(),
    };
    scene.add(s.root);

    // Lighting (stable + good for avatars)
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    s.root.add(amb);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 6, 3);
    key.castShadow = false;
    s.root.add(key);

    const rim = new THREE.DirectionalLight(0x66ffff, 0.35);
    rim.position.set(-4, 3, -3);
    s.root.add(rim);

    // Floor grid for scale reference
    const grid = new THREE.GridHelper(40, 40, 0x003333, 0x001a1a);
    grid.position.y = 0;
    s.root.add(grid);

    // Showroom table + preview station
    buildShowroom(s);

    // Scorpion table (off to the side, so you can verify texture module)
    buildScorpion(s);

    // Avatar API
    s.avatar = createAvatarApi(s);

    // Load default avatar (if present). If missing, we keep running without crashing.
    setTimeout(() => s.avatar.load("./assets/avatar.glb").catch(()=>{}), 50);

    log?.("World init OK. Drop /assets/avatar.glb or paste a URL in the HUD and press LOAD AVATAR.");

    return {
      avatar: s.avatar,
      update: (dt, t) => {
        // simple idle animation pulse on preview ring
        if (s._previewRing){
          s._previewRing.rotation.y += dt * 0.25;
        }
      }
    };
  }
};

function buildShowroom(s){
  // Big table (felt texture)
  const feltTex = TexturePacket.getShowroomFelt();
  const mat = new s.THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.9, metalness: 0.02 });

  const table = new s.THREE.Mesh(
    new s.THREE.CylinderGeometry(3.2, 3.3, 0.38, 72),
    mat
  );
  table.position.set(0, 0.95, 0);
  s.root.add(table);

  // Table base
  const base = new s.THREE.Mesh(
    new s.THREE.CylinderGeometry(1.2, 1.4, 0.9, 48),
    new s.THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8, metalness: 0.1 })
  );
  base.position.set(0, 0.45, 0);
  s.root.add(base);

  // Avatar preview pedestal in front of player
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

  // Label
  const label = makeBillboardText(s, "AVATAR PREVIEW", 0x00ffff);
  label.position.set(0, 1.15, 2.6);
  s.root.add(label);
}

function buildScorpion(s){
  const scTex = TexturePacket.getScorpionFelt();
  const mat = new s.THREE.MeshStandardMaterial({ map: scTex, roughness: 0.85, metalness: 0.04 });
  const table = new s.THREE.Mesh(
    new s.THREE.CylinderGeometry(1.9, 2.0, 0.34, 48),
    mat
  );
  table.position.set(8, 0.95, -2);
  s.root.add(table);

  const label = makeBillboardText(s, "SCORPION TABLE", 0x00ffff);
  label.position.set(8, 1.15, -2);
  s.root.add(label);
}

function createAvatarApi(s){
  const loader = new GLTFLoader();

  async function load(url, opts = {}){
    const resolved = url || "./assets/avatar.glb";
    s.log?.(`Avatar load: ${resolved}`);

    // Remove old avatar
    if (s._avatarRoot){
      s.root.remove(s._avatarRoot);
      s._avatarRoot.traverse?.((o)=>{ if (o.geometry) o.geometry.dispose?.(); if (o.material) disposeMaterial(o.material); });
      s._avatarRoot = null;
    }

    // Load GLB/GLTF
    const gltf = await new Promise((resolve, reject) => {
      loader.load(resolved, resolve, undefined, reject);
    });

    const root = gltf.scene || gltf.scenes?.[0];
    if (!root) throw new Error("GLTF has no scene.");

    // Put avatar on pedestal (preview station)
    root.position.set(0, 0.22, 2.6);
    root.rotation.y = Math.PI; // face player/camera
    root.scale.setScalar(1.0);

    // Normalize scale (optional): try to make avatar ~1.7m tall if bounding box is present
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0.1){
      const targetH = 1.70;
      const scale = targetH / size.y;
      root.scale.multiplyScalar(scale);
      root.position.set(0, 0.22, 2.6);
      s.log?.(`Avatar auto-scale: h=${size.y.toFixed(2)}m -> ${targetH.toFixed(2)}m (x${scale.toFixed(2)})`);
    }else{
      s.log?.("Avatar scale: skipped (bbox too small).");
    }

    s.root.add(root);
    s._avatarRoot = root;

    // If resetPose requested, you can expand later with animation mixer reset
    if (opts.resetPose) {
      // placeholder hook
    }

    s.log?.("Avatar OK (preview station).");
  }

  return { load };
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

function makeBillboardText(s, text, colorHex){
  // very lightweight canvas text sprite
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,512,128);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0,0,512,128);
  ctx.fillStyle = "#00ffff";
  ctx.font = "bold 38px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);

  const tex = new s.THREE.CanvasTexture(canvas);
  const mat = new s.THREE.SpriteMaterial({ map: tex, transparent: true });
  const spr = new s.THREE.Sprite(mat);
  spr.scale.set(2.4, 0.6, 1);
  return spr;
}
