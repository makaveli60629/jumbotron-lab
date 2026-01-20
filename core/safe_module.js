export async function safeModule(hud, name, fn) {
  try {
    hud.set(name, 'loading...');
    const res = await fn();
    hud.set(name, 'ok');
    return res;
  } catch (e) {
    console.error('[SAFE_MODULE]', name, e);
    hud.set(name, 'FAIL: ' + (e?.message || e));
    return null;
  }
}
