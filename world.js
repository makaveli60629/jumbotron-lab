// FILE: world.js | LOCATION: Root | PURPOSE: Hands & Meta-Avatar Mesh
import * as THREE from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

export class World {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.handFactory = new XRHandModelFactory();

        this.addLights();
        this.addHands();
        this.addMetaAvatar();
    }

    addLights() {
        const light = new THREE.PointLight(0x00ffff, 1, 10);
        light.position.set(0, 2, 0);
        this.scene.add(light, new THREE.AmbientLight(0x404040));
    }

    addHands() {
        // Hand tracking setup (No Controllers)
        this.handL = this.renderer.xr.getHand(0);
        this.handL.add(this.handFactory.createHandModel(this.handL, "mesh"));
        this.scene.add(this.handL);

        this.handR = this.renderer.xr.getHand(1);
        this.handR.add(this.handFactory.createHandModel(this.handR, "mesh"));
        this.scene.add(this.handR);
    }

    addMetaAvatar() {
        // High-step subdivision for a smooth "Meta" feel
        const geo = new THREE.IcosahedronGeometry(0.2, 5); 
        const mat = new THREE.MeshPhysicalMaterial({ 
            color: 0x00aaff, 
            transmission: 0.6, 
            thickness: 1, 
            roughness: 0.1 
        });
        this.avatar = new THREE.Mesh(geo, mat);
        this.avatar.position.set(0, 1.4, -0.5);
        this.scene.add(this.avatar);
    }

    update(time) {
        if(this.avatar) {
            this.avatar.rotation.y = time * 0.0005;
            // Pulse effect to show life
            const s = 1 + Math.sin(time * 0.002) * 0.05;
            this.avatar.scale.set(s, s, s);
        }
    }
}
