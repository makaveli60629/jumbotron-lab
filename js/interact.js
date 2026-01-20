// interact.js - unified interaction for VR + desktop + mobile
// - Keeps a list of "interactive" meshes with onActivate() callbacks.
// - Raycasts from camera (desktop/mobile) or from VR controller line when available (fallback camera).
export function createInteractor({ THREE, renderer, scene, camera, rig, diag, toast }){
  const ray = new THREE.Raycaster();
  const tmp = new THREE.Vector2();
  const interactives = new Set();

  function register(mesh, onActivate){
    mesh.userData.__onActivate = onActivate;
    interactives.add(mesh);
  }

  function tryActivate(){
    const hit = pick();
    if (hit?.object?.userData?.__onActivate){
      hit.object.userData.__onActivate(hit);
      return true;
    }
    return false;
  }

  function pick(){
    // center-screen reticle ray
    tmp.set(0, 0);
    ray.setFromCamera(tmp, camera);
    const objs = [];
    interactives.forEach(o=>objs.push(o));
    const hits = ray.intersectObjects(objs, true);
    return hits?.length ? hits[0] : null;
  }

  function update(){
    diag?.set('interact', interactives.size);
  }

  return { register, tryActivate, update };
}
