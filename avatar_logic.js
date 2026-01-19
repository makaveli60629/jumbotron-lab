export function updateWalk(avatar, t, walking=true) {
  const p = avatar.userData.parts;
  const speed = 4;
  const range = 0.5;

  const breath = Math.sin(t*2)*0.015;
  p.torso.scale.set(1+breath,1+breath,1+breath);

  if(!walking) return;

  p.legL.rotation.x = Math.sin(t*speed)*range;
  p.legR.rotation.x = Math.sin(t*speed+Math.PI)*range;
  p.armL.rotation.x = Math.sin(t*speed+Math.PI)*range;
  p.armR.rotation.x = Math.sin(t*speed)*range;

  avatar.position.y = Math.abs(Math.cos(t*speed*2))*0.04;
}
