import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

/**
 * Procedural "Master" Avatar with better anatomy:
 * - pelvis + glutes (butt) volume
 * - thighs + shins with knees (upper/lower leg split)
 * - upper/lower arms with elbows (optional)
 * Still no skeleton/rig, but parts are separated for math animation.
 */
export function createMasterAvatar(type='male') {
  const avatar = new THREE.Group();
  avatar.userData.parts = {};

  const skin = new THREE.MeshStandardMaterial({
    color: type === 'female' ? 0xf1c6b5 : 0xd8b59a,
    roughness: 0.42,
    metalness: 0.02
  });

  const clothes = new THREE.MeshStandardMaterial({
    color: type === 'female' ? 0x2c2c2c : 0x343434,
    roughness: 0.85,
    metalness: 0.0
  });

  const add = (name, geo, mat, pos, rot=[0,0,0], scale=[1,1,1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    avatar.add(m);
    avatar.userData.parts[name] = m;
    return m;
  };

  // --- HEAD (skull + jaw)
  add('head', new THREE.SphereGeometry(0.12, 32, 32), skin, [0,1.67,0], [0,0,0], [1,1.22,1.1]);
  add('jaw',  new THREE.SphereGeometry(0.09, 24, 24), skin, [0,1.59,0.055], [0,0,0], [0.95,1.0,1.22]);

  // --- NECK
  add('neck', new THREE.CapsuleGeometry(0.05, 0.07, 8, 16), skin, [0,1.50,0], [0,0,0], [1,1,1]);

  // --- TORSO / CHEST
  const torsoScale = (type==='female') ? [1.05, 1.0, 0.78] : [1.20, 1.0, 0.80];
  add('torso', new THREE.CapsuleGeometry(0.18, 0.52, 16, 32), clothes, [0,1.15,0], [0,0,0], torsoScale);

  // --- SHOULDERS (key silhouette)
  const shoulderX = (type==='female') ? 0.26 : 0.285;
  add('shoulderL', new THREE.SphereGeometry(0.10, 24, 24), skin, [-shoulderX,1.38,0]);
  add('shoulderR', new THREE.SphereGeometry(0.10, 24, 24), skin, [ shoulderX,1.38,0]);

  // --- PELVIS / HIPS + GLUTES (butt)
  // Pelvis block
  add('pelvis', new THREE.CapsuleGeometry(0.15, 0.18, 10, 20), clothes, [0,0.88,0], [0,0,0], (type==='female')?[1.05,1.0,0.85]:[1.10,1.0,0.90]);
  // Glute spheres (slightly back)
  const gluteX = 0.12;
  add('gluteL', new THREE.SphereGeometry(0.10, 18, 18), clothes, [-gluteX,0.82,-0.08], [0,0,0], [1.1,1.0,1.2]);
  add('gluteR', new THREE.SphereGeometry(0.10, 18, 18), clothes, [ gluteX,0.82,-0.08], [0,0,0], [1.1,1.0,1.2]);

  // --- ARMS (upper + lower)
  const armUpper = new THREE.CapsuleGeometry(0.06, 0.28, 10, 20);
  const armLower = new THREE.CapsuleGeometry(0.055, 0.26, 10, 20);

  add('upperArmL', armUpper, skin, [-0.36,1.19,0], [0,0, 0.18]);
  add('lowerArmL', armLower, skin, [-0.43,0.92,0], [0,0, 0.10]);

  add('upperArmR', armUpper, skin, [ 0.36,1.19,0], [0,0,-0.18]);
  add('lowerArmR', armLower, skin, [ 0.43,0.92,0], [0,0,-0.10]);

  // --- LEGS (thigh + shin + knee)
  const thigh = new THREE.CapsuleGeometry(0.10, 0.38, 12, 24);
  const shin  = new THREE.CapsuleGeometry(0.085,0.36, 12, 24);
  const knee  = new THREE.SphereGeometry(0.075, 16, 16);

  const hipX = 0.16;
  // Left
  add('thighL', thigh, clothes, [-hipX,0.62,0], [0,0,0], [1.0,1.0,0.92]);
  add('kneeL',  knee,  clothes, [-hipX,0.40,0.02]);
  add('shinL',  shin,  clothes, [-hipX,0.22,0], [0,0,0], [1.0,1.0,0.90]);

  // Right
  add('thighR', thigh, clothes, [ hipX,0.62,0], [0,0,0], [1.0,1.0,0.92]);
  add('kneeR',  knee,  clothes, [ hipX,0.40,0.02]);
  add('shinR',  shin,  clothes, [ hipX,0.22,0], [0,0,0], [1.0,1.0,0.90]);

  // --- FEET (simple blocks)
  const footGeo = new THREE.BoxGeometry(0.12, 0.05, 0.24);
  add('footL', footGeo, clothes, [-hipX,0.04,0.05]);
  add('footR', footGeo, clothes, [ hipX,0.04,0.05]);

  // Group-level baseline
  avatar.position.y = 0;
  return avatar;
}
