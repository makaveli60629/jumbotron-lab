export function createDiag(CONFIG) {
  const lines = [];
  const start = performance.now();
  const stamp = () => `${String(Math.round(performance.now() - start)).padStart(5, " ")}ms`;

  function push(level, tag, msg) {
    lines.push(`${stamp()} [${level}] ${tag} :: ${msg}`);
    if (lines.length > 600) lines.shift();
  }

  push("INFO", "BUILD", CONFIG.build);
  push("INFO", "HREF", location.href);
  push("INFO", "CTX", `secureContext=${String(window.isSecureContext)}`);
  push("INFO", "UA", navigator.userAgent);

  return {
    log: (tag, msg) => push("INFO", tag, msg),
    warn: (tag, msg) => push("WARN", tag, msg),
    err: (tag, e) => push("ERR", tag, (e?.stack || e?.message || String(e))),
    dump: () => lines.join("\n")
  };
}
