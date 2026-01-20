let hudVisible = true;

export function setHudVisible(v){
  hudVisible = v;
  const ui = document.getElementById('ui');
  if (!ui) return;
  ui.classList.toggle('hidden', !hudVisible);
}

export function toast(msg){
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = String(msg);
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), 1800);
}

export class DevHUD{
  constructor(outEl){
    this.outEl = outEl;
    this.map = new Map();
    this.tick();
  }
  set(k,v){
    this.map.set(k, v);
  }
  dump(){
    const lines = [];
    for (const [k,v] of this.map.entries()){
      lines.push(`${k.padEnd(12,' ')} : ${v}`);
    }
    return lines.join('\n');
  }
  tick(){
    if (this.outEl){
      this.outEl.textContent = this.dump();
    }
    requestAnimationFrame(()=>this.tick());
  }
}
