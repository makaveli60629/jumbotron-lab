import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/webxr/VRButton.js';
import { createMasterAvatar } from './avatar_core.js';
import { updateWalk } from './avatar_logic.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0,1.6,3);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const hemi = new THREE.HemisphereLight(0xffffff,0x444444,0.6);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff,0.8);
dir.position.set(5,10,5);
dir.castShadow = true;
scene.add(dir);

// FLOOR
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30,30),
  new THREE.MeshStandardMaterial({color:0x333333})
);
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

// TABLE
const table = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8,0.8,0.15,32),
  new THREE.MeshStandardMaterial({color:0x0b6623})
);
table.position.y = 0.75;
table.castShadow = true;
scene.add(table);

// DISPLAY AVATARS
const male = createMasterAvatar('male');
male.position.set(-2,0,-2);
scene.add(male);

const female = createMasterAvatar('female');
female.position.set(-3.2,0,-2);
scene.add(female);

// WALKING NPC
const walker = createMasterAvatar('male');
scene.add(walker);

const clock = new THREE.Clock();

renderer.setAnimationLoop(()=>{
  const t = clock.getElapsedTime();
  updateWalk(male,t,false);
  updateWalk(female,t,false);

  walker.position.x = Math.sin(t*0.5)*4;
  walker.position.z = Math.cos(t*0.5)*4;
  walker.rotation.y = t*0.5 + Math.PI/2;
  updateWalk(walker,t,true);

  renderer.render(scene,camera);
});
