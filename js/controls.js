import * as THREE from 'three';

export function createFPSControls({ camera, domElement, toast }) {
  const keys = new Set();
  let pointerLocked = false;

  const yaw = new THREE.Object3D();
  const pitch = new THREE.Object3D();
  yaw.add(pitch);
  pitch.add(camera);

  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const move = new THREE.Vector3();

  let moveSpeed = 3.0;
  let runSpeed = 6.0;
  let verticalSpeed = 2.5;
  const mouseSensitivity = 0.0022;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 1400);
  }

  function requestPointerLock() {
    domElement.requestPointerLock();
  }

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === domElement;
    showToast(pointerLocked ? 'Mouse look enabled' : 'Mouse look disabled');
  });

  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked) return;
    const mx = e.movementX || 0;
    const my = e.movementY || 0;

    euler.setFromQuaternion(yaw.quaternion);
    euler.y -= mx * mouseSensitivity;
    yaw.quaternion.setFromEuler(euler);

    euler.setFromQuaternion(pitch.quaternion);
    euler.x -= my * mouseSensitivity;
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
    pitch.quaternion.setFromEuler(euler);
  });

  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  function update(dt) {
    // Forward is -Z in Three.js camera space
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? runSpeed : moveSpeed;

    move.set(0, 0, 0);
    if (keys.has('KeyW')) move.z -= 1;
    if (keys.has('KeyS')) move.z += 1;
    if (keys.has('KeyA')) move.x -= 1;
    if (keys.has('KeyD')) move.x += 1;

    if (keys.has('Space')) move.y += 1;
    if (keys.has('KeyC')) move.y -= 1;

    if (move.lengthSq() === 0) return;
    move.normalize();

    // Horizontal move follows yaw
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yaw.quaternion);
    right.y = 0;
    right.normalize();

    const horiz = new THREE.Vector3();
    horiz.addScaledVector(forward, -move.z);
    horiz.addScaledVector(right, move.x);

    camera.position.addScaledVector(horiz, speed * dt);

    if (Math.abs(move.y) > 0) {
      camera.position.y += move.y * verticalSpeed * dt;
      camera.position.y = Math.max(0.3, Math.min(6.0, camera.position.y));
    }
  }

  function setPosition(x, y, z) {
    camera.position.set(x, y, z);
  }

  return { update, requestPointerLock, setPosition, yaw, pitch };
}
