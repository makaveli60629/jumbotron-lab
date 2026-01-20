import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

/**
 * HumanoidAvatar v5.4
 * - Male/Female anatomy switch (female smaller + breasts + hips)
 * - Proper shoulder chain + elbow/knee pivots
 * - Hair (simple cap + strands)
 * - Parts exposed for SpineDebug and animation
 */
export class HumanoidAvatar{
  constructor({ sex='male', skin=0xd8b59a, hair=true } = {}){
    this.sex = sex;
    this.root = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({ color: skin, roughness:0.55, metalness:0.03 });
    this.parts = {};
    this._buildBody(hair);
  }

  _mesh(geo){
    const m = new THREE.Mesh(geo, this.mat);
    m.castShadow = true; m.receiveShadow = false;
    return m;
  }

  _buildHair(){
    const hairMat = new THREE.MeshStandardMaterial({ color:0x1a1412, roughness:0.8, metalness:0.0 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 18, 0, Math.PI*2, 0, Math.PI*0.55), hairMat);
    cap.position.set(0, 1.78, 0.01);
    cap.scale.set(1.0, 0.82, 1.05);
    cap.castShadow = true;

    // a few "strands" (low poly)
    const strandGeo = new THREE.CapsuleGeometry(0.012, 0.08, 6, 10);
    for (let i=0;i<6;i++){
      const s = new THREE.Mesh(strandGeo, hairMat);
      s.position.set((i-2.5)*0.018, 1.74, 0.12);
      s.rotation.x = 0.9;
      s.castShadow = true;
      this.root.add(s);
    }
    this.root.add(cap);
  }

  _buildBody(hair){
    const female = this.sex === 'female';
    const scale = female ? 0.94 : 1.0;
    this.root.scale.setScalar(scale);

    // --- Spine core ---
    const hips = new THREE.Group(); hips.position.y = 0.92;
    const waist = new THREE.Group(); waist.position.y = 1.10;
    const chest = new THREE.Group(); chest.position.y = 1.35;
    const neck = new THREE.Group(); neck.position.y = 1.55;
    const headPivot = new THREE.Group(); headPivot.position.y = 1.73;

    this.root.add(hips, waist, chest, neck, headPivot);
    this.parts.hips = hips; this.parts.waist = waist; this.parts.chest = chest; this.parts.neck = neck; this.parts.headPivot = headPivot;

    // hips volume
    const hipMesh = this._mesh(new THREE.CapsuleGeometry(0.12, 0.18, 10, 18));
    hipMesh.scale.set(female ? 1.35 : 1.15, 1.0, female ? 1.05 : 0.95);
    hipMesh.position.y = 0.0;
    hips.add(hipMesh);

    const waistMesh = this._mesh(new THREE.CapsuleGeometry(0.11, 0.26, 12, 24));
    waistMesh.scale.set(female ? 1.05 : 1.10, 1.0, 0.85);
    waistMesh.position.y = -0.02;
    waist.add(waistMesh);

    const chestMesh = this._mesh(new THREE.CapsuleGeometry(0.13, 0.28, 14, 28));
    chestMesh.scale.set(female ? 1.08 : 1.35, 1.05, 0.85);
    chestMesh.position.y = 0.0;
    chest.add(chestMesh);

    // female breasts (subtle, low poly but clear)
    if (female){
      const bGeo = new THREE.SphereGeometry(0.065, 18, 14);
      const bL = this._mesh(bGeo); bL.position.set(-0.07, -0.03, 0.10); bL.scale.set(1.0, 0.95, 1.15);
      const bR = this._mesh(bGeo); bR.position.set(0.07, -0.03, 0.10);  bR.scale.set(1.0, 0.95, 1.15);
      chest.add(bL, bR);
    }

    // trapezius-to-neck transition
    const trap = this._mesh(new THREE.CapsuleGeometry(0.10, 0.08, 10, 18));
    trap.position.y = 0.10;
    trap.scale.set(female ? 1.05 : 1.2, 0.9, 0.9);
    chest.add(trap);

    const neckMesh = this._mesh(new THREE.CylinderGeometry(0.045, 0.058, 0.18, 12));
    neckMesh.position.y = 0.02;
    neck.add(neckMesh);

    // head
    const skull = this._mesh(new THREE.SphereGeometry(0.12, 26, 22));
    skull.scale.set(1.0, 1.18, 1.06);
    const jaw = this._mesh(new THREE.SphereGeometry(0.095, 18, 16));
    jaw.position.set(0, -0.08, 0.05);
    jaw.scale.set(0.95, 1.0, 1.15);
    headPivot.add(skull, jaw);
    this.parts.head = headPivot;

    // shoulders (fix: add clavicle + shoulder joints so arms do not start inside the chest)
    const shoulderL = new THREE.Group(); shoulderL.position.set(-0.30, 1.48, 0);
    const shoulderR = new THREE.Group(); shoulderR.position.set( 0.30, 1.48, 0);
    chest.add(shoulderL, shoulderR);
    this.parts.shoulderL = shoulderL; this.parts.shoulderR = shoulderR;

    const clavGeo = new THREE.CapsuleGeometry(0.03, 0.18, 8, 16);
    const clavL = this._mesh(clavGeo); clavL.rotation.z = 0.55; clavL.position.set(0.08, -0.03, 0.02);
    const clavR = this._mesh(clavGeo); clavR.rotation.z = -0.55; clavR.position.set(-0.08, -0.03, 0.02);
    shoulderL.add(clavL); shoulderR.add(clavR);

    const deltoidGeo = new THREE.SphereGeometry(0.085, 18, 16);
    const deltL = this._mesh(deltoidGeo); deltL.position.set(0,0,0);
    const deltR = this._mesh(deltoidGeo); deltR.position.set(0,0,0);
    shoulderL.add(deltL); shoulderR.add(deltR);

    // limbs helpers
    const buildArm = (isLeft)=>{
      const g = new THREE.Group();
      const upperLen = female ? 0.26 : 0.29;
      const lowerLen = female ? 0.24 : 0.27;
      const r = female ? 0.050 : 0.056;

      const upper = this._mesh(new THREE.CapsuleGeometry(r, upperLen, 10, 20));
      upper.position.y = -upperLen/2;

      const elbow = new THREE.Group();
      elbow.position.y = -upperLen;

      const joint = this._mesh(new THREE.SphereGeometry(r*1.05, 14, 12));
      elbow.add(joint);

      const lower = this._mesh(new THREE.CapsuleGeometry(r*0.88, lowerLen, 10, 20));
      lower.position.y = -lowerLen/2;
      elbow.add(lower);

      // wrist
      const wrist = new THREE.Group();
      wrist.position.y = -lowerLen;
      elbow.add(wrist);

      // hand
      const palm = this._mesh(new THREE.BoxGeometry(0.06, 0.018, 0.075));
      palm.position.y = -0.02;
      const thumb = this._mesh(new THREE.CapsuleGeometry(0.01, 0.035, 6, 10));
      thumb.position.set(isLeft ? 0.035 : -0.035, -0.02, 0.02);
      thumb.rotation.z = isLeft ? -0.9 : 0.9;
      wrist.add(palm, thumb);

      // connect
      g.add(upper, elbow);

      // expose parts
      if (isLeft){ this.parts.elbowL = elbow; this.parts.wristL = wrist; }
      else { this.parts.elbowR = elbow; this.parts.wristR = wrist; }

      // default outward elbow "pole" so it doesn't bend backwards during walk
      elbow.rotation.z = isLeft ? 0.08 : -0.08;

      return g;
    };

    const buildLeg = (isLeft)=>{
      const g = new THREE.Group();
      const upperLen = female ? 0.40 : 0.45;
      const lowerLen = female ? 0.40 : 0.45;
      const r = female ? 0.078 : 0.090;

      const upper = this._mesh(new THREE.CapsuleGeometry(r, upperLen, 10, 20));
      upper.position.y = -upperLen/2;

      const knee = new THREE.Group();
      knee.position.y = -upperLen;

      const joint = this._mesh(new THREE.SphereGeometry(r*1.02, 14, 12));
      knee.add(joint);

      const lower = this._mesh(new THREE.CapsuleGeometry(r*0.86, lowerLen, 10, 20));
      lower.position.y = -lowerLen/2;
      knee.add(lower);

      const ankle = new THREE.Group();
      ankle.position.y = -lowerLen;
      knee.add(ankle);

      // foot
      const foot = this._mesh(new THREE.BoxGeometry(0.10, 0.04, 0.20));
      foot.position.set(0, -0.03, 0.05);
      ankle.add(foot);

      g.add(upper, knee);

      if (isLeft){ this.parts.kneeL = knee; this.parts.ankleL = ankle; }
      else { this.parts.kneeR = knee; this.parts.ankleR = ankle; }

      return g;
    };

    const hipL = new THREE.Group(); hipL.position.set(-0.16, 0.92, 0);
    const hipR = new THREE.Group(); hipR.position.set( 0.16, 0.92, 0);
    hips.add(hipL, hipR);
    this.parts.hipL = hipL; this.parts.hipR = hipR;

    hipL.add(buildLeg(true));
    hipR.add(buildLeg(false));

    shoulderL.add(buildArm(true));
    shoulderR.add(buildArm(false));

    if (hair) this._buildHair();

    // Slight overall posture
    chest.rotation.x = -0.03;
    hips.rotation.x = 0.02;
  }

  updateTracking(targetPosition){
    this.parts.head.lookAt(targetPosition);
    this.parts.head.rotation.x = Math.max(-0.35, Math.min(0.35, this.parts.head.rotation.x));
    this.parts.head.rotation.y = Math.max(-0.9, Math.min(0.9, this.parts.head.rotation.y));
  }
}
