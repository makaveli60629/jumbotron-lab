import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

/**
 * Spine diagnostic (PRESERVED):
 * draws a line through pelvis -> stomach -> chest -> neck -> head.
 */
export function createSpineDiagnostic(scene, avatar){
  const mat = new THREE.LineBasicMaterial({ color: 0x00ff99 });
  const pts = [new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geom, mat);
  line.frustumCulled = false;
  scene.add(line);

  function update(){
    const j = avatar.userData.joints || {};
    const keys = ['pelvis','stomach','chest','neck','head'];
    for(let i=0;i<keys.length;i++){
      const o = j[keys[i]];
      if(o){ o.getWorldPosition(pts[i]); }
    }
    geom.setFromPoints(pts);
    geom.attributes.position.needsUpdate = true;
  }

  return { line, update };
}
