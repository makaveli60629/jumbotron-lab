// controls.js - desktop + touch + VR controllers (teleport + smooth move)
// Designed to be resilient: no-crash if XR inputs not available.

export function createPlayerRig(THREE, camera){
  const root = new THREE.Group();
  root.name = 'playerRig';

  const head = new THREE.Group();
  head.name = 'head';
  head.add(camera);

  const avatarAnchor = new THREE.Group();
  avatarAnchor.name = 'avatarAnchor';
  avatarAnchor.position.set(0, 0, 0);

  root.add(head);
  root.add(avatarAnchor);

  const state = {
    vel: new THREE.Vector3(),
    move: new THREE.Vector2(), // x strafe, y forward
    yaw: 0,
    sprint: false,
  };

  function resetPose(){
    root.position.set(0,0,0);
    state.yaw = 0;
    root.rotation.set(0,0,0);
  }

  function update(dt){
    const speed = state.sprint ? 3.6 : 2.2;
    const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), state.yaw);
    const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), state.yaw);

    const move3 = new THREE.Vector3()
      .addScaledVector(right, state.move.x)
      .addScaledVector(forward, state.move.y);

    if (move3.lengthSq() > 0.0001) move3.normalize();

    root.position.addScaledVector(move3, speed * dt);

    // keep on floor (y=0)
    root.position.y = 0;

    // rotate rig
    root.rotation.y = state.yaw;

    // keep avatar anchor stable
    avatarAnchor.position.set(0, 0, 0);
  }

  return { root, head, avatarAnchor, state, resetPose, update };
}

export function bindDesktopControls({ rig, dom }){
  const keys = new Set();
  dom.addEventListener('keydown', (e)=>{ keys.add(e.code); if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); });
  dom.addEventListener('keyup', (e)=>{ keys.delete(e.code); });

  dom.addEventListener('mousemove', (e)=>{
    if (document.pointerLockElement){
      rig.state.yaw -= (e.movementX || 0) * 0.0022;
    }
  });

  function step(){
    const f = (keys.has('KeyW') || keys.has('ArrowUp')) ? 1 : 0;
    const b = (keys.has('KeyS') || keys.has('ArrowDown')) ? 1 : 0;
    const l = (keys.has('KeyA') || keys.has('ArrowLeft')) ? 1 : 0;
    const r = (keys.has('KeyD') || keys.has('ArrowRight')) ? 1 : 0;

    rig.state.move.y = (f - b);
    rig.state.move.x = (r - l);

    rig.state.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    requestAnimationFrame(step);
  }
  step();
}

export function bindTouchControls({ rig }){
  const leftWrap = document.getElementById('leftStick');
  const knob = document.getElementById('leftKnob');
  const btnSprint = document.getElementById('btnSprint');
  const btnJump = document.getElementById('btnJump');

  if (!leftWrap || !knob) return;

  let active = false;
  let startX=0, startY=0;

  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  const setKnob = (dx,dy)=>{
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };

  const onDown = (e)=>{
    active = true;
    const t = e.touches ? e.touches[0] : e;
    startX = t.clientX; startY = t.clientY;
  };
  const onMove = (e)=>{
    if (!active) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = clamp(t.clientX - startX, -46, 46);
    const dy = clamp(t.clientY - startY, -46, 46);
    setKnob(dx, dy);
    rig.state.move.x = dx/46;
    rig.state.move.y = -dy/46;
  };
  const onUp = ()=>{
    active = false;
    setKnob(0,0);
    rig.state.move.set(0,0);
  };

  leftWrap.addEventListener('touchstart', onDown, { passive:true });
  leftWrap.addEventListener('touchmove', onMove, { passive:true });
  leftWrap.addEventListener('touchend', onUp, { passive:true });
  leftWrap.addEventListener('touchcancel', onUp, { passive:true });

  btnSprint?.addEventListener('click', ()=>{
    rig.state.sprint = !rig.state.sprint;
    btnSprint.textContent = rig.state.sprint ? 'Sprint: ON' : 'Sprint';
  });

  btnJump?.addEventListener('click', ()=>{
    rig.root.position.z -= 0.15;
  });
}

export function bindVRControllers({ THREE, renderer, scene, rig, diag }){
  const tmpMat = new THREE.Matrix4();
  const ray = new THREE.Raycaster();

  const ctrl0 = renderer.xr.getController(0);
  const ctrl1 = renderer.xr.getController(1);
  scene.add(ctrl0, ctrl1);

  const lineGeo = new THREE.BufferGeometry().setFromPoints([ new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-1) ]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x7bd7ff }));
  line.name = 'teleportLine';
  line.scale.z = 8;
  ctrl0.add(line);
  ctrl1.add(line.clone());

  function onSelectStart(e){
    const controller = e.target;
    const hit = teleportHit(controller);
    if (hit){
      rig.root.position.set(hit.x, 0, hit.z);
    }
  }
  ctrl0.addEventListener('selectstart', onSelectStart);
  ctrl1.addEventListener('selectstart', onSelectStart);

  function teleportHit(controller){
    tmpMat.identity().extractRotation(controller.matrixWorld);
    ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    ray.ray.direction.set(0,0,-1).applyMatrix4(tmpMat);
    const floor = scene.getObjectByName('floor');
    if (!floor) return null;
    const hits = ray.intersectObject(floor, false);
    return hits?.length ? hits[0].point : null;
  }

  function updateAxes(){
    const session = renderer.xr.getSession?.();
    if (!session) return;

    for (const src of session.inputSources){
      if (!src.gamepad) continue;
      const ax = src.gamepad.axes || [];
      const lx = ax[0] ?? 0;
      const ly = ax[1] ?? 0;
      const rx = ax[2] ?? 0;
      const dz = (v)=> Math.abs(v) < 0.12 ? 0 : v;

      rig.state.move.x = dz(lx);
      rig.state.move.y = dz(-ly);

      const turn = dz(rx);
      if (Math.abs(turn) > 0.6){
        rig.state.yaw += Math.sign(turn) * 0.08;
      }
    }
  }

  const orig = rig.update;
  rig.update = (dt)=>{
    updateAxes();
    orig(dt);
  };

  diag?.set('vr', 'controllers bound');
}
