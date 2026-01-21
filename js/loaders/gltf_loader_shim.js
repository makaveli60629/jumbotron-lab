// js/loaders/gltf_loader_shim.js
// Runtime GLTFLoader import with multiple CDN fallbacks (GitHub Pages + Android safe).
export async function getGLTFLoader(log=console.log){
  const tries = [
    "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
    "https://cdn.skypack.dev/three@0.160.0/examples/jsm/loaders/GLTFLoader.js",
  ];
  for(const url of tries){
    try{
      log(`[Loader] Trying GLTFLoader: ${url}`);
      const mod = await import(url);
      if(mod && mod.GLTFLoader){
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
