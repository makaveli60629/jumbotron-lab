AFRAME.registerComponent('world-collisions', {
  schema:{
    enabled:{default:true},
    playerRadius:{type:'number',default:0.35},
    roomHalfSize:{type:'number',default:11.4},
    tableRadius:{type:'number',default:2.45},
    tableCenterX:{type:'number',default:0},
    tableCenterZ:{type:'number',default:0}
  },
  tick:function(t,dt){
    if(!this.data.enabled) return;
    const o=this.el.object3D, r=this.data.playerRadius;
    const lim=this.data.roomHalfSize;
    o.position.x=Math.min(lim,Math.max(-lim,o.position.x));
    o.position.z=Math.min(lim,Math.max(-lim,o.position.z));
    const dx=o.position.x-this.data.tableCenterX;
    const dz=o.position.z-this.data.tableCenterZ;
    const dist=Math.hypot(dx,dz);
    const minD=this.data.tableRadius + r;
    if(dist < minD){
      const k=minD/(dist||0.0001);
      o.position.x=this.data.tableCenterX + dx*k;
      o.position.z=this.data.tableCenterZ + dz*k;
    }
  }
});