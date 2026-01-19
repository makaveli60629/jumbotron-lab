// FILE: index.js | LOCATION: Root | PURPOSE: XR Engine & Animation Loop
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { World } from './world.js';

let scene, camera, renderer, world;
let lastTime = 0;

init();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // Initialize the Logic Controller
    world = new World(scene, camera, renderer);

    // Diagnostic Toggle for Android
    window.toggleDiagnostics = () => {
        const panel = document.getElementById('diag-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    };

    renderer.setAnimationLoop(render);
}

function render(time) {
    const delta = time - lastTime;
    lastTime = time;

    // Update World Modules
    world.update(time);

    // Update Diagnostics
    if (delta > 0) {
        const fps = Math.round(1000 / delta);
        document.getElementById('fps-val').innerText = fps;
    }

    renderer.render(scene, camera);
}
