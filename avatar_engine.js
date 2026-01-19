import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

/**
 * Update 4.6.2 Avatar Engine (Avatar-only upgrade)
 * - Keeps these joint keys (required by spine diagnostic): pelvis, stomach, chest, neck, head
 * - Adds sharper silhouette using non-uniform scaling: deltoids, lats V-taper, glutes, thigh/calf shaping
 * - Keeps hierarchical joints: shoulder -> elbow -> hand, hip -> knee -> foot
 */
export function createPerfectAvatar(type='male'){
  const avatar = new THREE.Group();
  const joints = avatar.userData.joints = {};

  const skinColor = (type==='female') ? 0xf1c6b5 : 0xd8b59a;
  const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness:0.46, metalness:0.05 });
  const cloth = new THREE.MeshStandardMaterial({ color: (type==='female')?0x242424:0x2c2c2c, roughness:0.95, metalness:0.0 });

  const addMesh = (parent, key, geo, mat, pos=[0,0,0], rot=[0,0,0], scale=[1,1,1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    joints[key] = m;
    return m;
  };

  // ---------------- Spine pivots (DO NOT BREAK) ----------------
  const pelvis = new THREE.Group(); pelvis.position.set(0, 0.88, 0); avatar.add(pelvis); joints.pelvis = pelvis;
  const stomach = new THREE.Group(); stomach.position.set(0, 1.04, 0); avatar.add(stomach); joints.stomach = stomach;
  const chest   = new THREE.Group(); chest.position.set(0, 1.30, 0); avatar.add(chest);   joints.chest = chest;
  const neck    = new THREE.Group(); neck.position.set(0, 1.56, 0); avatar.add(neck);     joints.neck = neck;
  const head    = new THREE.Group(); head.position.set(0, 1.75, 0); avatar.add(head);     joints.head = head;

  // ---------------- Torso sculpt (V-taper) ----------------
  addMesh(pelvis,'pelvisMesh',
    new THREE.CapsuleGeometry(0.155, 0.20, 14, 28), cloth,
    [0,0,0],[0,0,0],
    (type==='female') ? [1.12,1.0,0.82] : [1.18,1.0,0.88]
  );

  // Glutes (visual butt)
  const gx = 0.13;
  addMesh(avatar,'gluteL', new THREE.SphereGeometry(0.105, 20, 18), cloth, [-gx,0.82,-0.095],[0,0,0],[1.15,1.0,1.25]);
  addMesh(avatar,'gluteR', new THREE.SphereGeometry(0.105, 20, 18), cloth, [ gx,0.82,-0.095],[0,0,0],[1.15,1.0,1.25]);

  addMesh(stomach,'stomachMesh',
    new THREE.CapsuleGeometry(0.145, 0.32, 16, 32), cloth,
    [0,0,0],[0,0,0],
    (type==='female') ? [1.04,1.0,0.80] : [1.08,1.0,0.84]
  );

  addMesh(chest,'chestMesh',
    new THREE.CapsuleGeometry(0.185, 0.44, 18, 36), cloth,
    [0,0.12,0],[0,0,0],
    (type==='female') ? [1.16,1.0,0.76] : [1.34,1.0,0.82]
  );

  // Deltoids (shoulder caps)
  const deltoidGeo = new THREE.SphereGeometry(0.105, 22, 20);
  const shoulderX = (type==='female') ? 0.30 : 0.33;
  addMesh(avatar,'deltoidL', deltoidGeo, skin, [-shoulderX,1.48,0.02],[0,0,0],[1.05,1.0,1.05]);
  addMesh(avatar,'deltoidR', deltoidGeo, skin, [ shoulderX,1.48,0.02],[0,0,0],[1.05,1.0,1.05]);

  // Neck + head sculpt
  addMesh(neck,'neckMesh', new THREE.CylinderGeometry(0.048, 0.060, 0.18, 14), skin, [0,0,0]);
  addMesh(head,'skull', new THREE.SphereGeometry(0.118, 32, 32), skin, [0,0,0],[0,0,0],[1.00,1.22,1.10]);
  addMesh(head,'jaw',   new THREE.SphereGeometry(0.095, 26, 24), skin, [0,-0.080,0.050],[0,0,0],[0.98,1.05,1.25]);

  // Visor/eye orientation hint
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.20,0.05,0.09),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness:0.35, metalness:0.2 })
  );
  visor.position.set(0, 0.02, 0.14);
  visor.castShadow = true; visor.receiveShadow = true;
  head.add(visor);
  joints.visor = visor;

  // ---------------- Limb helpers ----------------
  const createHand = (isLeft) => {
    const g = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.03,0.09), skin);
    palm.position.set(0,-0.015,0);

    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015,0.04,8,10), skin);
    thumb.position.set(isLeft?0.05:-0.05, -0.005, 0.02);
    thumb.rotation.z = isLeft? -Math.PI/4 : Math.PI/4;

    g.add(palm, thumb);
    g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; }});
    return g;
  };

  function createLimb({upperLen, lowerLen, r, matUpper, matLower, isArm=false, isLeft=true, prefix, upperScale=[1,1,1], lowerScale=[1,1,1]}){
    const root = new THREE.Group(); joints[prefix+'Root']=root;

    const upperG = new THREE.Group(); root.add(upperG); joints[prefix+'Upper']=upperG;
    addMesh(upperG, prefix+'UpperMesh', new THREE.CapsuleGeometry(r, upperLen, 16, 32), matUpper, [0,-upperLen/2,0],[0,0,0], upperScale);

    const jointG = new THREE.Group(); jointG.position.set(0,-upperLen,0); upperG.add(jointG); joints[prefix+'Joint']=jointG;
    addMesh(jointG, prefix+'JointMesh', new THREE.SphereGeometry(r*1.10, 24, 24), matUpper, [0,0,0.01]);

    const lowerG = new THREE.Group(); jointG.add(lowerG); joints[prefix+'Lower']=lowerG;
    addMesh(lowerG, prefix+'LowerMesh', new THREE.CapsuleGeometry(r*0.92, lowerLen, 16, 32), matLower, [0,-lowerLen/2,0],[0,0,0], lowerScale);

    const endG = new THREE.Group(); endG.position.set(0,-lowerLen,0); lowerG.add(endG); joints[prefix+'End']=endG;

    if(isArm){
      const hand = createHand(isLeft);
      endG.add(hand);
      joints[isLeft?'handL':'handR'] = endG;
    } else {
      addMesh(endG, prefix+'Foot', new THREE.BoxGeometry(0.12,0.05,0.24), matLower, [0,0.025,0.06]);
      joints[isLeft?'footL':'footR'] = endG;
    }
    return root;
  }

  // Shoulder pivots
  const shoulderY = 1.48;
  const shoulderL = new THREE.Group(); shoulderL.position.set(-shoulderX, shoulderY, 0); avatar.add(shoulderL); joints.shoulderL=shoulderL;
  const shoulderR = new THREE.Group(); shoulderR.position.set( shoulderX, shoulderY, 0); avatar.add(shoulderR); joints.shoulderR=shoulderR;

  // Arms (bicep slightly bulkier, forearm tapered)
  const armL = createLimb({
    upperLen:0.33, lowerLen:0.29, r:0.060,
    matUpper:skin, matLower:skin, isArm:true, isLeft:true, prefix:'armL',
    upperScale:(type==='female')?[0.98,1.0,0.98]:[1.06,1.0,1.00],
    lowerScale:(type==='female')?[0.92,1.0,0.92]:[0.94,1.0,0.92],
  });
  armL.rotation.z = 0.10; shoulderL.add(armL);

  const armR = createLimb({
    upperLen:0.33, lowerLen:0.29, r:0.060,
    matUpper:skin, matLower:skin, isArm:true, isLeft:false, prefix:'armR',
    upperScale:(type==='female')?[0.98,1.0,0.98]:[1.06,1.0,1.00],
    lowerScale:(type==='female')?[0.92,1.0,0.92]:[0.94,1.0,0.92],
  });
  armR.rotation.z = -0.10; shoulderR.add(armR);

  // Hip pivots
  const hipY = 0.90;
  const hipX = (type==='female') ? 0.160 : 0.170;
  const hipL = new THREE.Group(); hipL.position.set(-hipX, hipY, 0); avatar.add(hipL); joints.hipL = hipL;
  const hipR = new THREE.Group(); hipR.position.set( hipX, hipY, 0); avatar.add(hipR); joints.hipR = hipR;

  // Legs (thigh bulk + calf taper)
  const legL = createLimb({
    upperLen:0.47, lowerLen:0.42, r:0.090,
    matUpper:cloth, matLower:cloth, isArm:false, isLeft:true, prefix:'legL',
    upperScale:(type==='female')?[0.98,1.0,0.95]:[1.08,1.0,0.96],
    lowerScale:(type==='female')?[0.92,1.0,0.90]:[0.96,1.0,0.90],
  });
  hipL.add(legL);

  const legR = createLimb({
    upperLen:0.47, lowerLen:0.42, r:0.090,
    matUpper:cloth, matLower:cloth, isArm:false, isLeft:false, prefix:'legR',
    upperScale:(type==='female')?[0.98,1.0,0.95]:[1.08,1.0,0.96],
    lowerScale:(type==='female')?[0.92,1.0,0.90]:[0.96,1.0,0.90],
  });
  hipR.add(legR);

  avatar.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; }});
  return avatar;
}
