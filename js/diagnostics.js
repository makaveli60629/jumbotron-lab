export function createDiagnostics(el){
  const state = { visible:true, map:new Map(), fps:0, _acc:0, _frames:0 };

  function set(k,v){ state.map.set(k,v); }
  function toggle(){ state.visible = !state.visible; el.style.display = state.visible ? 'block' : 'none'; }

  function tick(dt, renderer, rig){
    state._acc += dt; state._frames += 1;
    if (state._acc >= 0.5){
      state.fps = Math.round(state._frames / state._acc);
      state._acc = 0; state._frames = 0;
    }
    set('fps', state.fps);
    set('xr', renderer.xr?.isPresenting ? 'presenting' : 'ready');
    if (rig?.root){
      const p = rig.root.position;
      set('pos', `${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`);
      set('yaw', `${rig.state.yaw.toFixed(2)}`);
    }
    render();
  }

  function render(){
    if (!state.visible) return;
    const rows = [];
    for (const [k,v] of state.map.entries()){
      rows.push(`<div><b>${esc(k)}</b>: ${esc(String(v))}</div>`);
    }
    el.innerHTML = rows.join('');
  }

  return { set, tick, toggle };
}
function esc(s){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
