import * as THREE from "three";

export class CardInteractions {
  constructor({ scene, camera, playerRoot, handsCtrl }) {
    this.scene = scene;
    this.camera = camera;
    this.playerRoot = playerRoot;
    this.handsCtrl = handsCtrl;

    this.raycaster = new THREE.Raycaster();
    this.tmpDir = new THREE.Vector3();

    this.cards = [];
    this.playZones = [];
    this.held = null;
  }

  registerCard(mesh, cardId) {
    mesh.userData.cardId = cardId;
    this.cards.push(mesh);
  }

  registerPlayZone(mesh, zoneId) {
    mesh.userData.zoneId = zoneId;
    this.playZones.push(mesh);
  }

  _rayFromRightHand() {
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, -1);
    this.handsCtrl.right.target.getWorldPosition(origin);
    dir.applyQuaternion(this.handsCtrl.right.target.getWorldQuaternion(new THREE.Quaternion())).normalize();
    this.raycaster.set(origin, dir);
  }

  _pick(list) {
    const hits = this.raycaster.intersectObjects(list, true);
    return hits.length ? hits[0].object : null;
  }

  grabRightHand() {
    if (this.held) return;
    this._rayFromRightHand();
    const card = this._pick(this.cards);
    if (!card) return;

    this.held = { mesh: card, byHand: "right" };
    this.handsCtrl.right.gripSocket.add(card);
    card.position.set(0, 0, -0.08);
    card.rotation.set(0, 0, 0);
  }

  releaseHeld() {
    if (!this.held) return;
    this._rayFromRightHand();
    const zone = this._pick(this.playZones);

    const card = this.held.mesh;
    this.scene.add(card);

    if (zone) {
      const snapPos = new THREE.Vector3();
      const snapQuat = new THREE.Quaternion();
      zone.getWorldPosition(snapPos);
      zone.getWorldQuaternion(snapQuat);
      card.position.copy(snapPos);
      card.quaternion.copy(snapQuat);
      console.log("OnCardPlay", card.userData.cardId, "zone", zone.userData.zoneId);
    } else {
      const p = new THREE.Vector3();
      this.playerRoot.getWorldPosition(p);
      card.position.copy(p).add(new THREE.Vector3(0, 1.2, -0.7));
      console.log("OnCardDrop", card.userData.cardId);
    }

    this.held = null;
  }
}
