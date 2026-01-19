// Module registry: add/remove modules here without touching engine.
// Any module must export: init(ctx) -> { update(dt,t)?, dispose()? }

export const MODULES = [
  // Example:
  // { name: "dealer_bot", enabled: false, path: "./js/modules/dealer_bot.js" }
];

export async function loadEnabledModules(ctx){
  const loaded = [];
  for (const m of MODULES){
    if (!m.enabled) continue;
    try{
      const mod = await import(m.path);
      const inst = await (mod.init?.(ctx) ?? null);
      if (inst) loaded.push(inst);
      ctx?.log?.(`Module OK: ${m.name}`);
    }catch(err){
      ctx?.log?.(`Module FAIL: ${m.name} :: ${err?.message || err}`);
    }
  }
  return loaded;
}
