import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class DevWorld {
  constructor({ scene }) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.objects = [];
    this.colliders = [];
  }

  buildBase() {
    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(6, 10, 4);
    this.scene.add(dir);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x101018, roughness: 0.95, metalness: 0.0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "DevFloor";
    this.scene.add(floor);
    this.objects.push(floor);
    this.colliders.push(floor);

    // Lobby accent wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(18, 4, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1f1f2a, roughness: 0.9 })
    );
    wall.position.set(0, 2, -10);
    this.scene.add(wall);
    this.objects.push(wall);

    // Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35, roughness: 0.85 });
    for (let i=0;i<7;i++){
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,3.4,20), pillarMat);
      p.position.set(-5 + i*1.7, 1.7, -7.5);
      this.scene.add(p);
      this.objects.push(p);
    }
  }

  createPedestal({ x=0, z=0, label="Avatar", radius=0.55, height=0.25 }) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.name = `Pedestal_${label}`;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, 40),
      new THREE.MeshStandardMaterial({ color: 0x343446, roughness: 0.75, metalness: 0.05 })
    );
    base.position.y = height/2;
    base.name = "PedestalBase";
    group.add(base);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius*0.85, 0.035, 14, 42),
      new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.5, metalness: 0.2 })
    );
    rim.rotation.x = Math.PI/2;
    rim.position.y = height + 0.02;
    group.add(rim);

    // Anchor for placing avatar
    const anchor = new THREE.Group();
    anchor.name = "PedestalAnchor";
    anchor.position.set(0, height, 0);
    group.add(anchor);

    group.userData.label = label;

    this.scene.add(group);
    this.objects.push(group);
    this.colliders.push(base);
    return group;
  }

  createPokerTable({ x=0, z=0, y=0, yaw=0, scale=1.0 } = {}) {
    const g = new THREE.Group();
    g.name = "PokerTable";
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    g.scale.setScalar(scale);

    // Dimensions
    const topY = 0.78;
    const a = 1.35; // half-length
    const b = 0.85; // half-width

    // Felt top (oval-ish using Extrude)
    const shape = new THREE.Shape();
    const r = 0.55;
    shape.moveTo(-a+r, -b);
    shape.lineTo(a-r, -b);
    shape.quadraticCurveTo(a, -b, a, -b+r);
    shape.lineTo(a, b-r);
    shape.quadraticCurveTo(a, b, a-r, b);
    shape.lineTo(-a+r, b);
    shape.quadraticCurveTo(-a, b, -a, b-r);
    shape.lineTo(-a, -b+r);
    shape.quadraticCurveTo(-a, -b, -a+r, -b);

    const feltGeom = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, steps: 1 });
    feltGeom.rotateX(-Math.PI/2);
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x0b3a2a, roughness: 0.95, metalness: 0.0 });
    const felt = new THREE.Mesh(feltGeom, feltMat);
    felt.position.y = topY;
    felt.name = "TableFelt";
    g.add(felt);

    // Rail (slightly larger oval ring)
    const railShape = new THREE.Shape();
    const ao = a + 0.12;
    const bo = b + 0.12;
    const ro = r + 0.12;
    railShape.moveTo(-ao+ro, -bo);
    railShape.lineTo(ao-ro, -bo);
    railShape.quadraticCurveTo(ao, -bo, ao, -bo+ro);
    railShape.lineTo(ao, bo-ro);
    railShape.quadraticCurveTo(ao, bo, ao-ro, bo);
    railShape.lineTo(-ao+ro, bo);
    railShape.quadraticCurveTo(-ao, bo, -ao, bo-ro);
    railShape.lineTo(-ao, -bo+ro);
    railShape.quadraticCurveTo(-ao, -bo, -ao+ro, -bo);

    const hole = shape.clone(); // inner cutout
    railShape.holes.push(hole);

    const railGeom = new THREE.ExtrudeGeometry(railShape, { depth: 0.10, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, steps: 1 });
    railGeom.rotateX(-Math.PI/2);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2f, roughness: 0.75, metalness: 0.15 });
    const rail = new THREE.Mesh(railGeom, railMat);
    rail.position.y = topY + 0.02;
    rail.name = "TableRail";
    g.add(rail);

    // Base + legs
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.65, 0.25, 22),
      new THREE.MeshStandardMaterial({ color: 0x1f1f25, roughness: 0.85 })
    );
    base.position.y = 0.20;
    base.name = "TableBase";
    g.add(base);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, topY-0.35, 18),
      new THREE.MeshStandardMaterial({ color: 0x24242d, roughness: 0.85 })
    );
    stem.position.y = (topY-0.35)/2 + 0.25;
    stem.name = "TableStem";
    g.add(stem);

    // Simple collider (solid) as an invisible box around the top for interactions / seating alignment
    const collider = new THREE.Mesh(
      new THREE.BoxGeometry((a+0.15)*2, 0.12, (b+0.15)*2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    collider.position.y = topY + 0.05;
    collider.name = "TableCollider";
    g.add(collider);
    this.colliders.push(collider);

    // Player seats: 6 anchors
    const seats = [];
    const seatRadiusX = a + 0.55;
    const seatRadiusZ = b + 0.55;
    for (let i=0;i<6;i++){
      const ang = (i/6) * Math.PI*2;
      const sx = Math.cos(ang) * seatRadiusX;
      const sz = Math.sin(ang) * seatRadiusZ;
      const anchor = new THREE.Group();
      anchor.name = `SeatAnchor_${i+1}`;
      anchor.position.set(sx, 0, sz);
      // face inward
      anchor.lookAt(0, 0, 0);
      // set hip target height
      const hip = new THREE.Group();
      hip.name = "SeatAnchor";
      hip.position.set(0, 0.55, 0.10);
      anchor.add(hip);

      const exit = new THREE.Group();
      exit.name = "SeatExit";
      exit.position.set(0, 0, 0.8);
      anchor.add(exit);

      g.add(anchor);
      seats.push(anchor);
    }
    g.userData.seats = seats;

    this.scene.add(g);
    this.objects.push(g);
    return g;
  }

  createChair({ x=0, z=0, yaw=0 }) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    g.name = "DevChair";

    const mat = new THREE.MeshStandardMaterial({ color: 0x2c2c36, roughness: 0.92 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.10, 0.62), mat);
    seat.position.set(0, 0.45, 0);
    g.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.10), mat);
    back.position.set(0, 0.82, -0.26);
    g.add(back);

    const legs = [
      [-0.25, 0.2, -0.25], [0.25, 0.2, -0.25],
      [-0.25, 0.2, 0.25], [0.25, 0.2, 0.25],
    ];
    for (const [lx,ly,lz] of legs) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.4,12), mat);
      leg.position.set(lx, ly, lz);
      g.add(leg);
    }

    const seatAnchor = new THREE.Group();
    seatAnchor.name = "SeatAnchor";
    seatAnchor.position.set(0, 0.55, 0.05);
    g.add(seatAnchor);

    const seatExit = new THREE.Group();
    seatExit.name = "SeatExit";
    seatExit.position.set(0, 0, 0.9);
    g.add(seatExit);

    this.scene.add(g);
    this.objects.push(g);
    return g;
  }

  async loadToAnchor(glbUrl, anchor, { scale=1, yOffset=0, yaw=0 } = {}) {
    const gltf = await this.loader.loadAsync(glbUrl);
    const model = gltf.scene;
    model.scale.setScalar(scale);
    model.position.set(0, yOffset, 0);
    model.rotation.y = yaw;
    anchor.add(model);
    return { model, animations: gltf.animations || [], gltf };
  }
}
