import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { createWorld, updateWorld } from './world.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Hand Tracking Setup
const handModels = new XRHandModelFactory();
const hand1 = renderer.xr.getHand(0);
hand1.add(handModels.createHandModel(hand1, "mesh"));
scene.add(hand1);

const hand2 = renderer.xr.getHand(1);
hand2.add(handModels.createHandModel(hand2, "mesh"));
scene.add(hand2);

createWorld(scene);

// Android Diagnostics Logic
let lastTime = performance.now();
let frames = 0;
window.fps = 0;

renderer.setAnimationLoop(() => {
    frames++;
    const now = performance.now();
    if (now >= lastTime + 1000) {
        window.fps = frames;
        frames = 0;
        lastTime = now;
    }

    updateWorld(hand1, hand2);
    renderer.render(scene, camera);
});
