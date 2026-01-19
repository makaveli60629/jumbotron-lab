export function wireUI({ items, onLoad, onOpen, onToggleHud }){
  const sel = document.getElementById("preset");
  const load = document.getElementById("load");
  const open = document.getElementById("open");
  const toggle = document.getElementById("toggleHud");

  sel.innerHTML = "";
  items.forEach((it, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i+1}. ${it.label}`;
    sel.appendChild(opt);
  });

  load.onclick = () => onLoad?.(sel.value);
  open.onclick = () => onOpen?.();
  toggle.onclick = () => onToggleHud?.();
}
