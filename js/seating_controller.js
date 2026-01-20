import * as THREE from "three";

function dampVec3(cur, target, lambda, dt) {
  cur.x = THREE.MathUtils.lerp(cur.x, target.x, 1 - Math.exp(-lambda * dt));
  cur.y = THREE.MathUtils.lerp(cur.y, target.y, 1 - Math.exp(-lambda * dt));
  cur.z = THREE.MathUtils.lerp(cur.z, target.z, 1 - Math.exp(-lambda * dt));
}

function dampAngle(cur, target, lambda, dt) {
  const a = THREE.MathUtils.euclideanModulo(cur + Math.PI, Math.PI * 2) - Math.PI;
  const b = THREE.MathUtils.euclideanModulo(target + Math.PI, Math.PI * 2) - Math.PI;
  const d = THREE.MathUtils.euclideanModulo((b - a) + Math.PI, Math.PI * 2) - Math.PI;
  return a + d * (1 - Math.exp(-lambda * dt));
}

export class SeatingController {
  constructor({ scene, camera, playerRoot, avatarCtrl }) {
    this.scene = scene;
    this.camera = camera;
    this.playerRoot = playerRoot;
    this.avatarCtrl = avatarCtrl;

    this.raycaster = new THREE.Raycaster();
    this.tmpDir = new THREE.Vector3();

    this.chairs = [];
    this.seated = false;

    this.seatAnchor = null;
    this.seatExit = null;

    this.snapPosLambda = 18;
    this.snapYawLambda = 18;

    this.movementLocked = false;
  }

  registerChair(chairRoot) {
    this.chairs.push(chairRoot);
  }

  trySit() {
    if (this.seated) return false;

    this.tmpDir.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    this.raycaster.set(this.camera.position, this.tmpDir);

    const hits = this.raycaster.intersectObjects(this.chairs, true);
    if (!hits.length) return false;

    let hitObj = hits[0].object;
    let chairRoot = null;
    while (hitObj) {
      if (this.chairs.includes(hitObj)) { chairRoot = hitObj; break; }
      hitObj = hitObj.parent;
    }
    if (!chairRoot) chairRoot = hits[0].object;

    const seatAnchor = chairRoot.getObjectByName("SeatAnchor") || chairRoot.getObjectByName("seatAnchor");
    if (!seatAnchor) {
      console.warn("Chair missing SeatAnchor:", chairRoot.name);
      return false;
    }
    const seatExit = chairRoot.getObjectByName("SeatExit") || chairRoot.getObjectByName("seatExit") || null;

    this.seatAnchor = seatAnchor;
    this.seatExit = seatExit;

    this.seated = true;
    this.movementLocked = true;

    if (this.avatarCtrl?._play) this.avatarCtrl._play("idle", 0.18);
    return true;
  }

  stand() {
    if (!this.seated) return;

    if (this.seatExit) {
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      this.seatExit.getWorldPosition(p);
      this.seatExit.getWorldQuaternion(q);

      this.playerRoot.position.copy(p);
      const e = new THREE.Euler().setFromQuaternion(q, "YXZ");
      this.playerRoot.rotation.y = e.y;
    }

    this.seated = false;
    this.movementLocked = false;
    this.seatAnchor = null;
    this.seatExit = null;

    if (this.avatarCtrl?._play) this.avatarCtrl._play("idle", 0.12);
  }

  update(dt) {
    if (!this.seated || !this.seatAnchor) return;

    const seatPos = new THREE.Vector3();
    const seatQuat = new THREE.Quaternion();
    this.seatAnchor.getWorldPosition(seatPos);
    this.seatAnchor.getWorldQuaternion(seatQuat);

    dampVec3(this.playerRoot.position, seatPos, this.snapPosLambda, dt);

    const seatEuler = new THREE.Euler().setFromQuaternion(seatQuat, "YXZ");
    this.playerRoot.rotation.y = dampAngle(this.playerRoot.rotation.y, seatEuler.y, this.snapYawLambda, dt);
  }
}
