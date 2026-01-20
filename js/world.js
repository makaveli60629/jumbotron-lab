export function createWorld({ THREE, scene, toast, diag }){
  // Lights
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x161b24, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(7, 11, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-6, 7, -4);
  scene.add(fill);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(70, 70);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x101a26, roughness: 0.95, metalness: 0.0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.name = 'floor';
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(70, 70, 0x274059, 0x1e2f40);
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);

  // Lobby shell
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c121b, roughness: 0.8, metalness: 0.05 });
  const wallH = 4.4, wallT = 0.28;
  const mkWall = (w,d,x,z)=>{
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    m.position.set(x, wallH/2, z);
    m.receiveShadow = true;
    scene.add(m);
  };
  mkWall(46, wallT, 0, -23);
  mkWall(46, wallT, 0,  23);
  mkWall(wallT, 46, -23, 0);
  mkWall(wallT, 46,  23, 0);

  // Centerpiece table (bigger + nicer)
  const table = buildPokerTable(THREE);
  table.position.set(0, 0, -7.2);
  table.rotation.y = Math.PI;
  scene.add(table);

  // Seats perfectly aligned around table
  const center = new THREE.Vector3(0, 0, -7.2);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x182334, roughness: 0.78 });
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const r = 4.05;
    const x = center.x + Math.cos(a)*r;
    const z = center.z + Math.sin(a)*r;

    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.30,0.36,0.13,18), seatMat);
    seat.position.set(x, 0.47, z);
    seat.castShadow = true; seat.receiveShadow = true;
    scene.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.74,0.11), seatMat);
    back.position.set(x, 0.95, z);
    back.lookAt(center.x, 0.95, center.z);
    back.castShadow = true;
    scene.add(back);
  }

  // Signs
  const sign = makeSign(THREE, 'SCARLETT LOBBY', 4.2, 1.05);
  sign.position.set(0, 2.7, -21.7);
  scene.add(sign);

  // Teleport pads (named anchors)
  const anchors = {
    spawn: { x:0, z: 2.0 },
    table: { x:0, z:-2.0 },
    store: { x:14, z:-10 },
    lounge:{ x:-14, z:-10 },
  };

  const pads = [];
  for (const [name, p] of Object.entries(anchors)){
    const pad = makePad(THREE, name.toUpperCase(), name==='spawn' ? 0x2d7dff : 0x173a63);
    pad.position.set(p.x, 0.01, p.z);
    scene.add(pad);
    pads.push(pad);
  }

  function teleportTo(name, rig){
    const a = anchors[name];
    if (!a) return;
    rig.root.position.set(a.x, 0, a.z);
    toast?.(`Teleported: ${name}`);
  }

  // Decorative pillars
  const pMat = new THREE.MeshStandardMaterial({ color: 0x0b1119, roughness:0.7, metalness:0.1 });
  const pGeo = new THREE.CylinderGeometry(0.38,0.38,4.4,24);
  for (const [x,z] of [[-12,-12],[12,-12],[-12,12],[12,12]]){
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(x, 2.2, z);
    p.castShadow = true; p.receiveShadow = true;
    scene.add(p);
  }

  function update(){}

  diag?.set('pads', pads.length);
  return { floor, table, pads, anchors, teleportTo, update };
}

function buildPokerTable(THREE){
  const g = new THREE.Group();
  g.name = 'pokerTable';

  const radius = 3.10;
  const rimR = radius + 0.30;

  const feltGeo = new THREE.CylinderGeometry(radius, radius, 0.16, 72, 1, false);
  feltGeo.scale(1.33, 1, 1.0);
  const feltMat = new THREE.MeshStandardMaterial({ color: 0x0d4c3a, roughness: 0.92, metalness: 0.0 });
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.position.y = 0.98;
  felt.receiveShadow = true;
  g.add(felt);

  const rimGeo = new THREE.TorusGeometry(rimR, 0.20, 16, 80);
  rimGeo.rotateX(Math.PI/2);
  rimGeo.scale(1.33, 1.0, 1.0);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x4a2b17, roughness:0.55, metalness:0.18 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 1.02;
  rim.castShadow = true; rim.receiveShadow = true;
  g.add(rim);

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness:0.82, metalness:0.12 });
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.90, 0.28, 32), baseMat);
  base1.position.y = 0.20; base1.castShadow = true; base1.receiveShadow = true;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.70, 0.62, 32), baseMat);
  base2.position.y = 0.60; base2.castShadow = true; base2.receiveShadow = true;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.60, 28), baseMat);
  stem.position.y = 0.88; stem.castShadow = true;
  g.add(base1, base2, stem);

  const cupMat = new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness:0.35, metalness:0.60 });
  const cupGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 18);
  for (let i=0;i<10;i++){
    const a = (i/10)*Math.PI*2;
    const rr = (rimR - 0.12) * 1.33;
    const c = new THREE.Mesh(cupGeo, cupMat);
    c.position.set(Math.cos(a)*rr, 1.08, Math.sin(a)*(rimR-0.12));
    c.castShadow = true; c.receiveShadow = true;
    g.add(c);
  }

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.60, 1.35, 56), new THREE.MeshStandardMaterial({ color: 0x0f7a5d, roughness:0.95, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 1.06;
  g.add(ring);

  return g;
}

function makePad(THREE, text, color){
  const group = new THREE.Group();
  group.name = `pad_${text}`;

  const disk = new THREE.Mesh(new THREE.CircleGeometry(2.0, 40), new THREE.MeshStandardMaterial({ color, roughness:0.9 }));
  disk.rotation.x = -Math.PI/2;
  disk.receiveShadow = true;
  group.add(disk);

  const ring = new THREE.Mesh(new THREE.RingGeometry(1.75, 2.05, 52), new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness:0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.01;
  group.add(ring);

  const label = makeSign(THREE, text, 1.8, 0.55, true);
  label.position.set(0, 1.5, -1.2);
  group.add(label);

  return group;
}

function makeSign(THREE, text, w=3, h=1, compact=false){
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,512,256);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 18, 18, 512-36, 256-36, 28, true, false);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 6;
  roundRect(ctx, 18, 18, 512-36, 256-36, 28, false, true);
  ctx.fillStyle = '#e6eef7';
  ctx.font = `bold ${compact ? 56 : 64}px system-ui, -apple-system, Segoe UI, Roboto`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 2.2;
  return mesh;
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
