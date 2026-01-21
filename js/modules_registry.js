// Module registry: add/remove modules here without touching engine.
// Any module must export: init(ctx) -> { update(dt,t)?, dispose()? }
export const MODULES = [
  { name: "module_sandbox_ui", enabled: true,  path: "./modules/module_sandbox_ui.js" },
  { name: "poker_table_sim",  enabled: true,  path: "./modules/poker_table_sim.js" }
];

export async function loadEnabledModules(ctx){
  const loaded = [];
  for (const m of MODULES){
    if (!m.enabled) continue;
    try{
      const mod = await import(m.path + `?v=${Date.now()}`); // cache-bust during dev
      const inst = await (mod.init?.(ctx) ?? null);
      if (inst) loaded.push(inst);
      ctx?.log?.(`Module OK: ${m.name}`);
    }catch(err){
      ctx?.log?.(`Module FAIL: ${m.name} :: ${err?.message || err}`);
    }
  }
  return loaded;
}
