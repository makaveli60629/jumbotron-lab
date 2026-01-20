import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export class SpineDebug{
  constructor(scene){
    this.scene = scene;
    this.lines = [];
    this.targets = [];
    this.visible = true;
  }
  attachTo(avatar){
    this.targets.push(avatar);
  }
  setVisible(v){
    this.visible = v;
    for (const l of this.lines) l.visible = v;
  }
  _line(a,b,color=0x7ee0ff){
    const geo = new THREE.BufferGeometry().setFromPoints([a,b]);
    const mat = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.visible = this.visible;
    this.scene.add(line);
    this.lines.push(line);
    return line;
  }
  update(){
    // rebuild lines each frame (cheap: few lines)
    for (const l of this.lines) this.scene.remove(l);
    this.lines.length = 0;

    for (const av of this.targets){
      const p = av.parts;
      if (!p) continue;
      const root = av.root;
      const pts = [];

      const getW = (obj)=>{
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        return v;
      };

      // spine approximation: hips->waist->chest->neck->head
      if (p.hips && p.waist && p.chest && p.neck && p.headPivot){
        pts.push(getW(p.hips), getW(p.waist), getW(p.chest), getW(p.neck), getW(p.headPivot));
        for (let i=0;i<pts.length-1;i++){
          this._line(pts[i], pts[i+1], 0x7ee0ff);
        }
      }

      // arms
      if (p.shoulderL && p.elbowL && p.wristL){
        this._line(getW(p.shoulderL), getW(p.elbowL), 0xffcc66);
        this._line(getW(p.elbowL), getW(p.wristL), 0xffcc66);
      }
      if (p.shoulderR && p.elbowR && p.wristR){
        this._line(getW(p.shoulderR), getW(p.elbowR), 0xffcc66);
        this._line(getW(p.elbowR), getW(p.wristR), 0xffcc66);
      }

      // legs
      if (p.hipL && p.kneeL && p.ankleL){
        this._line(getW(p.hipL), getW(p.kneeL), 0x8dff8d);
        this._line(getW(p.kneeL), getW(p.ankleL), 0x8dff8d);
      }
      if (p.hipR && p.kneeR && p.ankleR){
        this._line(getW(p.hipR), getW(p.kneeR), 0x8dff8d);
        this._line(getW(p.kneeR), getW(p.ankleR), 0x8dff8d);
      }
    }
  }
}
