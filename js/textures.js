import * as THREE from "three";

export const TexturePacket = {
  getShowroomFelt() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0a1220";
    ctx.fillRect(0, 0, 1024, 1024);

    // subtle speckle noise for felt
    const img = ctx.getImageData(0,0,1024,1024);
    for (let i=0;i<img.data.length;i+=4){
      const n = (Math.random()*18)|0;
      img.data[i+0] = Math.min(255, img.data[i+0] + n);
      img.data[i+1] = Math.min(255, img.data[i+1] + n);
      img.data[i+2] = Math.min(255, img.data[i+2] + n);
      img.data[i+3] = 255;
    }
    ctx.putImageData(img,0,0);

    ctx.strokeStyle = "#d2b46a";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(512, 512, 420, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(210, 180, 106, 0.18)";
    ctx.setLineDash([22, 22]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(512, 512);
      ctx.lineTo(512 + Math.cos(a) * 512, 512 + Math.sin(a) * 512);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  },

  getScorpionFelt() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0f1724";
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 15;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#00ffff";
    ctx.beginPath();
    ctx.arc(512, 512, 380, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  }
};
