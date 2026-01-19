import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { buildRoom } from "./room.js";
import { Jumbotron } from "./jumbotron.js";
import { wireUI } from "./ui.js";
import { createLaserSystem } from "./xr_laser.js";

/**
 * Replace these with YOUR playlist/channel links any time.
 * You can use: channel links, playlist links, live links, or search URLs.
 */
const ITEMS = [
  { label: "ABC News Live", url: "https://www.youtube.com/@ABCNews/live" },
  { label: "CBS News Live", url: "https://www.youtube.com/@CBSNews/live" },
  { label: "Chicago News (Live Search)", url: "https://www.youtube.com/results?search_query=chicago+news+live" },
  { label: "Football / NFL (Live Search)", url: "https://www.youtube.com/results?search_query=nfl+live" },
  { label: "Weather Live", url: "https://www.youtube.com/results?search_query=weather+live+radar" },
  { label: "Music Live", url: "https://www.youtube.com/results?search_query=live+music" }
];

const state = { idx: 0 };

function log(msg){
  console.log(msg);
  const el = document.getElementById("log");
  if(el){
    el.textContent += msg + "\n";
    el.scrollTop = el.scrollHeight;
  }
}
function setStatus(txt){
  const el = document.getElementById("status");
  if(el) el.textContent = "Status: " + txt;
}

function openCurrent(){
  const it = ITEMS[state.idx];
  if(it?.url) window.open(it.url, "_blank", "noopener,noreferrer");
}

function setIndex(jumbo, i){
  const n = ITEMS.length;
  state.idx = (i % n + n) % n;
  const it = ITEMS[state.idx];
  jumbo.setSource({ url: it.url, label: it.label });
  log(`[item] ${state.idx+1}/${n}: ${it.label}`);
  const sel = document.getElementById("preset");
  if(sel) sel.value = String(state.idx);
}

async function main(){
  setStatus("starting…");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a10);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Brighter lighting (so you can SEE)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303050, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 7, 3);
  scene.add(key);
  const fill = new THREE.PointLight(0xb0b8ff, 0.85, 20);
  fill.position.set(0, 2.2, 1.5);
  scene.add(fill);

  buildRoom(scene);

  const jumbo = new Jumbotron(scene, {
    position: new THREE.Vector3(0, 1.6, -2.2),
    rotationY: 0,
    width: 3.0,
    height: 1.7
  });

  // Desktop dev camera controls (fine to keep)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0);
  controls.update();

  // UI
  wireUI({
    items: ITEMS,
    onLoad: (idxStr) => setIndex(jumbo, parseInt(idxStr, 10) || 0),
    onOpen: () => openCurrent(),
    onToggleHud: () => {
      const hud = document.getElementById("hud");
      hud.style.display = hud.style.display === "none" ? "block" : "none";
    }
  });

  setIndex(jumbo, 0);

  // Quest laser system
  const laser = createLaserSystem({
    scene, renderer,
    targetMesh: jumbo.screen,
    onSelect: () => openCurrent()
  });

  // Optional: double click open on desktop
  window.addEventListener("dblclick", () => openCurrent());

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    jumbo.update();
    laser.update(); // keep reticle accurate
    renderer.render(scene, camera);
  });

  setStatus("ready ✅");
  log("[boot] ready");
}

main().catch(err => {
  console.error(err);
  setStatus("error ❌");
  log(`[error] ${err?.message || err}`);
});
