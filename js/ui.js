export function wireUI({ onApply, onToggleHud }){
  document.getElementById("apply").onclick = () =>
    onApply(document.getElementById("preset").value);
  document.getElementById("toggleHud").onclick = () => onToggleHud();
}
