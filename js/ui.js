export function wireUI({ items, onPrev, onNext, onPick, onOpen, onToggleHud }){
  const sel = document.getElementById("preset");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const open = document.getElementById("open");
  const toggleHud = document.getElementById("toggleHud");

  // populate select
  sel.innerHTML = "";
  items.forEach((it, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i+1}. ${it.label}`;
    sel.appendChild(opt);
  });

  prev.onclick = () => onPrev?.();
  next.onclick = () => onNext?.();
  sel.onchange = () => onPick?.(sel.value);
  open.onclick = () => onOpen?.();
  toggleHud.onclick = () => onToggleHud?.();
}
