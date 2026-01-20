// GitHub-Pages-safe NPC bot controller (no bare imports).
// main.js passes in THREE + loaders.

export class BotManager {
  constructor({ scene, THREE, GLTFLoader, SkeletonUtils, navTargets = [], debug = false } = {}) {
    this.scene = scene;
    this.THREE = THREE;
    this.GLTFLoader = GLTFLoader;
    this.SkeletonUtils = SkeletonUtils;
    this.debug = !!debug;

    this.loader = new this.GLTFLoader();
    this.bots = [];
    this.mixers = [];
    this.clock = new this.THREE.Clock();

    this.navTargets = navTargets.length
      ? navTargets
      : [
          new this.THREE.Vector3(0, 0, -4),
          new this.THREE.Vector3(3, 0, -2),
          new this.THREE.Vector3(-3, 0, -2),
          new this.THREE.Vector3(0, 0, 2),
        ];
  }

  async loadGLB(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  async spawnBot({
    avatarUrl,
    position,
    scale = 1.0,
    speed = 0.9,
    preferAnimationNames = ["walk", "run", "idle"],
    forwardFlip = false,
  } = {}) {
    const THREE = this.THREE;
    const gltf = await this.loadGLB(avatarUrl);

    const root = this.SkeletonUtils.clone(gltf.scene);

    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          o.material.side = THREE.DoubleSide;
          o.frustumCulled = false;
        }
      }
    });

    root.scale.setScalar(scale);
    root.position.copy(position || new THREE.Vector3(0, 0, -2));

    if (forwardFlip) {
      root.rotation.y += Math.PI;
    }

    const mixer = new THREE.AnimationMixer(root);
    let action = null;
    if (gltf.animations && gltf.animations.length) {
      const clip = pickClip(gltf.animations, preferAnimationNames) || gltf.animations[0];
      action = mixer.clipAction(clip);
      action.play();
    }

    const bot = {
      root,
      mixer,
      action,
      speed,
      targetIndex: Math.floor(Math.random() * this.navTargets.length),
      velocity: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
    };

    this.scene.add(root);
    this.bots.push(bot);
    this.mixers.push(mixer);
    return bot;
  }

  update() {
    const THREE = this.THREE;
    const dt = this.clock.getDelta();

    for (const mx of this.mixers) mx.update(dt);

    for (const bot of this.bots) {
      const target = this.navTargets[bot.targetIndex];
      bot.tmp.copy(target).sub(bot.root.position);
      bot.tmp.y = 0;

      const dist = bot.tmp.length();
      if (dist < 0.25) {
        bot.targetIndex = (bot.targetIndex + 1) % this.navTargets.length;
        continue;
      }

      bot.tmp.normalize();
      bot.velocity.copy(bot.tmp).multiplyScalar(bot.speed * dt);
      bot.root.position.add(bot.velocity);

      // Face direction of travel (prevents walking backwards from movement logic)
      if (bot.velocity.lengthSq() > 1e-6) {
        const lookDir = bot.velocity.clone().normalize();
        const yaw = Math.atan2(lookDir.x, lookDir.z);
        bot.root.rotation.y = yaw;
      }

      // keep on floor
      bot.root.position.y = 0;
    }
  }
}

function pickClip(clips, preferredNames) {
  const prefs = (preferredNames || []).map((s) => String(s).toLowerCase());
  for (const p of prefs) {
    const found = clips.find((c) => (c.name || "").toLowerCase().includes(p));
    if (found) return found;
  }
  return null;
}
