import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.159/examples/jsm/webxr/VRButton.js';
import { Diagnostics } from './diagnostics.js';
import { TouchSticks } from './touch_controls.js';
import { MovementRig } from './movement.js';
import { buildDisplayLine, loadGLB, makeFallbackBox, makeNinjaWalker, stepNinjaWalker } from './avatars.js';
import { makePedestal, placeOnGround, setAllCastReceive } from './utils.js';

import manifest from './world_manifest.js';

export async function initApp(){
  const statusChip = document.getElementById('statusChip');
  const diagEl = document.getElementById('diag');
  const diag = new Diagnostics({ el: diagEl, statusEl: statusChip });

  const btnLobby = document.getElementById('btnLobby');
  const btnGallery = document.getElementById('btnGallery');
  const btnDiag = document.getElementById('btnDiag');

  btnDiag.addEventListener('click', ()=>diag.toggle());

  // Scene / renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080b);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.01, 200);
  camera.position.set(0, 1.6, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // VRButton host (not blocked by HUD)
  const vrHost = document.getElementById('vrButtonHost');
  const vrButton = VRButton.createButton(renderer);
  vrHost.appendChild(vrButton);

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lights (more lighting)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(4, 7, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-4, 4, -2);
  scene.add(fill);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ roughness:0.95, metalness:0.0 })
  );
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Movement rig
  const rig = new MovementRig(camera);
  rig.floorY = 0;
  scene.add(rig.group);

  // Touch controls (Android)
  const touchRoot = document.getElementById('touchControls');
  const sticks = new TouchSticks({
    rootEl: touchRoot,
    moveEl: document.getElementById('stickMove'),
    lookEl: document.getElementById('stickLook')
  });

  // Enable touch sticks on mobile-ish devices
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  sticks.setEnabled(isMobile);
  diag.setMovement(isMobile ? 'Touch + Joysticks' : 'Keyboard + Mouse');

  // Rooms (no reload → no XR flatten)
  const roomLobby = new THREE.Group(); roomLobby.name='Room_Lobby';
  const roomGallery = new THREE.Group(); roomGallery.name='Room_Gallery';
  scene.add(roomLobby); scene.add(roomGallery);
  roomGallery.visible = false;

  function showRoom(which){
    roomLobby.visible = which === 'lobby';
    roomGallery.visible = which === 'gallery';
    diag.setRoom(which);
  }

  btnLobby.addEventListener('click', ()=>showRoom('lobby'));
  btnGallery.addEventListener('click', ()=>showRoom('gallery'));

  // Lobby environment (simple jumbotron + stage)
  const lobbyStage = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.25, 2.2),
    new THREE.MeshStandardMaterial({ roughness:0.85, metalness:0.02 })
  );
  lobbyStage.position.set(0, 0.125, -1.1);
  lobbyStage.receiveShadow = true;
  roomLobby.add(lobbyStage);

  // Gallery environment (display line + pedestals)
  const displayOrigin = new THREE.Vector3(0, 0, -2.8);
  const faceTarget = new THREE.Vector3(0, 1.6, 0); // face user at origin-ish
  const displayLine = await buildDisplayLine({
    scene: roomGallery,
    items: manifest.displayLine,
    origin: displayOrigin,
    facingTarget: faceTarget,
    diag
  });

  // Ninja on pedestal in lobby (display)
  const ninjaPed = makePedestal(0.30, 0.20);
  ninjaPed.position.set(1.8, 0, -1.2);
  roomLobby.add(ninjaPed);

  let ninjaDisplay = null;
  try{
    ninjaDisplay = await loadGLB('./assets/models/' + manifest.displayLine.find(x=>x.name==='ninja_display')?.file);
    setAllCastReceive(ninjaDisplay, true, true);
    placeOnGround(ninjaDisplay, ninjaPed.userData.topY + ninjaPed.position.y);
    ninjaDisplay.lookAt(0, ninjaDisplay.position.y, 0);
    ninjaPed.add(ninjaDisplay);
    diag.log('Ninja display loaded (pedestal).');
  }catch(e){
    diag.error(e);
    const fb = makeFallbackBox('ninja_display');
    fb.position.y = ninjaPed.userData.topY + 0.5;
    ninjaPed.add(fb);
  }

  // Ninja walker (smooth + slow)
  const walkerPed = makePedestal(0.26, 0.18);
  walkerPed.position.set(-1.8, 0, -1.0);
  roomLobby.add(walkerPed);

  let ninjaWalk = null;
  let walker = null;
  try{
    ninjaWalk = await loadGLB('./assets/models/' + manifest.npcWalk.file);
    setAllCastReceive(ninjaWalk, true, true);
    placeOnGround(ninjaWalk, walkerPed.userData.topY + walkerPed.position.y);
    // start near center and walk around a small circle
    ninjaWalk.position.x = 0;
    ninjaWalk.position.z = -0.6;
    roomLobby.add(ninjaWalk);

    walker = makeNinjaWalker(ninjaWalk, { speed: manifest.npcWalk.speed_mps, radius: 1.1 });
    walker.center.set(0, 0, -1.1);
    diag.log('Ninja walker active (slow + smooth).');
  }catch(e){
    diag.error(e);
  }

  // XR controller collection
  const controllers = [];
  function collectGamepads(){
    const gps = [];
    const session = renderer.xr.getSession();
    if (!session) return gps;
    for (const src of session.inputSources){
      const gp = src.gamepad;
      if (gp) gps.push(gp);
    }
    return gps;
  }

  renderer.xr.addEventListener('sessionstart', ()=>{
    diag.log('XR session started.');
  });
  renderer.xr.addEventListener('sessionend', ()=>{
    diag.log('XR session ended.');
  });

  diag.setStatus('Ready: Lobby / Gallery (VR + Android)');
  diag.setLoaded(manifest.displayLine.map(x=>x.file));

  // Main loop
  let last = performance.now();
  renderer.setAnimationLoop(()=>{
    const now = performance.now();
    const dt = Math.min(0.05, (now - last)/1000);
    last = now;

    // update touch → rig
    rig.setTouch(sticks.move, sticks.look);

    // update XR gamepads
    const inXR = !!renderer.xr.getSession();
    const gps = collectGamepads();
    rig.setXR(inXR, gps);

    diag.setXR({ supported: !!navigator.xr, inSession: inXR, controllers: gps.length });

    // step movement
    rig.step(dt);

    // step ninja walker
    if (walker) stepNinjaWalker(walker, dt);

    // diagnostics
    diag.tick();

    renderer.render(scene, camera);
  });

  // If in XR, keep HUD from blocking
  // (HUD is pointer-events:none except buttons)
}
