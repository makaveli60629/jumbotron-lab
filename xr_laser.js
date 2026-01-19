import * as THREE from "three";

/**
 * installLaserSelect
 * - Draws a visible laser from each controller
 * - Raycasts against targetMesh
 * - On selectstart (trigger), fires onSelect if the target is hit
 */
export function installLaserSelect({ scene, camera, renderer, targetMesh, onSelect }){
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();

  function makeController(i){
    const controller = renderer.xr.getController(i);

    // Laser line
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1)
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0x7a86ff });
    const line = new THREE.Line(geometry, material);
    line.name = "laser";
    line.scale.z = 6;
    controller.add(line);

    // A small reticle dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dot.visible = false;
    controller.add(dot);
    controller.userData.dot = dot;

    controller.addEventListener("selectstart", () => {
      // Perform raycast at time of click
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const hits = targetMesh ? raycaster.intersectObject(targetMesh, false) : [];
      if(hits.length){
        onSelect?.(hits[0]);
      }
    });

    scene.add(controller);
    return controller;
  }

  const c0 = makeController(0);
  const c1 = makeController(1);

  // per-frame update: show reticle where it hits
  renderer.setAnimationLoop((() => {
    // We'll not override the app's animation loop; instead we expose a hook:
  }));

  // Hook into render loop via XR frame callback-friendly "before render" event:
  renderer.xr.addEventListener("sessionstart", () => {});

  // Provide a lightweight update function by attaching to renderer
  if(!renderer.userData.__laserUpdaters) renderer.userData.__laserUpdaters = [];
  renderer.userData.__laserUpdaters.push(() => {
    [c0, c1].forEach((controller) => {
      if(!controller) return;
      tempMatrix.identity().extractRotation(controller.matrixWorld);
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

      const hits = targetMesh ? raycaster.intersectObject(targetMesh, false) : [];
      const dot = controller.userData.dot;
      if(hits.length){
        dot.visible = true;
        dot.position.copy(controller.worldToLocal(hits[0].point.clone()));
      } else {
        dot.visible = false;
      }
    });
  });

  // Monkey-patch renderer.render to run updaters before render (safe for this small lab)
  if(!renderer.userData.__renderPatched){
    const originalRender = renderer.render.bind(renderer);
    renderer.render = (sc, cam) => {
      const ups = renderer.userData.__laserUpdaters || [];
      for(const fn of ups) fn();
      return originalRender(sc, cam);
    };
    renderer.userData.__renderPatched = true;
  }
}
