import * as THREE from 'three';

let video, jumbotron, diagPanel;
const streamList = [
    "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8", // ABC
    "https://bloomberg.com/media-manifest/streams/us.m3u8", // Bloomberg
    "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master_2000.m3u8" // NASA
];
let current = 0;
let buttons = [];

export function createWorld(scene) {
    video = document.getElementById('video-source');
    setupHLS(streamList[current]);

    const texture = new THREE.VideoTexture(video);
    
    // Curved Jumbotron
    const geo = new THREE.CylinderGeometry(10, 10, 6, 32, 1, true, Math.PI * 0.7, Math.PI * 0.6);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    jumbotron = new THREE.Mesh(geo, mat);
    jumbotron.position.set(0, 3, -4);
    jumbotron.rotation.y = Math.PI;
    scene.add(jumbotron);

    // Floating Buttons (Prev, Next, Mute, Diag)
    const colors = [0xff0000, 0x0000ff, 0xffff00, 0x00ff00];
    for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: colors[i] }));
        b.position.set(-0.6 + (i * 0.4), 0.5, -2);
        b.userData = { id: i, lastHit: 0 };
        scene.add(b);
        buttons.push(b);
    }

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1));
}

function setupHLS(url) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
    }
}

export function updateWorld(h1, h2) {
    const now = Date.now();
    [h1, h2].forEach(hand => {
        if (hand.joints && hand.joints['index-finger-tip']) {
            const tip = hand.joints['index-finger-tip'].position;
            buttons.forEach(btn => {
                if (tip.distanceTo(btn.position) < 0.1 && now - btn.userData.lastHit > 500) {
                    btn.userData.lastHit = now;
                    handleInput(btn.userData.id);
                }
            });
        }
    });
}

function handleInput(id) {
    if (id === 0) { current = (current - 1 + streamList.length) % streamList.length; setupHLS(streamList[current]); }
    if (id === 1) { current = (current + 1) % streamList.length; setupHLS(streamList[current]); }
    if (id === 2) { video.muted = !video.muted; }
    if (id === 3) { console.log("Android FPS:", window.fps); }
}
