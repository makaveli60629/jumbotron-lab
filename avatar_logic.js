import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

/** Idle breathing + micro twist */
export function updateAvatarIdle(avatar, t){
  const j = avatar.userData.joints || {};
  const breath = Math.sin(t*2.0) * 0.012;
  if (j.chest)   j.chest.scale.set(1+breath, 1+breath, 1+breath);
  if (j.stomach) j.stomach.scale.set(1+breath*0.6, 1+breath*0.6, 1+breath*0.6);
  if (j.head)    j.head.position.y = 1.70 + breath*0.2;
  if (j.pelvis)  j.pelvis.rotation.y = Math.sin(t*1.1)*0.03;
}

/** Procedural walk that visibly bends knees/elbows */
export function updateAvatarWalk(avatar, t){
  const j = avatar.userData.joints || {};
  updateAvatarIdle(avatar, t);

  const speed = 4.6;
  const a = Math.sin(t*speed);
  const b = Math.sin(t*speed + Math.PI);

  const thighRange = 0.60;
  const kneeRange  = 0.55;
  if (j.legLUpper) j.legLUpper.rotation.x = a * thighRange;
  if (j.legRUpper) j.legRUpper.rotation.x = b * thighRange;

  const kneeL = clamp(Math.max(0, a) * kneeRange, 0, kneeRange);
  const kneeR = clamp(Math.max(0, b) * kneeRange, 0, kneeRange);
  if (j.legLJoint) j.legLJoint.rotation.x = kneeL;
  if (j.legRJoint) j.legRJoint.rotation.x = kneeR;

  const armRange = 0.55;
  if (j.armLUpper) j.armLUpper.rotation.x = b * armRange;
  if (j.armRUpper) j.armRUpper.rotation.x = a * armRange;
  if (j.armLJoint) j.armLJoint.rotation.x = clamp(Math.max(0, b) * 0.35, 0, 0.35);
  if (j.armRJoint) j.armRJoint.rotation.x = clamp(Math.max(0, a) * 0.35, 0, 0.35);

  avatar.position.y = Math.abs(Math.cos(t * speed * 2.0)) * 0.05;
  if (j.chest) j.chest.rotation.y = Math.sin(t*speed) * 0.06;
}

/**
 * Lightweight controller mirroring (not full IK):
 * If XR controllers exist, attach hand groups to controller grip pose.
 * This is a stable placeholder so you SEE hands moving in VR immediately.
 */
export function mirrorHandsToControllers(renderer, avatar, controllers, enabled=true){
  if (!enabled) return;
  if (!renderer.xr.isPresenting) return;
  const j = avatar.userData.joints || {};
  const handL = j.handL;
  const handR = j.handR;
  if (!handL || !handR) return;

  // Use controller 0 as left, 1 as right (common setup)
  if (controllers[0]) {
    controllers[0].getWorldPosition(handL.position);
    controllers[0].getWorldQuaternion(handL.quaternion);
  }
  if (controllers[1]) {
    controllers[1].getWorldPosition(handR.position);
    controllers[1].getWorldQuaternion(handR.quaternion);
  }
}
