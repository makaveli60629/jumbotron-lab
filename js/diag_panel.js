export class DiagPanel {
  constructor() {
    this.el = document.getElementById("diagPanel");
    this.linesEl = document.getElementById("diagLines");
    this.enabled = true;
    this.lastFpsT = performance.now();
    this.frames = 0;
    this.fps = 0;
  }
  setEnabled(v) {
    this.enabled = !!v;
    this.el.style.display = this.enabled ? "block" : "none";
  }
  tick() {
    if (!this.enabled) return;
    this.frames++;
    const now = performance.now();
    if (now - this.lastFpsT >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastFpsT));
      this.frames = 0;
      this.lastFpsT = now;
    }
  }
  render(lines) {
    if (!this.enabled) return;
    const safe = (lines || []).map(l => String(l));
    this.linesEl.textContent = safe.join("\\n");
  }
}
