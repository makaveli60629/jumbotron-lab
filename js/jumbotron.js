import * as THREE from "three";

export class Jumbotron {
  constructor(scene, opts){
    this.url = "";
    this.label = "STREAM";

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(opts.width+0.12, opts.height+0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x05050a })
    );
    frame.position.copy(opts.position);
    scene.add(frame);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.width, opts.height),
      new THREE.MeshStandardMaterial({ color: 0x101020 })
    );
    screen.position.copy(opts.position);
    screen.position.z += 0.05;
    scene.add(screen);

    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d");
    this.tex = new THREE.CanvasTexture(this.canvas);
    screen.material.map = this.tex;

    window.addEventListener("dblclick", () => {
      if(this.url) window.open(this.url, "_blank");
    });

    this.draw();
  }

  setSource({ url, label }){
    this.url = url;
    this.label = label;
    this.draw();
  }

  update(){}

  draw(){
    const c = this.ctx;
    c.fillStyle = "#0b0b12";
    c.fillRect(0,0,1024,512);
    c.fillStyle = "#fff";
    c.font = "bold 48px sans-serif";
    c.fillText("JUMBOTRON: " + this.label, 40, 80);
    c.font = "28px sans-serif";
    c.fillText("Double click / tap to open stream", 40, 160);
    this.tex.needsUpdate = true;
  }
}
