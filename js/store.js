// store.js - lightweight "store from the world" starter (safe + modular)
// This is a placeholder that you can expand into your full Scarlett store logic.
// It builds a kiosk with 3 panels and a teleport-friendly zone.

export async function init({ THREE, scene, rig, toast, diag }){
  const group = new THREE.Group();
  group.name = 'storeKiosk';
  group.position.set(14, 0, -10);
  scene.add(group);

  const kioskMat = new THREE.MeshStandardMaterial({ color: 0x0f1824, roughness:0.7, metalness:0.1 });
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 0.6), kioskMat);
  kiosk.position.set(0, 0.6, 0);
  kiosk.castShadow = true;
  kiosk.receiveShadow = true;
  group.add(kiosk);

  // Panels
  const panel = (title, x) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.0)';
    ctx.clearRect(0,0,512,512);

    ctx.fillStyle = 'rgba(5,12,18,0.85)';
    ctx.fillRect(24,24,464,464);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 6;
    ctx.strokeRect(24,24,464,464);

    ctx.fillStyle = '#e6eef7';
    ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 92);

    ctx.font = '24px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = 'rgba(230,238,247,0.85)';
    ctx.fillText('Click / tap placeholder', 256, 145);

    ctx.fillStyle = 'rgba(123,215,255,0.85)';
    ctx.fillText('• Chip Skins', 256, 220);
    ctx.fillText('• Table Themes', 256, 260);
    ctx.fillText('• Emotes', 256, 300);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), mat);
    mesh.position.set(x, 1.55, -0.7);
    mesh.lookAt(0, 1.55, -2.0);
    return mesh;
  };

  group.add(panel('STORE', -1.6), panel('CATALOG', 0), panel('CHECKOUT', 1.6));

  // A simple "portal" ring to mark store zone
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.25, 48), new THREE.MeshStandardMaterial({ color: 0x173a63, roughness:0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2;
  ring.position.y = 0.02;
  group.add(ring);

  toast?.('Store module loaded (starter kiosk).');
  diag?.set('store', 'kiosk ready');
}
