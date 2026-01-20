/**
 * Animation: idle breathing + walking with correct hinge directions.
 * Uses the avatar's joint Groups (elbow/knee) so bends stay consistent.
 */

export function animateHumanoid(avatar, time, isWalking=false){
  const p = avatar.parts;
  const t = time;

  // Idle breathing
  const b = Math.sin(t*1.5)*0.012;
  if (p.chest) p.chest.position.y = 1.35 + b;
  if (p.headPivot) p.headPivot.position.y = 1.73 + b*0.5;

  if (!isWalking){
    // slight arm sway
    if (p.elbowL) p.elbowL.rotation.x = 0.05 + Math.sin(t*0.7)*0.04;
    if (p.elbowR) p.elbowR.rotation.x = 0.05 + Math.sin(t*0.7+Math.PI)*0.04;
    return;
  }
}

export function steerWalkCycle(avatar, time, intensity=1.0){
  const p = avatar.parts;
  const t = time * 5.0;
  const walk = Math.min(1.0, Math.max(0.0, intensity*0.08));

  const leg = 0.55 * walk;
  const arm = 0.40 * walk;

  // knees bend forward: positive x rotation
  if (p.kneeL) p.kneeL.rotation.x = Math.max(0, Math.sin(t) * leg);
  if (p.kneeR) p.kneeR.rotation.x = Math.max(0, Math.sin(t+Math.PI) * leg);

  // elbows bend forward: positive x rotation (plus small outward z pole already set)
  if (p.elbowL) p.elbowL.rotation.x = Math.max(0, Math.sin(t+Math.PI) * arm);
  if (p.elbowR) p.elbowR.rotation.x = Math.max(0, Math.sin(t) * arm);

  // hip swing (subtle)
  if (p.hipL) p.hipL.rotation.x = Math.sin(t) * 0.18 * walk;
  if (p.hipR) p.hipR.rotation.x = Math.sin(t+Math.PI) * 0.18 * walk;

  // shoulder swing
  if (p.shoulderL) p.shoulderL.rotation.x = Math.sin(t+Math.PI) * 0.12 * walk;
  if (p.shoulderR) p.shoulderR.rotation.x = Math.sin(t) * 0.12 * walk;

  // grounding
  avatar.root.position.y = Math.abs(Math.cos(t*2)) * 0.02 * walk;
}
