import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';
import { createWorld, updateWorld } from './world.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Strict Hand Tracking (No Controllers)
const handModels = new XRHandModelFactory();
const hand1 = renderer.xr.getHand(0);
hand1.add(handModels.createHandModel(hand1, "mesh"));
scene.add(hand1);

const hand2 = renderer.xr.getHand(1);
hand2.add(handModels.createHandModel(hand2, "mesh"));
scene.add(hand2);

// Initialization
createWorld(scene);

// Performance Monitoring for Android
let lastTime = performance.now();
let frames = 0;

renderer.setAnimationLoop(() => {
    // 1. Calculate Android FPS for Diagnostics
    frames++;
    const time = performance.now();
    if (time >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (time - lastTime));
        window.systemFPS = fps; // Global for world.js access
        frames = 0;
        lastTime = time;
    }

    // 2. Update the VR World logic
    updateWorld(hand1, hand2);
    renderer.render(scene, camera);
});
