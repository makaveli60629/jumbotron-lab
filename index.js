import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { VRButton } from "https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js";
import { World } from "./js/world.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const player = new THREE.Group();
player.add(camera);
scene.add(player);
camera.position.set(0,1.6,2);

const world = new World(scene, camera, renderer);

let last = performance.now();
renderer.setAnimationLoop(t=>{
 const dt=(t-last)/1000; last=t;
 world.update(dt,t);
 renderer.render(scene,camera);
});
