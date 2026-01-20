import * as THREE from "three";

function dampVec3(out, cur, target, lambda, dt) {
  out.x = THREE.MathUtils.lerp(cur.x, target.x, 1 - Math.exp(-lambda * dt));
  out.y = THREE.MathUtils.lerp(cur.y, target.y, 1 - Math.exp(-lambda * dt));
  out.z = THREE.MathUtils.lerp(cur.z, target.z, 1 - Math.exp(-lambda * dt));
}
function dampQuat(out, cur, target, lambda, dt) {
  out.copy(cur).slerp(target, 1 - Math.exp(-lambda * dt));
}

export class XRHandsController {
  constructor({ renderer, playerRoot }) {
    this.renderer = renderer;
    this.playerRoot = playerRoot;

    this.left = this._makeHand("left");
    this.right = this._makeHand("right");

    this.posLambda = 22;
    this.rotLambda = 22;
    this.waveTime = 0;
  }

  _makeHand(side) {
    const g = new THREE.Group();
    g.name = `${side}_hand_target`;
    this.playerRoot.add(g);

    const gripSocket = new THREE.Group();
    gripSocket.name = `${side}_grip_socket`;
    g.add(gripSocket);

    return {
      side,
      target: g,
      gripSocket,
      tmpPos: new THREE.Vector3(),
      tmpQuat: new THREE.Quaternion(),
    };
  }

  startWave(seconds = 1.2) {
    this.waveTime = Math.max(this.waveTime, seconds);
  }

  update(dt) {
    const session = this.renderer?.xr?.getSession?.();
    if (!session) return;

    const refSpace = this.renderer.xr.getReferenceSpace();
    const frame = this.renderer.xr.getFrame();
    if (!frame) return;

    for (const src of session.inputSources) {
      if (!src.gripSpace) continue;
      const pose = frame.getPose(src.gripSpace, refSpace);
      if (!pose) continue;

      const p = pose.transform.position;
      const o = pose.transform.orientation;

      const side = src.handedness;
      const hand = side === "left" ? this.left : side === "right" ? this.right : null;
      if (!hand) continue;

      hand.tmpPos.set(p.x, p.y, p.z);
      hand.tmpQuat.set(o.x, o.y, o.z, o.w);

      this.playerRoot.worldToLocal(hand.tmpPos);

      const curPos = hand.target.position;
      const newPos = new THREE.Vector3();
      dampVec3(newPos, curPos, hand.tmpPos, this.posLambda, dt);
      hand.target.position.copy(newPos);

      const curQ = hand.target.quaternion;
      const newQ = new THREE.Quaternion();
      dampQuat(newQ, curQ, hand.tmpQuat, this.rotLambda, dt);
      hand.target.quaternion.copy(newQ);
    }

    if (this.waveTime > 0) {
      this.waveTime = Math.max(0, this.waveTime - dt);
      const t = (1.2 - this.waveTime) * 10.0;
      this.right.target.rotation.z = Math.sin(t) * 0.35;
    } else {
      this.right.target.rotation.z = 0;
    }
  }
}
