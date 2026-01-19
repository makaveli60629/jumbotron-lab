import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

/**
 * Update 4.6.1 Procedural Avatar:
 * - True hierarchical joints for elbows/knees/hands/feet
 * - Chest/Stomach/Pelvis pivots for spine diagnostics
 * Returns group with avatar.userData.joints
 */
export function createPerfectAvatar(type='male'){
  const avatar=new THREE.Group();
  const joints = avatar.userData.joints = {};

  const skinColor = (type==='female') ? 0xf1c6b5 : 0xd8b59a;
  const skin = new THREE.MeshStandardMaterial({ color: skinColor, roughness:0.48, metalness:0.05 });
  const cloth = new THREE.MeshStandardMaterial({ color: (type==='female')?0x2a2a2a:0x343434, roughness:0.9, metalness:0.0 });

  const addMesh = (parent, name, geo, mat, pos=[0,0,0], rot=[0,0,0], scale=[1,1,1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    joints[name] = m;
    return m;
  };

  // --- Spine pivots
  const pelvis = new THREE.Group(); pelvis.position.set(0, 0.86, 0); avatar.add(pelvis); joints.pelvis = pelvis;
  const stomach = new THREE.Group(); stomach.position.set(0, 1.02, 0); avatar.add(stomach); joints.stomach = stomach;
  const chest   = new THREE.Group(); chest.position.set(0, 1.26, 0); avatar.add(chest); joints.chest = chest;
  const neck    = new THREE.Group(); neck.position.set(0, 1.52, 0); avatar.add(neck); joints.neck = neck;
  const head    = new THREE.Group(); head.position.set(0, 1.70, 0); avatar.add(head); joints.head = head;

  // Pelvis mesh + glutes
  addMesh(pelvis,'pelvisMesh', new THREE.CapsuleGeometry(0.15,0.18,12,24), cloth, [0,0,0],[0,0,0],
         (type==='female')?[1.12,1.0,0.85]:[1.12,1.0,0.90]);
  const gluteX = 0.12;
  addMesh(avatar,'gluteL', new THREE.SphereGeometry(0.10,18,18), cloth, [-gluteX,0.80,-0.085],[0,0,0],[1.1,1.0,1.2]);
  addMesh(avatar,'gluteR', new THREE.SphereGeometry(0.10,18,18), cloth, [ gluteX,0.80,-0.085],[0,0,0],[1.1,1.0,1.2]);

  // Stomach + chest meshes
  addMesh(stomach,'stomachMesh', new THREE.CapsuleGeometry(0.14,0.30,16,32), cloth, [0,0,0],[0,0,0],
         (type==='female')?[1.05,1.0,0.82]:[1.10,1.0,0.86]);
  addMesh(chest,'chestMesh', new THREE.CapsuleGeometry(0.18,0.42,16,32), cloth, [0,0.14,0],[0,0,0],
         (type==='female')?[1.15,1.0,0.78]:[1.30,1.0,0.82]);

  // Neck mesh
  addMesh(neck,'neckMesh', new THREE.CapsuleGeometry(0.05,0.08,10,18), skin, [0,0,0]);

  // Head meshes
  addMesh(head,'skull', new THREE.SphereGeometry(0.12,32,32), skin, [0,0,0],[0,0,0],[1,1.15,1.05]);
  addMesh(head,'jaw', new THREE.SphereGeometry(0.09,24,24), skin, [0,-0.075,0.045],[0,0,0],[0.95,1.0,1.2]);

  // Hand generator
  const createHand = (isLeft) => {
    const g = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.03,0.09), skin);
    palm.position.set(0,-0.015,0);
    palm.castShadow = true;
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015,0.04,8,8), skin);
    thumb.position.set(isLeft?0.05:-0.05, -0.005, 0.02);
    thumb.rotation.z = isLeft? -Math.PI/4 : Math.PI/4;
    thumb.castShadow = true;
    g.add(palm, thumb);
    return g;
  };

  // Limb builder (root->upper->joint->lower->end)
  function createLimb({upperLen, lowerLen, r, matUpper, matLower, isArm=false, isLeft=true, prefix}){
    const root = new THREE.Group(); joints[prefix+'Root']=root;

    const upperG = new THREE.Group(); root.add(upperG); joints[prefix+'Upper']=upperG;
    addMesh(upperG, prefix+'UpperMesh', new THREE.CapsuleGeometry(r, upperLen, 16, 32), matUpper, [0,-upperLen/2,0]);

    const jointG = new THREE.Group(); jointG.position.set(0,-upperLen,0); upperG.add(jointG); joints[prefix+'Joint']=jointG;
    addMesh(jointG, prefix+'JointMesh', new THREE.SphereGeometry(r*1.08,24,24), matUpper, [0,0,0.01]);

    const lowerG = new THREE.Group(); jointG.add(lowerG); joints[prefix+'Lower']=lowerG;
    addMesh(lowerG, prefix+'LowerMesh', new THREE.CapsuleGeometry(r*0.92, lowerLen, 16, 32), matLower, [0,-lowerLen/2,0],[0,0,0],[0.95,1.0,0.92]);

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

  // Shoulder pivots + shoulder spheres
  const shoulderY = 1.45;
  const shoulderX = (type==='female') ? 0.28 : 0.31;

  const shoulderL = new THREE.Group(); shoulderL.position.set(-shoulderX, shoulderY, 0); avatar.add(shoulderL); joints.shoulderL=shoulderL;
  const shoulderR = new THREE.Group(); shoulderR.position.set( shoulderX, shoulderY, 0); avatar.add(shoulderR); joints.shoulderR=shoulderR;

  addMesh(avatar,'shoulderSphereL', new THREE.SphereGeometry(0.10,24,24), skin, [-shoulderX,shoulderY,0]);
  addMesh(avatar,'shoulderSphereR', new THREE.SphereGeometry(0.10,24,24), skin, [ shoulderX,shoulderY,0]);

  // Arms
  const armL = createLimb({upperLen:0.32, lowerLen:0.28, r:0.062, matUpper:skin, matLower:skin, isArm:true, isLeft:true, prefix:'armL'});
  armL.rotation.z = 0.10; shoulderL.add(armL);

  const armR = createLimb({upperLen:0.32, lowerLen:0.28, r:0.062, matUpper:skin, matLower:skin, isArm:true, isLeft:false, prefix:'armR'});
  armR.rotation.z = -0.10; shoulderR.add(armR);

  // Hip pivots + hip spheres
  const hipY = 0.88;
  const hipX = (type==='female') ? 0.155 : 0.165;

  const hipL = new THREE.Group(); hipL.position.set(-hipX, hipY, 0); avatar.add(hipL); joints.hipL = hipL;
  const hipR = new THREE.Group(); hipR.position.set( hipX, hipY, 0); avatar.add(hipR); joints.hipR = hipR;

  addMesh(avatar,'hipSphereL', new THREE.SphereGeometry(0.11,24,24), cloth, [-hipX,hipY,0]);
  addMesh(avatar,'hipSphereR', new THREE.SphereGeometry(0.11,24,24), cloth, [ hipX,hipY,0]);

  // Legs
  const legL = createLimb({upperLen:0.45, lowerLen:0.40, r:0.090, matUpper:cloth, matLower:cloth, isArm:false, isLeft:true, prefix:'legL'});
  hipL.add(legL);
  const legR = createLimb({upperLen:0.45, lowerLen:0.40, r:0.090, matUpper:cloth, matLower:cloth, isArm:false, isLeft:false, prefix:'legR'});
  hipR.add(legR);

  avatar.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
  return avatar;
}
