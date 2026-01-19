/**
 * Math-only animation.
 * - always-on breathing
 * - optional walking: thigh+shin swing, knee assist, arm swing, hip bob
 */
export function updateAvatar(avatar, t, walking=false) {
  const p = avatar.userData.parts || {};

  // Breathing (subtle)
  const breath = Math.sin(t * 2.0) * 0.012;
  if (p.torso) p.torso.scale.set(1 + breath, 1 + breath, 1 + breath);
  if (p.head)  p.head.position.y = 1.67 + breath * 0.25;

  if (!walking) return;

  const stepSpeed = 4.6;
  const a = Math.sin(t * stepSpeed);
  const b = Math.sin(t * stepSpeed + Math.PI);
  const rangeThigh = 0.55;
  const rangeShin  = 0.35;
  const armRange   = 0.55;

  // Thigh swing
  if (p.thighL) p.thighL.rotation.x = a * rangeThigh;
  if (p.thighR) p.thighR.rotation.x = b * rangeThigh;

  // Shin counter-bend (knee feel)
  if (p.shinL)  p.shinL.rotation.x  = (-a * rangeShin) + Math.max(0, a) * 0.20;
  if (p.shinR)  p.shinR.rotation.x  = (-b * rangeShin) + Math.max(0, b) * 0.20;

  // Arms oppose legs
  if (p.upperArmL) p.upperArmL.rotation.x = b * armRange;
  if (p.upperArmR) p.upperArmR.rotation.x = a * armRange;
  if (p.lowerArmL) p.lowerArmL.rotation.x = (b * 0.35);
  if (p.lowerArmR) p.lowerArmR.rotation.x = (a * 0.35);

  // Hip bob
  avatar.position.y = Math.abs(Math.cos(t * stepSpeed * 2.0)) * 0.05;

  // Slight torso twist for life
  if (p.torso) p.torso.rotation.y = Math.sin(t * stepSpeed) * 0.06;
}
