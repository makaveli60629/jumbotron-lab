import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { buildRoom } from "./room.js";
import { Jumbotron } from "./jumbotron.js";
import { wireUI } from "./ui.js";
import { installLaserSelect } from "./xr_laser.js";

/**
 * PLAYLIST_ITEMS
 * - Replace these URLs with YOUR playlist items anytime.
 * - You can use: channel links, playlist links, live links, or search URLs.
 */
const PLAYLIST_ITEMS = [
  { label: "ABC News Live", url: "https://www.youtube.com/@ABCNews/live" },
  { label: "CBS News Live", url: "https://www.youtube.com/@CBSNews/live" },
  { label: "Chicago News (Live Search)", url: "https://www.youtube.com/results?search_query=chicago+news+live" },
  { label: "NFL / Football (Live Search)", url: "https://www.youtube.com/results?search_query=nfl+live" },
  { label: "Weather Live", url: "https://www.youtube.com/results?search_query=weather+live+radar" },
  { label: "Music Live", url: "https://www.youtube.com/results?search_query=live+music" }
];

const state = {
  idx: 0
};

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

function clampIndex(i){
  const n = PLAYLIST_ITEMS.length;
  return (i % n + n) % n;
}

function applyIndex(jumbo, i){
  state.idx = clampIndex(i);
  const item = PLAYLIST_ITEMS[state.idx];
  jumbo.setSource({ url: item.url, label: item.label });
  // sync UI select if present
  const sel = document.getElementById("preset");
  if(sel) sel.value = String(state.idx);
  log(`[item] ${state.idx+1}/${PLAYLIST_ITEMS.length}: ${item.label}`);
}

async function main(){
  setStatus("starting…");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f); // slightly brighter than black

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Brighter lighting so you can SEE the room and screen
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303050, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 7, 3);
  scene.add(key);
  const fill = new THREE.PointLight(0xb0b8ff, 0.8, 20);
  fill.position.set(0, 2.2, 1.5);
  scene.add(fill);

  buildRoom(scene);

  const jumbo = new Jumbotron(scene, {
    position: new THREE.Vector3(0, 1.6, -2.2),
    rotationY: 0,
    width: 3.0,
    height: 1.7
  });

  // Desktop dev controls (harmless on VR)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0);
  controls.update();

  // UI
  wireUI({
    items: PLAYLIST_ITEMS,
    onPrev: () => applyIndex(jumbo, state.idx - 1),
    onNext: () => applyIndex(jumbo, state.idx + 1),
    onPick: (indexStr) => applyIndex(jumbo, parseInt(indexStr, 10) || 0),
    onOpen: () => {
      const item = PLAYLIST_ITEMS[state.idx];
      window.open(item.url, "_blank", "noopener,noreferrer");
    },
    onToggleHud: () => {
      const hud = document.getElementById("hud");
      hud.style.display = hud.style.display === "none" ? "block" : "none";
    }
  });

  // Default item
  applyIndex(jumbo, 0);

  // Double tap/click fallback (mobile + desktop)
  window.addEventListener("dblclick", () => {
    const item = PLAYLIST_ITEMS[state.idx];
    if(item?.url) window.open(item.url, "_blank", "noopener,noreferrer");
  });
  window.addEventListener("touchend", (e) => {
    if(e.target && e.target.closest && e.target.closest("#hud")) return;
    // do nothing; "Open" button is primary on mobile
  }, { passive:true });

  // XR laser select: point at screen + trigger
  installLaserSelect({ scene, camera, renderer, targetMesh: jumbo.screen, onSelect: () => {
    const item = PLAYLIST_ITEMS[state.idx];
    if(item?.url) window.open(item.url, "_blank", "noopener,noreferrer");
  }});

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    controls.update();
    jumbo.update();
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
