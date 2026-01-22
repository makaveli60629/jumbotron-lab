export class Diagnostics {
  constructor({el, statusEl}){
    this.el = el;
    this.statusEl = statusEl;
    this.visible = false;
    this.lines = [];
    this.stats = {
      startedAt: performance.now(),
      fps: 0,
      frames: 0,
      lastFpsAt: performance.now(),
      xr: 'unknown',
      session: 'none',
      controllers: 0,
      movement: 'unknown',
      room: 'lobby',
      loaded: [],
      errors: []
    };
  }
  setVisible(v){
    this.visible = v;
    this.el.style.display = v ? 'block' : 'none';
  }
  toggle(){ this.setVisible(!this.visible); }
  log(line){
    this.lines.push(String(line));
    if (this.lines.length > 80) this.lines.shift();
  }
  error(err){
    const msg = (err && err.message) ? err.message : String(err);
    this.stats.errors.push(msg);
    if (this.stats.errors.length > 12) this.stats.errors.shift();
    this.log('ERROR: ' + msg);
  }
  setStatus(text){
    this.statusEl.textContent = text;
  }
  setRoom(room){ this.stats.room = room; }
  setMovement(m){ this.stats.movement = m; }
  setXR({supported, inSession, controllers}){
    this.stats.xr = supported ? 'supported' : 'not supported';
    this.stats.session = inSession ? 'active' : 'none';
    this.stats.controllers = controllers || 0;
  }
  setLoaded(list){ this.stats.loaded = list.slice(0, 20); }

  tick(){
    this.stats.frames++;
    const now = performance.now();
    if (now - this.stats.lastFpsAt >= 500){
      const dt = now - this.stats.lastFpsAt;
      this.stats.fps = Math.round((this.stats.frames / dt) * 1000);
      this.stats.frames = 0;
      this.stats.lastFpsAt = now;
    }
    if (!this.visible) return;

    const up = Math.round((now - this.stats.startedAt)/1000);
    const hdr = [
      'TEST SERVER DIAGNOSTICS',
      '----------------------',
      `Uptime: ${up}s`,
      `FPS: ${this.stats.fps}`,
      `XR: ${this.stats.xr} | Session: ${this.stats.session} | Controllers: ${this.stats.controllers}`,
      `Room: ${this.stats.room}`,
      `Movement: ${this.stats.movement}`,
      `Loaded: ${this.stats.loaded.join(', ') || '(none)'}`,
      this.stats.errors.length ? ('Errors: ' + this.stats.errors.join(' | ')) : 'Errors: (none)',
      '',
      'Log:',
      ...this.lines.slice(-18)
    ];
    this.el.textContent = hdr.join('\n');
  }
}
