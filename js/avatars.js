import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.159/examples/jsm/loaders/GLTFLoader.js';
import { makePedestal, placeOnGround, setAllCastReceive } from './utils.js';
import { attachFemaleClothesRuntime } from './clothes_female_runtime.js';

const loader = new GLTFLoader();

export async function loadGLB(url){
  return new Promise((resolve)=>{
    loader.load(
      url,
      (gltf)=>resolve(gltf.scene),
      undefined,
      ()=>{
        console.warn('Missing GLB:', url);
        const fb = makeFallbackBox(url);
        resolve(fb);
      }
    );
  });
}

export function makeFallbackBox(label='missing'){
  const g = new THREE.BoxGeometry(0.45, 0.95, 0.35);
  const m = new THREE.MeshStandardMaterial({ roughness:0.9, metalness:0.0 });
  const mesh = new THREE.Mesh(g,m);
  mesh.name = 'Fallback_' + label;
  return mesh;
}

export async function buildDisplayLine({scene, items, origin, facingTarget, diag}){
  const group = new THREE.Group();
  group.name = 'DisplayLine';
  scene.add(group);

  const spacing = 1.3;
  const startX = origin.x - ((items.length-1)*spacing)/2;

  for (let i=0;i<items.length;i++){
    const item = items[i];
    const pedestal = makePedestal(0.28, 0.18);
    pedestal.position.set(startX + i*spacing, origin.y, origin.z);
    group.add(pedestal);

    let model = null;
    const file = './assets/models/' + item.file;

    try{
      model = await loadGLB(file);
      setAllCastReceive(model, true, true);
      model.name = item.name || item.file;

      // normalize scale (glTF cm->m often) — your world is meters, we keep models small
      // If your GLBs are already correct, this does minimal harm.
      if (item.type === 'avatar') model.scale.setScalar(1.0);
      if (item.type === 'npc') model.scale.setScalar(1.0);

      // fix "half in floor"
      placeOnGround(model, pedestal.userData.topY + pedestal.position.y);

      // face user/camera
      model.lookAt(facingTarget.x, model.position.y, facingTarget.z);

      // optional: add runtime clothes for female
      if (item.clothes === 'runtime'){
        try{
          const res = await attachFemaleClothesRuntime(model, {});
          diag?.log(`Clothes attached to ${item.name} parent=${res.parentName}`);
        }catch(e){
          diag?.error(e);
        }
      }

      pedestal.add(model);
      diag?.log(`Loaded: ${item.file}`);
    }catch(e){
      diag?.error(e);
      model = makeFallbackBox(item.name || item.file);
      model.position.y = pedestal.userData.topY + 0.48;
      pedestal.add(model);
      diag?.log(`Fallback used: ${item.file}`);
    }
  }

  return group;
}

export function makeNinjaWalker(ninjaModel, {speed=0.55, radius=1.35}={}){
  const walker = {
    model: ninjaModel,
    t: 0,
    speed,
    radius,
    center: new THREE.Vector3(0,0,0),
  };
  return walker;
}

export function stepNinjaWalker(w, dt){
  if (!w || !w.model) return;
  w.t += dt * w.speed; // smooth, not too fast
  const x = Math.sin(w.t) * w.radius;
  const z = Math.cos(w.t) * w.radius;

  w.model.position.x = w.center.x + x;
  w.model.position.z = w.center.z + z;

  // face tangent direction
  const nx = Math.sin(w.t + 0.02) * w.radius;
  const nz = Math.cos(w.t + 0.02) * w.radius;
  w.model.lookAt(w.center.x + nx, w.model.position.y, w.center.z + nz);
}
