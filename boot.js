(() => {
  const logEl = document.getElementById("hudlog");
  const errEl = document.getElementById("bootError");
  function log(msg){
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    try{
      if (logEl){
        if (!logEl.__initDone){
          logEl.__initDone = true;
          logEl.textContent = "";
        }
        logEl.textContent += line + "\n";
        logEl.scrollTop = logEl.scrollHeight;
      }
    }catch(_){}
    try{ console.log(line); }catch(_){}
  }
  function showError(msg){
    try{
      if (errEl){
        errEl.style.display = "block";
        errEl.innerHTML =
          `<div style="font-weight:900;margin-bottom:6px;">BOOT FAILED</div>` +
          `<div style="white-space:pre-wrap;line-height:1.3;">${msg}</div>` +
          `<div style="margin-top:8px;opacity:.9;">Fix: GitHub Pages cache can hold old files. Open URL with <b>?v=99</b> or clear site data.</div>`;
      }
    }catch(_){}
  }

  // Capture silent errors
  window.addEventListener("error", (e)=> {
    log(`JS ERROR: ${e?.message || e}`);
    showError(`JS ERROR:\n${e?.message || e}\n\nTip: open Chrome -> ⋮ -> Settings -> Site settings -> Storage -> Clear.`);
  });
  window.addEventListener("unhandledrejection", (e)=> {
    const r = e?.reason?.message || e?.reason || e;
    log(`PROMISE ERROR: ${r}`);
    showError(`PROMISE ERROR:\n${r}`);
  });

  log("BOOT: starting (CDN mode with fallback)…");

  // Watchdog: if app never signals ready, show error
  const watchdog = setTimeout(() => {
    if (!window.__SCARLETT_APP_READY){
      showError(
        "App did not start.\n\nMost common causes:\n" +
        "1) GitHub Pages still serving an older index.html / missing files\n" +
        "2) index path mismatch (repo subfolder vs root)\n" +
        "3) CDN import blocked by network/DNS\n\n" +
        "Try: add ?v=99 to URL and reload.\n" +
        "Also test CDN: open https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js in your browser."
      );
    }
  }, 4000);

  // Load the real app as a module via dynamic import (works from classic scripts)
  import(`./app.mjs?v=${Date.now()}`)
    .then(mod => mod.start?.({ log }) || null)
    .then(() => { window.__SCARLETT_APP_READY = true; clearTimeout(watchdog); log("BOOT: app started."); })
    .catch(err => {
      const msg = (err && (err.stack || err.message)) ? (err.stack || err.message) : String(err);
      log(`BOOT: failed to import app.mjs :: ${msg}`);
      showError(`Failed to load app.mjs.\n\n${msg}`);
    });
})();