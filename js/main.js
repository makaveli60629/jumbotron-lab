import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { VRButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

import { createWorld } from './world.js';
import { createDiagnostics } from './diagnostics.js';
import { createPlayerRig, bindDesktopControls, bindTouchControls, bindVRControllers } from './controls.js';
import { safeLoadModules } from './safe_modules.js';
import { createInteractor } from './interact.js';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a10);
scene.fog = new THREE.Fog(0x070a10, 8, 60);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 220);
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
diag.set('build', 'VR Lobby v2 SafeMode');
diag.set('three', THREE.REVISION);

const safety = { enabled: true };
const btnSafety = document.getElementById('btnSafety');
btnSafety.onclick = () => {
  safety.enabled = !safety.enabled;
  btnSafety.textContent = `Safety Mode: ${safety.enabled ? 'ON' : 'OFF'}`;
  toast(safety.enabled ? 'Safety Mode ON: module failures won\'t crash' : 'Safety Mode OFF');
};

document.getElementById('btnToggleDiag').onclick = () => diag.toggle();

const rig = createPlayerRig(THREE, camera);
scene.add(rig.root);

const world = createWorld({ THREE, scene, toast, diag });
diag.set('world', 'ok');

const interactor = createInteractor({ THREE, renderer, scene, camera, rig, diag, toast });

document.getElementById('btnReset').onclick = () => {
  rig.resetPose();
  world.teleportTo('spawn', rig);
  toast('Pose reset');
};

const vrBtn = VRButton.createButton(renderer);
vrBtn.style.display = 'none';
document.body.appendChild(vrBtn);
document.getElementById('btnVR').onclick = () => vrBtn.click();

renderer.xr.addEventListener('sessionstart', ()=>toast('XR session started'));
renderer.xr.addEventListener('sessionend', ()=>toast('XR session ended'));

bindDesktopControls({ rig, dom: window, interact: ()=>interactor.tryActivate() });
bindTouchControls({
  rig,
  onAction: ()=>{ rig.root.position.z -= 0.12; },
  onInteract: ()=>interactor.tryActivate(),
});
bindVRControllers({ THREE, renderer, scene, rig, diag, onSelect: ()=>interactor.tryActivate() });

// Avatar (optional local glb; fallback mannequin)
const loader = new GLTFLoader();
async function loadAvatar(){
  diag.set('avatar', 'loading…');
  const url = './assets/models/avatar.glb';
  return new Promise((resolve) => {
    loader.load(url, (gltf)=>{
      const avatar = gltf.scene;
      avatar.scale.setScalar(0.95);
      avatar.position.set(0, 0, -0.85);
      avatar.rotation.y = Math.PI; // face forward
      avatar.traverse((o)=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; }});
      rig.avatarAnchor.add(avatar);
      diag.set('avatar', 'avatar.glb (local)');
      toast('Loaded local avatar.glb');
      resolve(avatar);
    }, undefined, (err)=>{
      console.warn('Avatar load failed, using mannequin', err);
      diag.set('avatar', 'mannequin');
      rig.avatarAnchor.add(buildMannequin(THREE));
      resolve(null);
    });
  });
}

function buildMannequin(THREE){
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xb7c6ff, roughness:0.35, metalness:0.05 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness:0.85, metalness:0.05 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 8, 16), fabric);
  torso.position.y = 1.2; torso.castShadow = true; torso.receiveShadow = true;
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 16), fabric);
  hips.position.y = 0.88; hips.scale.set(1.2, 0.9, 1.0); hips.castShadow = true;

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,0.10,16), skin);
  neck.position.y = 1.56; neck.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 22, 18), skin);
  head.position.y = 1.72; head.castShadow = true;

  const upperArmGeo = new THREE.CapsuleGeometry(0.075, 0.26, 8, 12);
  const foreArmGeo  = new THREE.CapsuleGeometry(0.07, 0.24, 8, 12);
  const mkArm = (side=1)=>{
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(upperArmGeo, skin);
    upper.position.y = 1.32; upper.position.x = 0.32*side; upper.rotation.z = -0.25*side;
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), skin);
    elbow.position.set(0.42*side, 1.16, 0);
    const fore = new THREE.Mesh(foreArmGeo, skin);
    fore.position.set(0.48*side, 1.00, 0); fore.rotation.z = -0.15*side;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 12), skin);
    hand.position.set(0.55*side, 0.82, 0);
    for (const m of [upper, elbow, fore, hand]){ m.castShadow = true; m.receiveShadow = true; }
    arm.add(upper, elbow, fore, hand);
    return arm;
  };

  const upperLegGeo = new THREE.CapsuleGeometry(0.10, 0.32, 8, 12);
  const lowerLegGeo = new THREE.CapsuleGeometry(0.095, 0.34, 8, 12);
  const mkLeg = (side=1)=>{
    const leg = new THREE.Group();
    const upper = new THREE.Mesh(upperLegGeo, fabric);
    upper.position.set(0.14*side, 0.66, 0); upper.rotation.z = 0.05*side;
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 12), fabric);
    knee.position.set(0.14*side, 0.42, 0);
    const lower = new THREE.Mesh(lowerLegGeo, fabric);
    lower.position.set(0.14*side, 0.18, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.28), fabric);
    foot.position.set(0.14*side, 0.02, 0.08);
    for (const m of [upper, knee, lower, foot]){ m.castShadow = true; m.receiveShadow = true; }
    leg.add(upper, knee, lower, foot);
    return leg;
  };

  g.add(torso, hips, neck, head, mkArm(1), mkArm(-1), mkLeg(1), mkLeg(-1));
  return g;
}

await loadAvatar();

// Modules (safe)
await safeLoadModules({
  safety,
  diag,
  toast,
  modules: [
    { name:'store', path:'./js/store.js' },
    { name:'lobby_fx', path:'./js/lobby_fx.js' },
  ],
  context: { THREE, scene, rig, world, renderer, camera, interactor }
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
  interactor.update(dt);

  diag.tick(dt, renderer, rig);
  renderer.render(scene, camera);
});
