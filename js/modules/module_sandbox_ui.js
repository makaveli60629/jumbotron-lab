export async function init(ctx){
  const panel = document.getElementById("modulesPanel");
  if (!panel){
    ctx?.log?.("Module Sandbox: panel not found.");
    return {};
  }
  const { MODULES } = await import("../modules_registry.js");

  function render(){
    panel.innerHTML = "";
    for (const m of MODULES){
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.marginBottom = "6px";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!m.enabled;
      cb.onchange = async () => {
        m.enabled = cb.checked;
        ctx?.log?.(`Sandbox: ${m.name} => ${m.enabled ? "ON" : "OFF"}`);
        if (window.__scarlett_reloadModules) await window.__scarlett_reloadModules();
        render();
      };

      const label = document.createElement("div");
      label.textContent = m.name;
      label.style.flex = "1";
      label.style.color = m.enabled ? "#00ffcc" : "#9ff";
      label.style.opacity = m.enabled ? "1" : "0.7";

      row.appendChild(cb);
      row.appendChild(label);
      panel.appendChild(row);
    }
  }

  render();
  ctx?.log?.("Module Sandbox UI: ready.");
  return { update(){} };
}
