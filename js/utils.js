import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';

export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

export function safeName(o){ return (o && o.name) ? o.name : '(unnamed)'; }

export function placeOnGround(object3D, groundY=0){
  const box = new THREE.Box3().setFromObject(object3D);
  if (!isFinite(box.min.y)) return;
  const offset = groundY - box.min.y;
  object3D.position.y += offset;
}

export function setAllCastReceive(root, cast=true, receive=true){
  root.traverse(o=>{
    if (o.isMesh){
      o.castShadow = cast;
      o.receiveShadow = receive;
      if (o.material){
        if (Array.isArray(o.material)) o.material.forEach(m=>{ m.needsUpdate = true; });
        else o.material.needsUpdate = true;
      }
    }
  });
}

export function makePedestal(radius=0.22, height=0.16){
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius*1.15, radius*1.25, height, 24),
    new THREE.MeshStandardMaterial({ roughness:0.95, metalness:0.02 })
  );
  base.position.y = height/2;
  base.receiveShadow = true;
  group.add(base);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius*1.02, radius*1.02, height*0.35, 24),
    new THREE.MeshStandardMaterial({ roughness:0.85, metalness:0.04 })
  );
  top.position.y = height + (height*0.35)/2;
  top.castShadow = true; top.receiveShadow = true;
  group.add(top);

  group.userData.topY = height + height*0.35;
  return group;
}
