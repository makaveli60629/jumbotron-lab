// js/world.js
import { getGLTFLoader } from './loaders/gltf_loader_shim.js';

export const World = {
  async init({ THREE, scene, renderer, camera, player, log }){
    const s = {
      THREE, scene, renderer, camera, player,
      log: (m)=>log(m),
      root: new THREE.Group(),
      avatar: { obj:null, mixer:null },
      bots: [],
      input: { keys:{}, look:{drag:false, x:0, y:0}, joy:{active:false, id:null, cx:0, cy:0, x:0, y:0} },
      speed: 2.2,
    };

    scene.add(s.root);

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.5);
    const key = new THREE.DirectionalLight(0x88ffff, 0.9);
    key.position.set(4, 8, 2);
    key.castShadow = true;
    s.root.add(amb, key);

    // Room + floor
    buildRoom(s);
    buildTableAndCards(s);
    buildBots(s);

    // Loader shim
    let GLTFLoaderClass = null;
    try{ GLTFLoaderClass = await getGLTFLoader((m)=>s.log(m)); }catch(e){ s.log('[Loader] Shim error: '+(e?.message||e)); }
    const gltfLoader = GLTFLoaderClass ? new GLTFLoaderClass() : null;

    // Avatar load wiring
    const btnLoad = document.getElementById('btnLoadAvatar');
    const btnClear = document.getElementById('btnClearAvatar');
    if(btnLoad){
      btnLoad.addEventListener('click', async (e)=>{
        e.preventDefault();
        const url = (document.getElementById('avatarUrl')?.value || '').trim();
        await loadAvatar(s, gltfLoader, url);
      }, {passive:false});
      btnLoad.addEventListener('touchend', async (e)=>{
        e.preventDefault();
        const url = (document.getElementById('avatarUrl')?.value || '').trim();
        await loadAvatar(s, gltfLoader, url);
      }, {passive:false});
    }
    if(btnClear){
      btnClear.addEventListener('click', (e)=>{ e.preventDefault(); clearAvatar(s); }, {passive:false});
      btnClear.addEventListener('touchend', (e)=>{ e.preventDefault(); clearAvatar(s); }, {passive:false});
    }

    // Input
    setupInput(s);

    s.log('[World] Ready: room + table + bots + cards.');
    return {
      update: (dt, t)=>{
        updatePlayerMove(s, dt);
        updateBots(s, dt, t);
        if(s.avatar.mixer) s.avatar.mixer.update(dt);
      }
    };
  }
};

function buildRoom(s){
  const { THREE } = s;
  const floorGeo = new THREE.PlaneGeometry(50, 50);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x07131a, roughness: 1 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  s.root.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x05080c, roughness: 1 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(50, 12, 50), wallMat);
  box.position.y = 6;
  box.material.side = THREE.BackSide;
  s.root.add(box);

  // Guide lines
  const grid = new THREE.GridHelper(50, 50, 0x00ffff, 0x003344);
  grid.position.y = 0.01;
  s.root.add(grid);
}

function buildTableAndCards(s){
  const { THREE } = s;

  const table = new THREE.Group();
  table.position.set(0, 0.9, 0);
  s.root.add(table);

  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.3, 0.35, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a1b2a, roughness: 0.85, metalness: 0.1 })
  );
  felt.castShadow = true; felt.receiveShadow = true;
  table.add(felt);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.18, 18, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.9 })
  );
  rim.rotation.x = Math.PI/2;
  rim.position.y = 0.16;
  table.add(rim);

  // 6 player card hovers around the table
  for(let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const r = 2.2;
    const px = Math.cos(a)*r;
    const pz = Math.sin(a)*r;
    const cards = makeCardPair(s);
    cards.position.set(px, 0.30, pz);
    cards.lookAt(0, 0.30, 0);
    table.add(cards);
  }

  // Center pot marker
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22,0.22,0.06,24),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x003344, roughness: 0.4 })
  );
  pot.position.y = 0.22;
  table.add(pot);
}

function makeCardPair(s){
  const { THREE } = s;
  const g = new THREE.PlaneGeometry(0.22, 0.32);
  const mat1 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const mat2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const c1 = new THREE.Mesh(g, mat1);
  const c2 = new THREE.Mesh(g, mat2);
  c1.position.x = -0.12;
  c2.position.x = 0.12;
  c1.rotation.x = -Math.PI/2;
  c2.rotation.x = -Math.PI/2;
  const grp = new THREE.Group();
  grp.add(c1,c2);
  return grp;
}

function buildBots(s){
  // Two bots: one seated, one walking
  const seated = createBot(s);
  seated.position.set(2.4, 0.9, 0);
  seated.userData.seated = true;
  s.root.add(seated);
  s.bots.push(seated);

  const walker = createBot(s);
  walker.position.set(-3.5, 0.0, -3.5);
  walker.userData.walk = { t:0, r:3.5, speed:0.6 };
  s.root.add(walker);
  s.bots.push(walker);
}

function createBot(s){
  const { THREE } = s;
  const gBody = new THREE.CapsuleGeometry(0.28, 0.85, 8, 16);
  const mBody = new THREE.MeshStandardMaterial({ color: 0x1f6fff, roughness: 0.45, metalness: 0.05 });
  const body = new THREE.Mesh(gBody, mBody);
  body.castShadow = true;

  const armGeo = new THREE.CapsuleGeometry(0.10, 0.45, 6, 12);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x25d3cf, roughness: 0.5 });
  const armL = new THREE.Mesh(armGeo, armMat);
  const armR = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.32, 0.55, 0.05);
  armR.position.set( 0.32, 0.55, 0.05);
  armL.rotation.z = Math.PI/2;
  armR.rotation.z = Math.PI/2;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), mBody);
  head.position.set(0, 1.05, 0);

  const root = new THREE.Group();
  root.add(body, armL, armR, head);
  root.position.y = 0.95;

  // store limbs for procedural walk
  root.userData.limbs = { armL, armR };
  return root;
}

function updateBots(s, dt, t){
  for(const b of s.bots){
    if(b.userData.seated){
      // seated pose
      b.position.y = 0.9;
      b.rotation.y = Math.PI/2;
      if(b.userData.limbs){
        b.userData.limbs.armL.rotation.x = -0.4;
        b.userData.limbs.armR.rotation.x = -0.4;
      }
      continue;
    }
    const w = b.userData.walk;
    if(!w) continue;
    w.t += dt * w.speed;
    const x = Math.cos(w.t) * w.r;
    const z = Math.sin(w.t) * w.r;
    b.position.set(x, 0.0, z);
    b.lookAt(0, 0.0, 0);

    // procedural gait so it doesn't "slide"
    const gait = Math.sin(w.t*6.0) * 0.6;
    if(b.userData.limbs){
      b.userData.limbs.armL.rotation.x = gait;
      b.userData.limbs.armR.rotation.x = -gait;
    }
    // subtle bob
    b.position.y = 0.02 + Math.abs(Math.sin(w.t*6.0))*0.03;
  }
}

function setupInput(s){
  const { input } = s;
  // Keyboard
  window.addEventListener('keydown', (e)=>{ input.keys[e.code]=true; });
  window.addEventListener('keyup', (e)=>{ input.keys[e.code]=false; });

  // Mouse drag look
  let dragging=false, lx=0, ly=0;
  window.addEventListener('pointerdown', (e)=>{
    // don't steal HUD touches
    const hud = document.getElementById('hud');
    if(hud && hud.contains(e.target)) return;
    dragging=true; lx=e.clientX; ly=e.clientY;
  });
  window.addEventListener('pointerup', ()=>dragging=false);
  window.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    const dx = e.clientX - lx; const dy = e.clientY - ly;
    lx=e.clientX; ly=e.clientY;
    s.player.rotation.y -= dx * 0.003;
    s.camera.rotation.x -= dy * 0.002;
    s.camera.rotation.x = Math.max(-1.2, Math.min(1.2, s.camera.rotation.x));
  });

  // Touch joystick (simple)
  let joyEl = document.getElementById('joyWrap');
  if(!joyEl){
    joyEl = document.createElement('div');
    joyEl.id='joyWrap';
    document.body.appendChild(joyEl);
  }
  const joy = input.joy;

  function tpos(t){ return {x:t.clientX, y:t.clientY}; }

  window.addEventListener('touchstart', (e)=>{
    // ignore touches on HUD
    const hud = document.getElementById('hud');
    if(hud && hud.contains(e.target)) return;
    // left half screen only
    for(const t of e.changedTouches){
      if(t.clientX < innerWidth*0.5 && !joy.active){
        joy.active=true; joy.id=t.identifier;
        joy.cx=t.clientX; joy.cy=t.clientY;
        joy.x=0; joy.y=0;
      }
    }
  }, {passive:false});

  window.addEventListener('touchmove', (e)=>{
    if(!joy.active) return;
    for(const t of e.changedTouches){
      if(t.identifier !== joy.id) continue;
      const dx = (t.clientX - joy.cx);
      const dy = (t.clientY - joy.cy);
      const max = 60;
      joy.x = Math.max(-1, Math.min(1, dx/max));
      joy.y = Math.max(-1, Math.min(1, dy/max));
      e.preventDefault();
    }
  }, {passive:false});

  window.addEventListener('touchend', (e)=>{
    for(const t of e.changedTouches){
      if(t.identifier === joy.id){
        joy.active=false; joy.id=null; joy.x=0; joy.y=0;
      }
    }
  }, {passive:true});
}

function updatePlayerMove(s, dt){
  const { keys } = s.input;
  const joy = s.input.joy;

  let fwd = 0, str = 0;
  if(keys['KeyW']) fwd += 1;
  if(keys['KeyS']) fwd -= 1;
  if(keys['KeyA']) str -= 1;
  if(keys['KeyD']) str += 1;

  // joystick: y forward/back, x strafe
  if(joy.active){
    fwd += -joy.y;
    str += joy.x;
  }

  const v = new s.THREE.Vector3();
  const dir = new s.THREE.Vector3();
  s.camera.getWorldDirection(dir);
  dir.y = 0; dir.normalize();

  const right = new s.THREE.Vector3().crossVectors(dir, new s.THREE.Vector3(0,1,0)).normalize().multiplyScalar(-1);

  v.addScaledVector(dir, fwd);
  v.addScaledVector(right, str);
  if(v.lengthSq() < 0.0001) return;
  v.normalize().multiplyScalar(s.speed * dt);

  // keep player on plane
  s.player.position.add(v);
  s.player.position.y = 1.65;
}

async function loadAvatar(s, gltfLoader, url){
  if(!url){ s.log('[Avatar] No URL/path.'); return; }
  if(!gltfLoader){
    s.log('[Avatar] GLTFLoader not available. Check CDN access or try again. (We try jsDelivr/unpkg/esm.sh/skypack).');
    return;
  }
  try{
    s.log('[Avatar] Loading: ' + url);
    clearAvatar(s);
    const gltf = await gltfLoader.loadAsync(url);
    const obj = gltf.scene || gltf.scenes?.[0];
    if(!obj) throw new Error('No scene in GLB.');
    obj.traverse(n=>{
      if(n.isMesh){
        n.frustumCulled=false;
        n.castShadow=true; n.receiveShadow=true;
        if(n.material){
          n.material.transparent=false;
          n.material.depthWrite=true;
          n.material.side = s.THREE.FrontSide;
        }
      }
    });
    obj.position.set(0, 0.0, 2.2);
    obj.rotation.y = Math.PI;
    s.root.add(obj);
    s.avatar.obj = obj;

    if(gltf.animations && gltf.animations.length){
      const mixer = new s.THREE.AnimationMixer(obj);
      mixer.clipAction(gltf.animations[0]).play();
      s.avatar.mixer = mixer;
      s.log('[Avatar] Animations: ' + gltf.animations.length + ' (playing #0)');
    }else{
      s.avatar.mixer = null;
      s.log('[Avatar] No animations in this GLB (ok).');
    }
    s.log('[Avatar] Loaded OK.');
  }catch(e){
    s.log('[Avatar] Load error: ' + (e?.message||e));
  }
}

function clearAvatar(s){
  try{
    if(s.avatar.obj){ s.root.remove(s.avatar.obj); }
    s.avatar.obj=null;
    s.avatar.mixer=null;
    s.log('[Avatar] Cleared.');
  }catch(_){}
}
