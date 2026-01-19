import * as THREE from "three";

/**
 * Laser + reticle system for Quest/VR controllers.
 * - Draws a visible laser line from each controller
 * - Raycasts the target mesh
 * - Trigger (selectstart) opens the current URL
 */
export function createLaserSystem({ scene, renderer, targetMesh, onSelect }){
  const raycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();

  function makeController(i){
    const controller = renderer.xr.getController(i);

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0x7a86ff });
    const line = new THREE.Line(geometry, material);
    line.scale.z = 6;
    controller.add(line);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dot.visible = false;
    controller.add(dot);
    controller.userData.dot = dot;

    controller.addEventListener("selectstart", () => {
      const hit = hitTest(controller);
      if(hit) onSelect?.(hit);
    });

    scene.add(controller);
    return controller;
  }

  function hitTest(controller){
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    const hits = targetMesh ? raycaster.intersectObject(targetMesh, false) : [];
    return hits.length ? hits[0] : null;
  }

  const c0 = makeController(0);
  const c1 = makeController(1);

  function update(){
    [c0, c1].forEach((controller) => {
      if(!controller) return;
      const hit = hitTest(controller);
      const dot = controller.userData.dot;
      if(hit){
        dot.visible = true;
        dot.position.copy(controller.worldToLocal(hit.point.clone()));
      } else {
        dot.visible = false;
      }
    });
  }

  return { update };
}
