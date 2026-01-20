// Scarlett Test Server VR Lobby (Safe Mode)
// Uses Three.js WebXR (VRButton) with a diagnostics HUD and safe module loader.

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

import { createWorld } from './world.js';
import { createDiagnostics } from './diagnostics.js';
import { createPlayerRig, bindDesktopControls, bindTouchControls, bindVRControllers } from './controls.js';
import { safeLoadModules } from './safe_modules.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a0f);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
camera.position.set(0, 1.6, 3);

const clock = new THREE.Clock();

const toast = (msg) => {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(()=>{ el.style.display='none'; }, 2600);
};

const diag = createDiagnostics(document.getElementById('diag'));
diag.set('build', 'VR Lobby SafeMode v1.0');
diag.set('three', THREE.REVISION);

const rig = createPlayerRig(THREE, camera);
scene.add(rig.root);

const world = createWorld({ THREE, scene });
diag.set('world', 'ok');

const safety = { enabled: true };
const btnSafety = document.getElementById('btnSafety');
btnSafety.onclick = () => {
  safety.enabled = !safety.enabled;
  btnSafety.textContent = `Safety Mode: ${safety.enabled ? 'ON' : 'OFF'}`;
  toast(safety.enabled ? 'Safety Mode ON: modules load with guardrails' : 'Safety Mode OFF');
};

document.getElementById('btnToggleDiag').onclick = () => diag.toggle();
document.getElementById('btnReset').onclick = () => rig.resetPose();

const vrBtn = VRButton.createButton(renderer);
vrBtn.style.display = 'none'; // we provide our own button
document.body.appendChild(vrBtn);

const btnVR = document.getElementById('btnVR');
btnVR.onclick = async () => {
  // Proxy click to VRButton
  vrBtn.click();
};

renderer.xr.addEventListener('sessionstart', ()=>{ toast('XR session started'); });
renderer.xr.addEventListener('sessionend', ()=>{ toast('XR session ended'); });

bindDesktopControls({ THREE, rig, dom: window });
bindTouchControls({ rig });
bindVRControllers({ THREE, renderer, scene, rig, diag });

const loader = new GLTFLoader();
async function loadAvatar(){
  diag.set('avatar', 'loading…');
  const url = './assets/models/RobotExpressive.glb';
  return new Promise((resolve) => {
    loader.load(url, (gltf)=>{
      const avatar = gltf.scene;
      avatar.scale.setScalar(0.9);
      avatar.position.set(0, 0, -0.8);
      avatar.traverse((o)=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; }});
      rig.avatarAnchor.add(avatar);
      diag.set('avatar', 'RobotExpressive.glb (local)');
      resolve(avatar);
    }, undefined, (err)=>{
      console.warn('Avatar load failed, using fallback', err);
      diag.set('avatar', 'fallback capsule');
      const body = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x9bb4ff, roughness:0.35, metalness:0.1 });
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 8, 16), mat);
      torso.position.y = 1.2;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), mat);
      head.position.y = 1.65;
      const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.38, 8, 12), mat);
      armL.position.set(-0.32, 1.25, 0);
      armL.rotation.z = Math.PI/10;
      const armR = armL.clone(); armR.position.x = 0.32; armR.rotation.z = -Math.PI/10;
      const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.48, 8, 12), mat);
      legL.position.set(-0.14, 0.62, 0);
      const legR = legL.clone(); legR.position.x = 0.14;
      body.add(torso, head, armL, armR, legL, legR);
      rig.avatarAnchor.add(body);
      resolve(body);
    });
  });
}

await loadAvatar();

// Safe module loading (store/lobby extras)
await safeLoadModules({
  safety,
  diag,
  toast,
  modules: [
    { name:'store', path:'./js/store.js' },
  ],
  context: { THREE, scene, rig, world, renderer, camera }
});

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

renderer.setAnimationLoop(()=>{
  const dt = Math.min(clock.getDelta(), 0.05);

  rig.update(dt);
  world.update(dt, rig);

  diag.tick(dt, renderer, rig);
  renderer.render(scene, camera);
});
