// store.js - "real" store hooks starter: kiosk + clickable teleport pads integration.
// Expand this into your full Scarlett store logic.

export async function init({ THREE, scene, rig, world, interactor, toast, diag }){
  // Store area marker
  const group = new THREE.Group();
  group.name = 'storeZone';
  group.position.set(world.anchors.store.x, 0, world.anchors.store.z);
  scene.add(group);

  const kioskMat = new THREE.MeshStandardMaterial({ color: 0x0f1824, roughness:0.7, metalness:0.1 });
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.35, 0.7), kioskMat);
  kiosk.position.set(0, 0.67, 0.0);
  kiosk.castShadow = true; kiosk.receiveShadow = true;
  group.add(kiosk);

  const mkPanel = (title, x, onClick) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,512,512);
    ctx.fillStyle = 'rgba(5,12,18,0.85)';
    ctx.fillRect(24,24,464,464);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 6;
    ctx.strokeRect(24,24,464,464);

    ctx.fillStyle = '#e6eef7';
    ctx.font = 'bold 46px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 92);

    ctx.font = '24px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = 'rgba(230,238,247,0.85)';
    ctx.fillText('Activate to run action', 256, 145);

    ctx.fillStyle = 'rgba(123,215,255,0.88)';
    ctx.fillText('• Chip Skins', 256, 235);
    ctx.fillText('• Table Themes', 256, 275);
    ctx.fillText('• Emotes', 256, 315);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent:true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), mat);
    mesh.position.set(x, 1.70, -0.9);
    mesh.lookAt(0, 1.70, -2.2);

    interactor?.register(mesh, ()=>{
      onClick?.();
    });

    return mesh;
  };

  group.add(
    mkPanel('STORE', -1.9, ()=>toast?.('Store: open catalog (stub)')),
    mkPanel('CATALOG', 0, ()=>toast?.('Catalog: browse items (stub)')),
    mkPanel('CHECKOUT', 1.9, ()=>toast?.('Checkout: coming soon (stub)')),
  );

  // Hook teleport pads: clicking pad labels teleports
  for (const pad of world.pads){
    interactor?.register(pad, ()=>{
      const n = pad.name?.replace('pad_','').toLowerCase();
      // map pad_SPAWN etc
      if (pad.name.includes('SPAWN')) world.teleportTo('spawn', rig);
      else if (pad.name.includes('TABLE')) world.teleportTo('table', rig);
      else if (pad.name.includes('STORE')) world.teleportTo('store', rig);
      else if (pad.name.includes('LOUNGE')) world.teleportTo('lounge', rig);
    });
  }

  toast?.('Store module loaded (clickable kiosk + teleport pads).');
  diag?.set('store', 'kiosk + pads wired');
}
