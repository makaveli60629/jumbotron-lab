
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function damp(c,t,l,dt){return THREE.MathUtils.lerp(c,t,1-Math.exp(-l*dt));}
function pick(anims,names){return anims.find(a=>names.includes(a.name));}

export class AvatarWalkController {
  constructor({scene,playerRoot,camera,glbUrl,faceFixYawRad=0}){
    this.scene=scene;this.playerRoot=playerRoot;this.camera=camera;
    this.maxWalkSpeed=1.6;this.maxRunSpeed=3.2;
    this.accelLambda=10;this.turnLambda=14;
    this.vel=new THREE.Vector3();this.target=new THREE.Vector3();
    this.move=new THREE.Vector2();this.run=false;
    this.loader=new GLTFLoader();
    this.loader.load(glbUrl,g=>this._init(g,faceFixYawRad));
  }
  _init(gltf,yaw){
    this.avatar=gltf.scene;this.avatar.rotation.y=yaw;
    this.playerRoot.add(this.avatar);
    this.mixer=new THREE.AnimationMixer(this.avatar);
    const a=gltf.animations;
    this.idle=this.mixer.clipAction(pick(a,["Idle","idle"]));
    this.walk=this.mixer.clipAction(pick(a,["Walk","Walking"]));
    this.runA=this.mixer.clipAction(pick(a,["Run","Running"]));
    this.current=this.idle;this.current.play();
    this.hips=this.avatar.getObjectByName("Hips")||this.avatar.getObjectByName("mixamorigHips");
    if(this.hips)this.hipsXZ=this.hips.position.clone();
  }
  setMoveInput(x,y){this.move.set(x,y);}
  setRunHeld(v){this.run=v;}
  update(dt){
    if(!this.avatar)return;
    const yaw=new THREE.Euler().setFromQuaternion(this.camera.quaternion,"YXZ").y;
    const f=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    const r=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    const wish=f.multiplyScalar(this.move.y).add(r.multiplyScalar(this.move.x));
    const m=Math.min(1,wish.length());
    if(m>0)wish.normalize();
    const sp=this.run?this.maxRunSpeed:this.maxWalkSpeed;
    this.target.copy(wish).multiplyScalar(sp*m);
    this.vel.x=damp(this.vel.x,this.target.x,this.accelLambda,dt);
    this.vel.z=damp(this.vel.z,this.target.z,this.accelLambda,dt);
    this.playerRoot.position.addScaledVector(this.vel,dt);
    if(this.vel.length()>0.1)this.playerRoot.rotation.y=Math.atan2(this.vel.x,this.vel.z);
    this.mixer.update(dt);
    if(this.hips&&this.hipsXZ){this.hips.position.x=this.hipsXZ.x;this.hips.position.z=this.hipsXZ.z;}
  }
}
