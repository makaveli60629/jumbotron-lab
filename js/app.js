window.addEventListener("DOMContentLoaded", () => {
  console.log("[AvatarLab] app.js loaded");

  const avatarSlot = document.getElementById("avatarSlot");

  const males = [
    "assets/models/male_mesh.glb",
    "assets/models/free_pack_male_base_mesh.glb"
  ];

  const females = [
    "assets/models/free_pack_female_base_mesh.glb"
  ];

  const outfits = [
    "assets/clothes/futuristic_apocalypse_female_cargo_pants.glb"
  ];

  let m = 0, f = 0, o = 0;

  function loadModel(src){
    avatarSlot.innerHTML = "";
    const ent = document.createElement("a-entity");
    ent.setAttribute("gltf-model", src);
    ent.setAttribute("scale","1 1 1");
    avatarSlot.appendChild(ent);
  }

  document.getElementById("btnNextMale").onclick = () => {
    loadModel(males[m++ % males.length]);
  };

  document.getElementById("btnNextFemale").onclick = () => {
    loadModel(females[f++ % females.length]);
  };

  document.getElementById("btnNextOutfit").onclick = () => {
    loadModel(outfits[o++ % outfits.length]);
  };

  document.getElementById("btnWear").onclick = () => {
    alert("Outfit bind phase comes next ✔");
  };

});
