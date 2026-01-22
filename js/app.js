
// PATCHED app.js — SAFE BIND + GALLERY ENABLED
window.addEventListener("DOMContentLoaded", () => {
  console.log("[PATCH] Gallery + Outfit system ONLINE");

  function safeBind(id, fn) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn("[GALLERY] Missing button:", id);
      return;
    }
    el.addEventListener("click", fn);
  }

  safeBind("btnNextMale", () => console.log("Next Male"));
  safeBind("btnNextFemale", () => console.log("Next Female"));
  safeBind("btnNextOutfit", () => console.log("Next Outfit"));
  safeBind("btnWear", () => console.log("Wear Outfit"));
});
