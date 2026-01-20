import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { toast } from './diagnostics.js';

/**
 * Jumbotron: emissive video texture on a wall plane.
 * Autoplay attempts muted; provide unmute/play helper.
 * Uses CC0 sample video (MDN).
 */
export function createJumbotron({ width = 3.0, height = 1.7 } = {}) {
  const group = new THREE.Group();
  group.name = 'Jumbotron';

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.35, metalness: 0.55 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.08), frameMat);
  frame.castShadow = true;
  group.add(frame);

  // HTML video element
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.loop = true;
  video.muted = true; // autoplay-friendly
  video.preload = 'auto';
  // CC0 / demo video (stable)
  video.src = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

  const vtex = new THREE.VideoTexture(video);
  vtex.colorSpace = THREE.SRGBColorSpace;
  vtex.generateMipmaps = false;

  // Screen material: emissive makes it "pop"
  const screenMat = new THREE.MeshStandardMaterial({
    map: vtex,
    emissiveMap: vtex,
    emissive: 0xffffff,
    emissiveIntensity: 2.2,
    roughness: 0.25,
    metalness: 0.0
  });

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), screenMat);
  screen.position.set(0, 0, 0.045);
  group.add(screen);

  // Attempt autoplay
  const tryPlay = async () => {
    try {
      await video.play();
      toast('Jumbotron: playing (muted). Tap Unmute for audio.');
      return true;
    } catch (e) {
      toast('Jumbotron: autoplay blocked. Tap Unmute/Play.');
      return false;
    }
  };

  const unmute = async () => {
    try {
      video.muted = false;
      video.volume = 1.0;
      if (video.paused) await video.play();
      toast('Audio ON');
      return true;
    } catch (e) {
      // fallback: keep muted but playing
      video.muted = true;
      toast('Audio blocked (need user gesture). Tap again.');
      return false;
    }
  };

  const mute = () => {
    video.muted = true;
    toast('Audio OFF');
  };

  return { group, video, tryPlay, unmute, mute };
}
