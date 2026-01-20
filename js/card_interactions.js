
import * as THREE from "three";
export class CardInteractions{
  constructor({scene,camera,handsCtrl}){
    this.scene=scene;this.camera=camera;this.handsCtrl=handsCtrl;
    this.ray=new THREE.Raycaster();this.cards=[];this.zones=[];this.held=null;
  }
  registerCard(m,id){m.userData.cardId=id;this.cards.push(m);}
  registerPlayZone(m,id){m.userData.zoneId=id;this.zones.push(m);}
  grabRightHand(){
    if(this.held)return;
    this.ray.setFromCamera({x:0,y:0},this.camera);
    const h=this.ray.intersectObjects(this.cards,true)[0];
    if(!h)return;
    this.held=h.object;
    this.handsCtrl.right.add(this.held);
    this.held.position.set(0,0,-0.08);
  }
  releaseHeld(){
    if(!this.held)return;
    this.scene.add(this.held);
    this.held=null;
  }
}
