// world.js - builds a simple VR-ready lobby with a centerpiece poker table, lighting, and teleport floor.

export function createWorld({ THREE, scene }){
  // Lights
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x1a1f2a, 0.9);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(6, 10, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-6, 6, -4);
  scene.add(fill);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x121a24, roughness: 0.95, metalness: 0.0 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

  // Teleport target grid ring (visual)
  const grid = new THREE.GridHelper(60, 60, 0x274059, 0x1e2f40);
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  scene.add(grid);

  // Lobby boundaries / walls (subtle)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0e1622, roughness: 0.8, metalness: 0.0 });
  const wallH = 4.2;
  const wallT = 0.25;
  const mkWall = (w,d,x,z,ry=0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    m.position.set(x, wallH/2, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    scene.add(m);
  };
  mkWall(40, wallT, 0, -20);
  mkWall(40, wallT, 0,  20);
  mkWall(wallT, 40, -20, 0);
  mkWall(wallT, 40,  20, 0);

  // Centerpiece poker table (big)
  const table = buildPokerTable(THREE);
  table.position.set(0, 0, -6.5);
  table.rotation.y = Math.PI; // face camera spawn
  scene.add(table);

  // Seating placeholders
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1b2634, roughness: 0.8 });
  for (let i=0;i<6;i++){
    const a = (i/6)*Math.PI*2;
    const r = 3.6;
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,0.12,18), seatMat);
    seat.position.set(Math.cos(a)*r, 0.46, -6.5 + Math.sin(a)*r);
    seat.castShadow = true;
    seat.receiveShadow = true;
    scene.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.7,0.1), seatMat);
    back.position.set(seat.position.x, 0.92, seat.position.z);
    back.lookAt(0, 0.92, -6.5);
    back.castShadow = true;
    scene.add(back);
  }

  // Decorative pillars
  const pMat = new THREE.MeshStandardMaterial({ color: 0x0c131d, roughness:0.7, metalness:0.1 });
  const pGeo = new THREE.CylinderGeometry(0.35,0.35,4.2,24);
  const pillarPos = [[-10,-10],[10,-10],[-10,10],[10,10]];
  for (const [x,z] of pillarPos){
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(x, 2.1, z);
    p.castShadow = true;
    p.receiveShadow = true;
    scene.add(p);
  }

  // Simple signs / “rooms”
  const sign = makeSign(THREE, 'SCARLETT LOBBY', 3.8, 1.0);
  sign.position.set(0, 2.6, -18.8);
  scene.add(sign);

  const storeSign = makeSign(THREE, 'STORE', 2.2, 0.85);
  storeSign.position.set(14, 2.2, -10);
  storeSign.rotation.y = -Math.PI/2;
  scene.add(storeSign);

  // Store platform area marker
  const storePad = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), new THREE.MeshStandardMaterial({ color: 0x162335, roughness:0.95 }));
  storePad.rotation.x = -Math.PI/2;
  storePad.position.set(14, 0.01, -10);
  storePad.receiveShadow = true;
  scene.add(storePad);

  function update(){}

  return { floor, table, update };
}

function buildPokerTable(THREE){
  const g = new THREE.Group();
  g.name = 'pokerTable';

  // Table params (big, nice)
  const radius = 2.75;
  const rimR = radius + 0.28;

  // Felt (elliptical/oval)
  const feltGeo = new THREE.CylinderGeometry(radius, radius, 0.14, 64, 1, false);
  feltGeo.scale(1.25, 1, 1.0); // oval-ish
  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x0d4c3a,
    roughness: 0.92,
    metalness: 0.0
  });
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.position.y = 0.92;
  felt.castShadow = false;
  felt.receiveShadow = true;
  g.add(felt);

  // Rim (wood)
  const rimGeo = new THREE.TorusGeometry(rimR, 0.18, 16, 72);
  rimGeo.rotateX(Math.PI/2);
  rimGeo.scale(1.25, 1.0, 1.0);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x4a2b17, roughness:0.55, metalness:0.15 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.position.y = 0.95;
  rim.castShadow = true;
  rim.receiveShadow = true;
  g.add(rim);

  // Base pedestal
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x0a0f16, roughness:0.8, metalness:0.1 });
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.25, 28), baseMat);
  base1.position.y = 0.18;
  base1.castShadow = true;
  base1.receiveShadow = true;
  g.add(base1);

  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.55, 28), baseMat);
  base2.position.y = 0.55;
  base2.castShadow = true;
  base2.receiveShadow = true;
  g.add(base2);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.55, 24), baseMat);
  stem.position.y = 0.83;
  stem.castShadow = true;
  g.add(stem);

  // Cupholders around rim
  const cupMat = new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness:0.35, metalness:0.55 });
  const cupGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 18);
  const count = 8;
  for (let i=0;i<count;i++){
    const a = (i/count)*Math.PI*2;
    const rr = rimR - 0.10;
    const c = new THREE.Mesh(cupGeo, cupMat);
    c.position.set(Math.cos(a)*rr*1.25, 1.00, Math.sin(a)*rr);
    c.castShadow = true;
    c.receiveShadow = true;
    g.add(c);
  }

  // Center decal / logo
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.2, 48), new THREE.MeshStandardMaterial({ color: 0x0f7a5d, roughness:0.95, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.995;
  g.add(ring);

  return g;
}

function makeSign(THREE, text, w=3, h=1){
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.0)';
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 18, 18, 512-36, 256-36, 28, true, false);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 6;
  roundRect(ctx, 18, 18, 512-36, 256-36, 28, false, true);
  ctx.fillStyle = '#e6eef7';
  ctx.font = 'bold 64px system-ui, -apple-system, Segoe UI, Roboto';
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
