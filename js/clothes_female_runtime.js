import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';
import { safeName } from './utils.js';

function safeFind(root, names){
  let found = null;
  root.traverse((o)=>{ if(!found && names.includes(o.name)) found=o; });
  return found;
}

function loadTexture(url){
  return new Promise((resolve)=>{
    const loader = new THREE.TextureLoader();
    loader.load(url, (t)=>{ t.flipY=false; resolve(t); }, undefined, ()=>resolve(null));
  });
}

// Your extracted bounds → runtime proxy garments
function buildShirtGeom(){
  const width=110, height=70, depth=32;
  const g=new THREE.BoxGeometry(width,height,depth,6,14,4);
  g.translate(0,105+height/2,0);
  return g;
}

function buildPantsGeom(){
  const height=110, waist=70, depth=32;
  const g=new THREE.BoxGeometry(waist,height,depth,6,18,4);
  g.translate(0,height/2,0);

  const thigh=12.5, ankle=7.5, half=waist/2;
  const pos=g.attributes.position, v=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){
    v.fromBufferAttribute(pos,i);
    const t=THREE.MathUtils.clamp(v.y/height,0,1);
    const target=THREE.MathUtils.lerp(ankle,thigh,t);
    v.x*=target/half;
    pos.setXYZ(i,v.x,v.y,v.z);
  }
  pos.needsUpdate=true;
  g.computeVertexNormals();
  return g;
}

export async function attachFemaleClothesRuntime(avatarScene, options={}){
  const parent = safeFind(avatarScene, ['Girl_Base','Armature','GirlBase']) || avatarScene;

  const shirtTex = await loadTexture(options.shirtTex || './assets/textures/shirt_texture.png');
  const pantsTex = await loadTexture(options.pantsTex || './assets/textures/pants_texture.png');

  const shirtMat = new THREE.MeshStandardMaterial({ name:'Shirt_Texture', map: shirtTex || null, roughness:0.9, metalness:0.0 });
  const pantsMat = new THREE.MeshStandardMaterial({ name:'Pants_Texture', map: pantsTex || null, roughness:0.95, metalness:0.0 });

  const shirt = new THREE.Mesh(buildShirtGeom(), shirtMat);
  shirt.name = 'Runtime_Shirt_Female';
  shirt.position.z += 0.02;

  const pants = new THREE.Mesh(buildPantsGeom(), pantsMat);
  pants.name = 'Runtime_Pants_Female';
  pants.position.z += 0.01;

  parent.add(shirt);
  parent.add(pants);
  return { shirt, pants, parentName: safeName(parent) };
}
