import * as THREE from "three";

export class Jumbotron {
  constructor(scene, opts){
    this.url = "";
    this.label = "STREAM";

    const w = opts.width ?? 3.0;
    const h = opts.height ?? 1.7;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0b0b10,
      roughness: 0.35,
      metalness: 0.25,
      emissive: 0x080814,
      emissiveIntensity: 0.65
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w+0.14, h+0.14, 0.10), frameMat);
    frame.position.copy(opts.position ?? new THREE.Vector3(0,1.6,-2.2));
    frame.rotation.y = opts.rotationY ?? 0;
    scene.add(frame);

    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2f,
      roughness: 1.0,
      metalness: 0.0,
      emissive: 0x111118,
      emissiveIntensity: 0.95
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
    screen.position.copy(frame.position);
    screen.rotation.copy(frame.rotation);
    screen.position.z += 0.06;
    scene.add(screen);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.10,
        roughness: 0.15,
        metalness: 0.0,
        transmission: 0.6,
        thickness: 0.02,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2
      })
    );
    glass.position.copy(screen.position);
    glass.rotation.copy(screen.rotation);
    glass.position.z += 0.01;
    scene.add(glass);

    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d");
    this.tex = new THREE.CanvasTexture(this.canvas);

    screen.material.map = this.tex;
    screen.material.needsUpdate = true;

    this.frame = frame;
    this.screen = screen;
    this.glass = glass;

    this.draw();
  }

  setSource({ url, label }){
    this.url = url || "";
    this.label = label || "STREAM";
    this.draw();
  }

  update(){}

  draw(){
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    ctx.fillStyle = "#20202a";
    ctx.fillRect(0,0,this.canvas.width,this.canvas.height);

    ctx.fillStyle = "#2e2e3f";
    ctx.fillRect(0,0,this.canvas.width,110);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px system-ui, sans-serif";
    ctx.fillText("JUMBOTRON", 40, 75);

    ctx.fillStyle = "#cfd3ff";
    ctx.font = "bold 34px system-ui, sans-serif";
    wrapText(ctx, this.label, 40, 155, 940, 38);

    ctx.fillStyle = "#ffffff";
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText("Quest: laser + trigger to open", 40, 230);
    ctx.fillText("Android: press Open", 40, 270);

    ctx.fillStyle = "#9aa0ff";
    ctx.font = "22px system-ui, sans-serif";
    const shortUrl = this.url ? this.url.replace(/^https?:\/\//, "") : "(no url)";
    wrapText(ctx, shortUrl, 40, 330, 940, 28);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(40, 452, 944, 2);

    ctx.fillStyle = "#cfd3ff";
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Portal mode (reliable). Host MP4/HLS for true in-world playback.", 40, 490);

    this.tex.needsUpdate = true;
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = (text || "").split(" ");
  let line = "";
  for(let n=0;n<words.length;n++){
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if(metrics.width > maxWidth && n > 0){
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
