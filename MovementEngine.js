/**
 * MovementEngine (5.3)
 * - Fixes elbow direction + knee direction by rotating the JOINT pivot,
 *   not the mesh directly, and by using consistent +X flexion.
 */
export function animateHumanoid(avatar, timeSec, mode = 'idle') {
  const p = avatar.parts;
  const t = timeSec;

  // Idle breathing
  if (mode === 'idle') {
    const breathe = Math.sin(t * 1.6) * 0.02;
    if (p.spine0) p.spine0.position.y = 0.14 + breathe * 0.10;
    if (p.spine1) p.spine1.position.y = 0.26 + breathe * 0.10;

    // Relaxed arms slightly away from torso
    if (p.upperArmL) p.upperArmL.rotation.z =  0.18 + breathe * 0.05;
    if (p.upperArmR) p.upperArmR.rotation.z = -0.18 - breathe * 0.05;

    // Slight elbow bend
    if (p.elbowL) p.elbowL.rotation.x = 0.20 + breathe * 0.05;
    if (p.elbowR) p.elbowR.rotation.x = 0.20 + breathe * 0.05;

    // Slight knee bend
    if (p.kneeL) p.kneeL.rotation.x = 0.10;
    if (p.kneeR) p.kneeR.rotation.x = 0.10;
    return;
  }

  // Walk cycle
  const speed = 1.7; // tuned for NPC patrol
  const w = t * Math.PI * 2 * speed;

  // Leg swing (thighs)
  const legSwing = 0.55;
  if (p.upperLegL) p.upperLegL.rotation.x = Math.sin(w) * legSwing;
  if (p.upperLegR) p.upperLegR.rotation.x = Math.sin(w + Math.PI) * legSwing;

  // Knee flexion: only bend on back-swing
  // + rotation.x flexes forward (toward -Z) because limbs point down -Y.
  const kL = Math.max(0, Math.sin(w + Math.PI/2)) * 0.85;
  const kR = Math.max(0, Math.sin(w - Math.PI/2)) * 0.85;
  if (p.kneeL) p.kneeL.rotation.x = kL;
  if (p.kneeR) p.kneeR.rotation.x = kR;

  // Arm swing opposite legs
  const armSwing = 0.35;
  if (p.upperArmL) p.upperArmL.rotation.x = Math.sin(w + Math.PI) * armSwing;
  if (p.upperArmR) p.upperArmR.rotation.x = Math.sin(w) * armSwing;

  // Elbows: small bend that increases on forward swing (natural)
  const eL = 0.15 + Math.max(0, Math.sin(w + Math.PI)) * 0.35;
  const eR = 0.15 + Math.max(0, Math.sin(w)) * 0.35;
  if (p.elbowL) p.elbowL.rotation.x = eL; // correct direction
  if (p.elbowR) p.elbowR.rotation.x = eR;

  // Subtle hip bob (small)
  avatar.root.position.y = Math.abs(Math.cos(w * 2)) * 0.01;
}
