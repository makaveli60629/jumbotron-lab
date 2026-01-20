import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/addons/utils/SkeletonUtils.js';

export class BotManager {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.bots = [];
    this.mixers = [];
    this.clock = new THREE.Clock();
    this.navTargets = opts.navTargets || [];
    this.diagnostics = opts.diagnostics || null;
  }

  async loadBotGLB(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  async spawnWalkingBot({
    avatarUrl,
    start = new THREE.Vector3(0, 0, -2),
    scale = 1.0,
    speed = 0.95,
    forwardFlip = false,
    preferAnimationNames = ['walk', 'running', 'run', 'idle'],
  }) {
    const gltf = await this.loadBotGLB(avatarUrl);

    const root = SkeletonUtils.clone(gltf.scene);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) o.material.side = THREE.DoubleSide;
      }
    });

    root.position.copy(start);
    root.scale.setScalar(scale);
    if (forwardFlip) root.rotation.y += Math.PI;

    const mixer = new THREE.AnimationMixer(root);
    let action = null;
    if (gltf.animations && gltf.animations.length) {
      const clip = pickClip(gltf.animations, preferAnimationNames) || gltf.animations[0];
      action = mixer.clipAction(clip);
      action.play();
      this.diagnostics?.logWarn?.(`Bot animation: ${clip.name || '(unnamed clip)'}`);
    } else {
      this.diagnostics?.logWarn?.('Bot GLB has no animations. Bot will still move, but no walk cycle.');
    }

    const bot = {
      root,
      mixer,
      action,
      speed,
      targetIndex: Math.floor(Math.random() * Math.max(1, this.navTargets.length)),
      velocity: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
    };

    this.scene.add(root);
    this.bots.push(bot);
    this.mixers.push(mixer);

    return bot;
  }

  update() {
    const dt = this.clock.getDelta();

    for (const mx of this.mixers) mx.update(dt);

    if (!this.navTargets.length) return;

    for (const bot of this.bots) {
      const target = this.navTargets[bot.targetIndex % this.navTargets.length];
      bot.tmp.copy(target).sub(bot.root.position);
      bot.tmp.y = 0;

      const dist = bot.tmp.length();
      if (dist < 0.35) {
        bot.targetIndex = (bot.targetIndex + 1) % this.navTargets.length;
        continue;
      }

      bot.tmp.normalize();
      bot.velocity.copy(bot.tmp).multiplyScalar(bot.speed * dt);
      bot.root.position.add(bot.velocity);

      // Face direction of travel (fixes “walking backwards” visuals in most rigs)
      if (bot.velocity.lengthSq() > 1e-6) {
        const lookDir = bot.velocity.clone().normalize();
        const yaw = Math.atan2(lookDir.x, lookDir.z);
        bot.root.rotation.y = yaw;
      }
    }
  }
}

function pickClip(clips, preferredNames) {
  const prefs = (preferredNames || []).map((s) => String(s).toLowerCase());
  for (const pref of prefs) {
    const found = clips.find((c) => String(c.name || '').toLowerCase().includes(pref));
    if (found) return found;
  }
  return null;
}
