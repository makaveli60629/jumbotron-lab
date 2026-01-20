// safe_modules.js - guarded dynamic imports (so a missing module doesn't break the whole build)

export async function safeLoadModules({ safety, diag, toast, modules, context }){
  for (const m of modules){
    try{
      diag?.set(`mod:${m.name}`, 'loading…');
      const mod = await import(m.path);
      if (typeof mod.init === 'function'){
        await mod.init({ ...context, toast, diag, safety });
        diag?.set(`mod:${m.name}`, 'ok');
      } else {
        diag?.set(`mod:${m.name}`, 'loaded (no init)');
      }
    } catch (e){
      console.warn('Module load error', m.name, e);
      diag?.set(`mod:${m.name}`, `ERROR`);
      if (safety?.enabled){
        toast?.(`Module "${m.name}" failed to load. Safe mode kept app running.`);
      } else {
        throw e;
      }
    }
  }
}
