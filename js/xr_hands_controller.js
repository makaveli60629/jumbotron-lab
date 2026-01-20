
import * as THREE from "three";
export class XRHandsController {
  constructor({renderer,playerRoot}){
    this.renderer=renderer;this.playerRoot=playerRoot;
    this.left=new THREE.Group();this.right=new THREE.Group();
    playerRoot.add(this.left);playerRoot.add(this.right);
    this.waveTime=0;
  }
  startWave(t=1){this.waveTime=t;}
  update(dt){
    const s=this.renderer.xr.getSession?.();if(!s)return;
    const ref=this.renderer.xr.getReferenceSpace();
    const frame=this.renderer.xr.getFrame();if(!frame)return;
    for(const src of s.inputSources){
      if(!src.gripSpace)continue;
      const pose=frame.getPose(src.gripSpace,ref);if(!pose)continue;
      const g=src.handedness==="left"?this.left:this.right;
      g.position.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);
    }
    if(this.waveTime>0){this.waveTime-=dt;this.right.rotation.z=Math.sin(this.waveTime*10)*0.3;}
    else this.right.rotation.z=0;
  }
}
