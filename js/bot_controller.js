AFRAME.registerComponent('no-anim', {
  schema:{label:{default:'model'}},
  init:function(){
    this.el.addEventListener('model-loaded', ()=>{
      // Force-remove any animation-mixer added elsewhere (or by old builds)
      if (this.el.hasAttribute('animation-mixer')) this.el.removeAttribute('animation-mixer');
      // Also detach mixer component if it exists
      if (this.el.components && this.el.components['animation-mixer']) {
        try { this.el.components['animation-mixer'].pause(); } catch(e) {}
      }

      const mesh=this.el.getObject3D('mesh');
      const anims = mesh?.animations || [];
      const names = anims.map(a=>a.name||'').filter(Boolean);

      window.__ANIM_DIAG__ = window.__ANIM_DIAG__ || {};
      window.__ANIM_DIAG__[this.data.label] = {
        removed: true,
        clipCount: anims.length,
        names
      };
    });
  }
});

AFRAME.registerComponent('bot-walker', {
  schema:{speed:{type:'number',default:0.85}, radius:{type:'number',default:0.45}},
  init:function(){
    this.target=new THREE.Vector3(); this.tmp=new THREE.Vector3(); this.dir=new THREE.Vector3();
    this.vel=new THREE.Vector3(); this.turn=7.0; this.accel=8.0; this.pick();
  },
  pick:function(){
    const ring=6.7, a=Math.random()*Math.PI*2, lim=10.6;
    this.target.set(Math.cos(a)*ring, 0, Math.sin(a)*ring);
    this.target.x=Math.min(lim,Math.max(-lim,this.target.x));
    this.target.z=Math.min(lim,Math.max(-lim,this.target.z));
  },
  tick:function(t,dt){
    const o=this.el.object3D, step=dt/1000;
    if(Math.random()<0.0018) this.pick();
    this.dir.copy(this.target).sub(o.position);
    const dist=this.dir.length();
    if(dist<0.8) this.pick();
    this.dir.normalize();
    const desired=this.tmp.copy(this.dir).multiplyScalar(this.data.speed);
    const lerp=1-Math.exp(-this.accel*step);
    this.vel.lerp(desired, lerp);
    o.position.addScaledVector(this.vel, step);

    const tableR=2.45 + this.data.radius;
    const dx=o.position.x, dz=o.position.z;
    const d=Math.hypot(dx,dz);
    if(d<tableR){
      const k=tableR/(d||0.0001);
      o.position.x=dx*k; o.position.z=dz*k;
      this.pick();
    }
    const lim=11.2;
    o.position.x=Math.min(lim,Math.max(-lim,o.position.x));
    o.position.z=Math.min(lim,Math.max(-lim,o.position.z));

    const yaw=Math.atan2(this.vel.x,this.vel.z);
    o.rotation.y += (yaw-o.rotation.y)*(1-Math.exp(-this.turn*step));
  }
});

AFRAME.registerComponent('bot-seated', {
  schema:{chairSelector:{default:'.chair'}},
  init:function(){
    const chair=document.querySelector(this.data.chairSelector) || document.querySelector('.chair');
    if(!chair) return;
    const anchor=chair.querySelector('.seatAnchor');
    const rig=this.el.object3D;
    if(anchor){
      const wp=new THREE.Vector3();
      anchor.object3D.getWorldPosition(wp);
      rig.position.set(wp.x, 0, wp.z);
      rig.rotation.y = chair.object3D.rotation.y;
    }
  }
});