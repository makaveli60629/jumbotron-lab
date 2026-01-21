// gltf_loader_shim.js
// Purpose: Robust CDN fallback for GLTFLoader on GitHub Pages + Android Chrome.
// We avoid hard-failing static imports by trying multiple CDNs at runtime.

export async function getGLTFLoader(log=console.log){
  const tries = [
    // jsDelivr tends to behave best for module CORS + caching
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    // unpkg fallback
    "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    // esm.sh (rewrites deps) fallback
    "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    // skypack legacy fallback
    "https://cdn.skypack.dev/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
  ];

  for (const url of tries){
    try{
      log(`[Loader] Trying GLTFLoader: ${url}`);
      const mod = await import(url);
      if (mod && mod.GLTFLoader){
        log("[Loader] GLTFLoader OK.");
        return mod.GLTFLoader;
      }
    }catch(e){
      log(`[Loader] Failed: ${url} :: ${e?.message||e}`);
    }
  }
  log("[Loader] GLTFLoader unavailable (all CDNs).");
  return null;
}
