// lobby_fx.js - light ambience + ceiling lights (safe, cosmetic)
export async function init({ THREE, scene, diag }){
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x070b10, roughness:0.95, metalness:0.0 })
  );
  ceiling.rotation.x = Math.PI/2;
  ceiling.position.y = 4.4;
  scene.add(ceiling);

  const mkLight = (x,z,intensity=1.0)=>{
    const l = new THREE.PointLight(0x9ad6ff, intensity, 18, 2);
    l.position.set(x, 3.6, z);
    scene.add(l);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x9ad6ff })
    );
    bulb.position.copy(l.position);
    scene.add(bulb);
  };
  mkLight(0, -7, 1.2);
  mkLight(14, -10, 1.0);
  mkLight(-14, -10, 1.0);
  mkLight(0, 10, 0.9);

  diag?.set('fx', 'ceiling+lights');
}
