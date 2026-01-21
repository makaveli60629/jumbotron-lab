function makeDeck(){
  const suits = ["♠","♥","♦","♣"];
  const ranks = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push({ r, s });
  for (let i=deck.length-1;i>0;i--){
    const j = (Math.random()*(i+1))|0;
    [deck[i],deck[j]] = [deck[j],deck[i]];
  }
  return deck;
}

function cardCanvas(card, faceUp=true){
  const c = document.createElement("canvas");
  c.width = 256; c.height = 356;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0,0,c.width,c.height);
  g.strokeStyle = "#111"; g.lineWidth = 10;
  g.strokeRect(5,5,c.width-10,c.height-10);

  if (!faceUp){
    g.fillStyle = "#0a1220"; g.fillRect(20,20,c.width-40,c.height-40);
    g.strokeStyle = "#00ffff"; g.lineWidth = 6;
    g.strokeRect(26,26,c.width-52,c.height-52);
  } else {
    const isRed = (card.s === "♥" || card.s === "♦");
    g.fillStyle = isRed ? "#c51414" : "#111";
    g.font = "bold 72px monospace";
    g.textAlign = "left"; g.textBaseline = "top";
    g.fillText(card.r, 24, 18);
    g.font = "bold 64px monospace";
    g.fillText(card.s, 24, 96);

    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 120px monospace";
    g.fillText(card.s, c.width/2, c.height/2 + 10);

    g.textAlign = "right"; g.textBaseline = "bottom";
    g.font = "bold 72px monospace";
    g.fillText(card.r, c.width-24, c.height-18);
  }
  return c;
}

function makeCardMesh(card, faceUp=true){
  const tex = new THREE.CanvasTexture(cardCanvas(card, faceUp));
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.0 });
  const geo = new THREE.PlaneGeometry(0.18, 0.26);
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

function makeSeatedBot(color=0x55aaff){
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, transparent:false, opacity:1, depthWrite:true });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0, transparent:false, opacity:1, depthWrite:true });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.28, 6, 12), bodyMat);
  torso.position.set(0, 0.42, 0);
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), headMat);
  head.position.set(0, 0.70, 0.03);
  g.add(head);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.28), bodyMat);
  legs.position.set(0, 0.20, 0.10);
  g.add(legs);

  return g;
}

export async function init(ctx){
  const { scene, player, log } = ctx;
  const THREE = ctx.THREE;

  const root = new THREE.Group();
  root.name = "poker_table_sim_root";
  scene.add(root);

  const center = new THREE.Vector3(0, 0.95, 0);
  const radius = 2.75;
  const seatAngles = [0, 60, 120, 180, 240, 300].map(a => THREE.MathUtils.degToRad(a));

  const chairMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.05, depthWrite:true });
  function addChair(pos, yaw){
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), chairMat);
    seat.position.set(0, 0.48, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.06), chairMat);
    back.position.set(0, 0.72, -0.18);
    chair.add(seat, back);
    chair.position.copy(pos);
    chair.rotation.y = yaw;
    root.add(chair);
  }

  const bots = [];
  const cardGroups = [];
  let hands = [];

  for (let i=0;i<seatAngles.length;i++){
    const a = seatAngles[i];
    const x = center.x + Math.sin(a) * radius;
    const z = center.z + Math.cos(a) * radius;
    const pos = new THREE.Vector3(x, 0, z);
    const yaw = Math.atan2(center.x - x, center.z - z);

    addChair(pos, yaw);

    const bot = makeSeatedBot([0x55aaff,0xffcc55,0x66ff99,0xff6699,0x9f7bff,0x66ffff][i%6]);
    bot.position.set(pos.x, 0, pos.z);
    bot.rotation.y = yaw;
    root.add(bot);
    bots.push(bot);

    const cg = new THREE.Group();
    cg.position.set(pos.x, 1.05, pos.z);
    root.add(cg);
    cardGroups.push(cg);
  }

  function clearCards(){
    for (const cg of cardGroups){
      while (cg.children.length){
        const m = cg.children.pop();
        m.geometry?.dispose?.();
        if (m.material?.map) m.material.map.dispose?.();
        m.material?.dispose?.();
      }
    }
  }

  function deal(){
    const deck = makeDeck();
    hands = bots.map(() => [deck.pop(), deck.pop()]);
    clearCards();
    for (let i=0;i<hands.length;i++){
      const [c1,c2] = hands[i];
      const cg = cardGroups[i];
      const m1 = makeCardMesh(c1, true);
      const m2 = makeCardMesh(c2, true);
      m1.position.set(-0.11, 0, 0);
      m2.position.set( 0.11, 0, 0);
      cg.add(m1, m2);
    }
    log?.("PokerSim: dealt 2 cards to 6 seated players (debug face-up).");
  }

  deal();

  function onKey(e){ if (e.code === "KeyR") deal(); }
  window.addEventListener("keydown", onKey);

  const tmp = new THREE.Vector3();
  function update(){
    player.getWorldPosition(tmp);
    for (const cg of cardGroups){
      cg.lookAt(tmp.x, cg.position.y, tmp.z);
    }
  }

  return {
    update: (dt,t) => update(),
    dispose: () => {
      window.removeEventListener("keydown", onKey);
      clearCards();
      scene.remove(root);
    }
  };
}
