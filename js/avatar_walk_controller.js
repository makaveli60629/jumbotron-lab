import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}
function dampAngle(current, target, lambda, dt) {
  const a = THREE.MathUtils.euclideanModulo(current + Math.PI, Math.PI * 2) - Math.PI;
  const b = THREE.MathUtils.euclideanModulo(target + Math.PI, Math.PI * 2) - Math.PI;
  const delta = THREE.MathUtils.euclideanModulo((b - a) + Math.PI, Math.PI * 2) - Math.PI;
  return a + delta * (1 - Math.exp(-lambda * dt));
}

function nameHasAny(name, words) {
  const s = (name || "").toLowerCase();
  return words.some(w => s.includes(w));
}
function findBestClip(anims, preferWords, rejectWords) {
  // Prefer: clips containing any preferWords, and NOT containing rejectWords.
  // If multiple, pick the one with the *most* prefer matches.
  let best = null;
  let bestScore = -1;
  for (const c of anims) {
    const n = (c.name || "").toLowerCase();
    if (!n) continue;
    if (rejectWords && nameHasAny(n, rejectWords)) continue;
    let score = 0;
    for (const w of preferWords) if (n.includes(w)) score++;
    if (score > bestScore && score > 0) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
function fallbackClip(anims, rejectWords) {
  // last resort: first clip that's not rejected
  for (const c of anims) {
    const n = (c.name || "").toLowerCase();
    if (rejectWords && nameHasAny(n, rejectWords)) continue;
    return c;
  }
  return null;
}

export class AvatarWalkController {
  constructor({
    scene,
    playerRoot,
    camera,
    glbUrl,
    faceFixYawRad = 0,
    // Optional: force exact clip names if your GLB is weird
    clipOverrides = { idle: null, walk: null, run: null }
  }) {
    this.scene = scene;
    this.playerRoot = playerRoot;
    this.camera = camera;

    this.maxWalkSpeed = 1.6;
    this.maxRunSpeed  = 3.2;
    this.accelLambda  = 10.0;
    this.turnLambda   = 14.0;

    this.velocity = new THREE.Vector3();
    this.targetVel = new THREE.Vector3();

    this.moveInput = new THREE.Vector2(0, 0);
    this.runHeld = false;

    this.avatar = null;
    this.mixer = null;
    this.actions = {};
    this.current = null;

    this.hips = null;
    this.hipsBindXZ = null;

    this.faceFixYawRad = faceFixYawRad;
    this.clipOverrides = clipOverrides || {};

    this._loader = new GLTFLoader();
    this._load(glbUrl);
  }

  async _load(url) {
    const gltf = await this._loader.loadAsync(url);
    this.avatar = gltf.scene;
    this.avatar.position.set(0, 0, 0);
    this.avatar.rotation.set(0, this.faceFixYawRad, 0);
    this.playerRoot.add(this.avatar);

    this.mixer = new THREE.AnimationMixer(this.avatar);
    const anims = gltf.animations || [];

    // Reject combat / emote poses that look like "squaring up"
    const REJECT = ["fight","fighting","punch","box","boxing","kick","attack","combat","uppercut","jab","guard","block","stance"];

    // 1) Optional overrides (exact name match, case-insensitive)
    const byExact = (wantName) => {
      if (!wantName) return null;
      const w = wantName.toLowerCase();
      return anims.find(a => (a.name || "").toLowerCase() === w) || null;
    };

    let idle = byExact(this.clipOverrides.idle);
    let walk = byExact(this.clipOverrides.walk);
    let run  = byExact(this.clipOverrides.run);

    // 2) Smart selection (non-combat)
    if (!idle) idle = findBestClip(anims, ["idle","breath","relax"], REJECT);
    if (!walk) walk = findBestClip(anims, ["walk","walking","locomotion"], REJECT);
    if (!run)  run  = findBestClip(anims, ["run","running","jog","sprint"], REJECT);

    // 3) Safe fallbacks (still non-combat)
    if (!idle) idle = fallbackClip(anims, REJECT);
    if (!walk) walk = idle; // if no walk, re-use idle (won't crash)
    if (!run)  run  = walk;

    if (idle) this.actions.idle = this.mixer.clipAction(idle);
    if (walk) this.actions.walk = this.mixer.clipAction(walk);
    if (run)  this.actions.run  = this.mixer.clipAction(run);

    Object.values(this.actions).forEach(a => {
      a.enabled = true;
      a.setEffectiveWeight(1);
      a.setEffectiveTimeScale(1);
    });

    this.hips =
      this.avatar.getObjectByName("Hips") ||
      this.avatar.getObjectByName("hips") ||
      this.avatar.getObjectByName("mixamorigHips") ||
      this.avatar.getObjectByName("mixamorig:Hips");

    if (this.hips) {
      this.hipsBindXZ = new THREE.Vector2(this.hips.position.x, this.hips.position.z);
    }

    this._play("idle", 0.0);
  }

  setMoveInput(x, y) { this.moveInput.set(x, y); }
  setRunHeld(v) { this.runHeld = !!v; }

  _play(name, fade = 0.15) {
    const next = this.actions[name];
    if (!next || next === this.current) return;
    next.reset().play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
  }

  _getYaw() {
    if (!this.camera) return this.playerRoot.rotation.y;
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    return e.y;
  }

  update(dt) {
    if (!this.avatar) return;

    const yaw = this._getYaw();
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const right   = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    const wish = new THREE.Vector3()
      .addScaledVector(right, this.moveInput.x)
      .addScaledVector(forward, this.moveInput.y);

    let mag = THREE.MathUtils.clamp(wish.length(), 0, 1);
    if (mag > 0.001) wish.normalize();

    const speed = this.runHeld ? this.maxRunSpeed : this.maxWalkSpeed;
    this.targetVel.copy(wish).multiplyScalar(speed * mag);

    this.velocity.x = damp(this.velocity.x, this.targetVel.x, this.accelLambda, dt);
    this.velocity.z = damp(this.velocity.z, this.targetVel.z, this.accelLambda, dt);

    this.playerRoot.position.x += this.velocity.x * dt;
    this.playerRoot.position.z += this.velocity.z * dt;

    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (planarSpeed > 0.08) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      this.playerRoot.rotation.y = dampAngle(this.playerRoot.rotation.y, targetYaw, this.turnLambda, dt);
    }

    if (planarSpeed < 0.10) {
      this._play("idle", 0.2);
    } else if (this.runHeld && this.actions.run) {
      this._play("run", 0.12);
      const t = THREE.MathUtils.clamp(planarSpeed / this.maxRunSpeed, 0.85, 1.20);
      this.current?.setEffectiveTimeScale(t);
    } else {
      this._play("walk", 0.12);
      const t = THREE.MathUtils.clamp(planarSpeed / this.maxWalkSpeed, 0.85, 1.20);
      this.current?.setEffectiveTimeScale(t);
    }

    this.mixer?.update(dt);

    // Kill root-motion drift so locomotion is authoritative
    if (this.hips && this.hipsBindXZ) {
      this.hips.position.x = this.hipsBindXZ.x;
      this.hips.position.z = this.hipsBindXZ.y;
    }
  }
}
