import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

export class World{
 constructor(scene,camera,renderer){
  this.scene=scene;
  this.loader=new GLTFLoader();
  this.scene.add(new THREE.AmbientLight(0xffffff,0.6));
  const l=new THREE.DirectionalLight(0xffffff,0.8); l.position.set(2,4,2); this.scene.add(l);
  this.loadAvatar();
 }
 loadAvatar(){
  this.loader.load("./assets/avatar.gltf",g=>{
   this.avatar=g.scene;
   this.avatar.position.set(0,0,0);
   this.scene.add(this.avatar);
  });
 }
 update(){}
}
