import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { buildRoom } from "./room.js";
import { Jumbotron } from "./jumbotron.js";
import { wireUI } from "./ui.js";

const state = {};

function log(msg){
  console.log(msg);
  const el = document.getElementById("log");
  if(el){
    el.textContent += msg + "\n";
    el.scrollTop = el.scrollHeight;
  }
}

function presetToUrl(p){
  if(p === "music") return "https://www.youtube.com/results?search_query=live+music";
  if(p === "sports") return "https://www.youtube.com/results?search_query=live+sports";
  return "https://www.youtube.com/results?search_query=live+news";
}

async function main(){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050507);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  scene.add(new THREE.HemisphereLight(0xffffff, 0x202030, 1.0));
  const d = new THREE.DirectionalLight(0xffffff, 0.6);
  d.position.set(3,6,2);
  scene.add(d);

  buildRoom(scene);

  const jumbo = new Jumbotron(scene, {
    position: new THREE.Vector3(0,1.6,-2.2),
    width: 2.8,
    height: 1.6
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0,1.4,0);
  controls.update();

  wireUI({
    onApply: p => jumbo.setSource({ url: presetToUrl(p), label: p.toUpperCase() }),
    onToggleHud: () => {
      const hud = document.getElementById("hud");
      hud.style.display = hud.style.display === "none" ? "block" : "none";
    }
  });

  jumbo.setSource({ url: presetToUrl("news"), label: "NEWS" });

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

  log("[boot] ready");
}

main();
