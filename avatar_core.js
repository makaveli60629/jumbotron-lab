import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function createMasterAvatar(type='male') {
  const avatar = new THREE.Group();
  avatar.userData.parts = {};
  
  const skin = new THREE.MeshStandardMaterial({
    color: type === 'female' ? 0xf1c6b5 : 0xd8b59a,
    roughness: 0.4,
    metalness: 0.02
  });

  const add = (name, geo, pos, rot=[0,0,0], scale=[1,1,1]) => {
    const m = new THREE.Mesh(geo, skin);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    m.castShadow = true;
    avatar.add(m);
    avatar.userData.parts[name] = m;
  };

  // HEAD
  add('head', new THREE.SphereGeometry(0.12, 32, 32), [0,1.65,0],[0,0,0],[1,1.2,1.1]);
  add('jaw', new THREE.SphereGeometry(0.09, 24, 24), [0,1.57,0.05],[0,0,0],[0.9,1,1.2]);

  // TORSO
  add('torso', new THREE.CapsuleGeometry(0.18,0.5,16,32), [0,1.1,0],[0,0,0],
    type==='female'?[1.05,1,0.8]:[1.2,1,0.8]);

  // SHOULDERS
  add('shoulderL', new THREE.SphereGeometry(0.1,24,24), [-0.28,1.35,0]);
  add('shoulderR', new THREE.SphereGeometry(0.1,24,24), [0.28,1.35,0]);

  // ARMS
  add('armL', new THREE.CapsuleGeometry(0.06,0.4,12,24), [-0.35,1.05,0],[0,0,0.15]);
  add('armR', new THREE.CapsuleGeometry(0.06,0.4,12,24), [0.35,1.05,0],[0,0,-0.15]);

  // LEGS
  add('legL', new THREE.CapsuleGeometry(0.1,0.7,12,24), [-0.15,0.4,0]);
  add('legR', new THREE.CapsuleGeometry(0.1,0.7,12,24), [0.15,0.4,0]);

  return avatar;
}
