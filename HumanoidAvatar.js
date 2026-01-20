import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

/**
 * HumanoidAvatar (5.3)
 * - Procedural mesh with visible elbows/knees + better alignment.
 * - Male + Female presets (female has smaller frame + breasts + wider hips).
 * - Parts are Object3D pivots so animation bends correctly.
 */
export class HumanoidAvatar {
  constructor({
    gender = 'male',
    skinColor = 0xd8b59a,
    clothingColor = 0x2a2f38,
    scale = 1.0
  } = {}) {
    this.root = new THREE.Group();
    this.root.name = `HumanoidAvatar_${gender}`;
    this.gender = gender;

    this.matSkin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55, metalness: 0.03 });
    this.matCloth = new THREE.MeshStandardMaterial({ color: clothingColor, roughness: 0.85, metalness: 0.02 });

    this.parts = {}; // pivots + key meshes
    this._build();
    this.root.scale.setScalar(scale);
  }

  _mesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  _pivot(name) {
    const p = new THREE.Group();
    p.name = name;
    this.parts[name] = p;
    return p;
  }

  _buildTorso() {
    const isF = this.gender === 'female';

    // Proportions
    const shoulderW = isF ? 0.33 : 0.40;
    const hipW      = isF ? 0.30 : 0.26;
    const chestW    = isF ? 1.20 : 1.38;
    const waistW    = isF ? 1.08 : 1.15;
    const depth     = isF ? 0.86 : 0.90;

    // Pelvis pivot
    const pelvis = this._pivot('pelvis');
    pelvis.position.set(0, 0.95, 0);
    this.root.add(pelvis);

    // Hips / pelvis mesh (adds butt/back volume)
    const pelvisMesh = this._mesh(new THREE.CapsuleGeometry(0.12, 0.18, 12, 20), this.matCloth);
    pelvisMesh.scale.set(hipW / 0.26, 1.0, 1.05);
    pelvisMesh.position.set(0, 0.05, 0);
    pelvis.add(pelvisMesh);
    this.parts.pelvisMesh = pelvisMesh;

    // Glutes (butt)
    const gluteGeo = new THREE.SphereGeometry(0.085, 18, 18);
    const gluteL = this._mesh(gluteGeo, this.matCloth);
    const gluteR = this._mesh(gluteGeo, this.matCloth);
    gluteL.position.set(-0.09, -0.01, -0.08);
    gluteR.position.set( 0.09, -0.01, -0.08);
    gluteL.scale.set(1.0, 0.95, 1.15);
    gluteR.scale.set(1.0, 0.95, 1.15);
    pelvis.add(gluteL, gluteR);

    // Spine pivots
    const spine0 = this._pivot('spine0'); // waist
    spine0.position.set(0, 0.14, 0);
    pelvis.add(spine0);

    const spine1 = this._pivot('spine1'); // chest
    spine1.position.set(0, 0.26, 0);
    spine0.add(spine1);

    const neck = this._pivot('neck');
    neck.position.set(0, 0.28, 0);
    spine1.add(neck);

    // Waist + chest meshes
    const waist = this._mesh(new THREE.CapsuleGeometry(0.12, 0.28, 14, 24), this.matCloth);
    waist.position.set(0, 0.12, 0);
    waist.scale.set(waistW, 1.0, depth);
    spine0.add(waist);

    const chest = this._mesh(new THREE.CapsuleGeometry(0.14, 0.34, 16, 28), this.matCloth);
    chest.position.set(0, 0.16, 0);
    chest.scale.set(chestW, 1.05, depth);
    spine1.add(chest);

    // Shoulders / traps transition (prevents "buried head")
    const trap = this._mesh(new THREE.CapsuleGeometry(0.10, 0.10, 12, 20), this.matCloth);
    trap.position.set(0, 0.28, 0.02);
    trap.scale.set(1.6, 0.75, 1.0);
    spine1.add(trap);

    // Female breasts
    if (isF) {
      const breastGeo = new THREE.SphereGeometry(0.075, 20, 20);
      const bL = this._mesh(breastGeo, this.matCloth);
      const bR = this._mesh(breastGeo, this.matCloth);
      bL.position.set(-0.10, 0.14, 0.12);
      bR.position.set( 0.10, 0.14, 0.12);
      bL.scale.set(1.05, 0.95, 1.25);
      bR.scale.set(1.05, 0.95, 1.25);
      spine1.add(bL, bR);
    }

    // Head
    const head = this._pivot('head');
    head.position.set(0, 0.22, 0);
    neck.add(head);

    const skull = this._mesh(new THREE.SphereGeometry(0.12, 32, 32), this.matSkin);
    skull.scale.set(1.0, isF ? 1.18 : 1.22, 1.12);
    skull.position.set(0, 0.08, 0);

    const jaw = this._mesh(new THREE.SphereGeometry(0.10, 24, 24), this.matSkin);
    jaw.position.set(0, 0.01, 0.05);
    jaw.scale.set(1.0, 0.85, 1.25);

    // Simple visor to indicate forward
    const visor = this._mesh(new THREE.BoxGeometry(0.18, 0.05, 0.08), new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.15, metalness: 0.5, emissive: 0x000000
    }));
    visor.position.set(0, 0.08, 0.14);

    head.add(skull, jaw, visor);

    // Shoulder anchors (clavicle offsets prevent "hands on shoulders" issue)
    const shoulderL = this._pivot('shoulderL');
    const shoulderR = this._pivot('shoulderR');
    shoulderL.position.set(-shoulderW, 0.22, 0.02);
    shoulderR.position.set( shoulderW, 0.22, 0.02);
    spine1.add(shoulderL, shoulderR);

    // For diagnostics line
    this.parts.shoulderWidth = shoulderW;
    this.parts.hipWidth = hipW;
  }

  _buildLimb({ side = 'L', isArm = true }) {
    const isL = side === 'L';
    const isF = this.gender === 'female';

    // Sizes
    const upperLen = isArm ? (isF ? 0.28 : 0.30) : (isF ? 0.44 : 0.46);
    const lowerLen = isArm ? (isF ? 0.26 : 0.28) : (isF ? 0.44 : 0.46);

    const thickUpper = isArm ? (isF ? 0.050 : 0.058) : (isF ? 0.082 : 0.092);
    const thickLower = thickUpper * (isArm ? 0.86 : 0.88);

    // Pivots
    const pShoulder = this.parts[isArm ? (isL ? 'shoulderL' : 'shoulderR') : 'pelvis'];
    const hipOffsetX = (isL ? -1 : 1) * (isF ? 0.15 : 0.16);

    const upperPivot = this._pivot(`${isArm ? 'upperArm' : 'upperLeg'}${side}`);
    const jointPivot = this._pivot(`${isArm ? 'elbow' : 'knee'}${side}`);
    const lowerPivot = this._pivot(`${isArm ? 'foreArm' : 'lowerLeg'}${side}`);
    const endPivot   = this._pivot(`${isArm ? 'hand' : 'foot'}${side}`);

    // Anchor positions
    if (isArm) {
      upperPivot.position.set(0, 0, 0);
      pShoulder.add(upperPivot);
    } else {
      // hip joint from pelvis
      upperPivot.position.set(hipOffsetX, 0.02, 0.00);
      this.parts.pelvis.add(upperPivot);
    }

    // Upper mesh (origin at joint, extends down -Y)
    const upperGeo = new THREE.CapsuleGeometry(thickUpper, upperLen, 12, 24);
    const upperMesh = this._mesh(upperGeo, isArm ? this.matSkin : this.matCloth);
    upperMesh.position.set(0, -upperLen * 0.5, 0);
    upperMesh.scale.set(1.0, 1.0, isArm ? 0.92 : 0.98);
    upperPivot.add(upperMesh);

    // Joint sphere (elbow/knee)
    jointPivot.position.set(0, -upperLen, 0);
    upperPivot.add(jointPivot);
    const jointMesh = this._mesh(new THREE.SphereGeometry(thickUpper * 1.08, 16, 16), isArm ? this.matSkin : this.matCloth);
    jointMesh.position.set(0, 0, 0);
    jointPivot.add(jointMesh);

    // Lower pivot at joint
    lowerPivot.position.set(0, 0, 0);
    jointPivot.add(lowerPivot);

    // Lower mesh
    const lowerGeo = new THREE.CapsuleGeometry(thickLower, lowerLen, 12, 24);
    const lowerMesh = this._mesh(lowerGeo, isArm ? this.matSkin : this.matCloth);
    lowerMesh.position.set(0, -lowerLen * 0.5, 0);
    lowerMesh.scale.set(0.96, 1.0, isArm ? 0.90 : 0.98);
    lowerPivot.add(lowerMesh);

    // End effector (hand/foot)
    endPivot.position.set(0, -lowerLen, 0);
    lowerPivot.add(endPivot);

    if (isArm) {
      const handGeo = new THREE.BoxGeometry(0.065, 0.02, 0.085);
      const hand = this._mesh(handGeo, this.matSkin);
      hand.position.set(0, -0.01, 0.02);
      endPivot.add(hand);

      // thumb marker
      const thumbGeo = new THREE.CapsuleGeometry(0.010, 0.03, 8, 10);
      const thumb = this._mesh(thumbGeo, this.matSkin);
      thumb.position.set(isL ? 0.03 : -0.03, -0.01, 0.02);
      thumb.rotation.z = isL ? -0.85 : 0.85;
      endPivot.add(thumb);
    } else {
      const footGeo = new THREE.BoxGeometry(0.10, 0.04, 0.16);
      const foot = this._mesh(footGeo, this.matCloth);
      foot.position.set(0, -0.02, 0.04);
      endPivot.add(foot);
    }

    // Store helpful references for animation
    this.parts[`${isArm ? 'upper' : 'thigh'}${side}`] = upperPivot;
    this.parts[`${isArm ? 'joint' : 'knee'}${side}`] = jointPivot;
    this.parts[`${isArm ? 'lower' : 'shin'}${side}`] = lowerPivot;
    this.parts[`${isArm ? 'end' : 'foot'}${side}`] = endPivot;

    return { upperPivot, jointPivot, lowerPivot, endPivot };
  }

  _build() {
    this._buildTorso();

    // Arms
    this._buildLimb({ side: 'L', isArm: true });
    this._buildLimb({ side: 'R', isArm: true });

    // Legs
    this._buildLimb({ side: 'L', isArm: false });
    this._buildLimb({ side: 'R', isArm: false });

    // Ground alignment: feet at y=0
    this.root.position.y = 0.0;
  }

  /**
   * Head/upper torso tracking (limited)
   */
  updateTracking(targetWorldPos, intensity = 1.0) {
    if (!this.parts.head || !this.parts.spine1) return;

    // World to local for spine1
    const spine1 = this.parts.spine1;
    const localTarget = spine1.worldToLocal(targetWorldPos.clone());
    spine1.lookAt(localTarget);

    // clamp
    spine1.rotation.x = THREE.MathUtils.clamp(spine1.rotation.x, -0.25 * intensity, 0.25 * intensity);
    spine1.rotation.y = THREE.MathUtils.clamp(spine1.rotation.y, -0.55 * intensity, 0.55 * intensity);
    spine1.rotation.z = 0;

    const head = this.parts.head;
    const headTarget = head.parent.worldToLocal(targetWorldPos.clone());
    head.lookAt(headTarget);
    head.rotation.x = THREE.MathUtils.clamp(head.rotation.x, -0.35 * intensity, 0.35 * intensity);
    head.rotation.y = THREE.MathUtils.clamp(head.rotation.y, -0.80 * intensity, 0.80 * intensity);
    head.rotation.z = 0;
  }
}
