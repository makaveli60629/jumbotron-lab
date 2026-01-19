import * as THREE from 'three';

let video, jumbotron, texture;
const streamList = [
    "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8", // ABC
    "https://bloomberg.com/media-manifest/streams/us.m3u8"
];
let current = 0;
let buttons = [];

export function createWorld(scene) {
    video = document.getElementById('video-source');
    setupHLS(streamList[current]);

    // Video Texture Optimization
    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;

    // 1. CURVED MESH - Moved further back (z: -8) so you have room
    const geo = new THREE.CylinderGeometry(15, 15, 8, 48, 1, true, Math.PI * 0.7, Math.PI * 0.6);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    jumbotron = new THREE.Mesh(geo, mat);
    jumbotron.position.set(0, 4, -8); 
    jumbotron.rotation.y = Math.PI;
    scene.add(jumbotron);

    // 2. CONTROL BUTTONS - Floating right in front of your hands
    const buttonColors = [0xff0000, 0x0000ff, 0xffff00, 0x00ff00]; // Prev, Next, Audio, Diag
    for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.1), 
            new THREE.MeshStandardMaterial({ color: buttonColors[i] })
        );
        b.position.set(-0.6 + (i * 0.4), 1.2, -1.5); // Placed at hand height
        b.userData = { id: i, lastHit: 0 };
        scene.add(b);
        buttons.push(b);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
}

function setupHLS(url) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.log("Waiting for user touch to play"));
        });
    }
}

export function updateWorld(h1, h2) {
    const now = Date.now();
    
    // Ensure texture updates every frame to prevent freezing
    if (texture) texture.needsUpdate = true;

    [h1, h2].forEach(hand => {
        if (hand.joints && hand.joints['index-finger-tip']) {
            const tip = hand.joints['index-finger-tip'].position;
            
            // Check for button pokes
            buttons.forEach(btn => {
                if (tip.distanceTo(btn.position) < 0.15 && now - btn.userData.lastHit > 1000) {
                    btn.userData.lastHit = now;
                    handleInput(btn.userData.id);
                    
                    // Visual feedback: shrink button when pressed
                    btn.scale.set(0.5, 0.5, 0.5);
                    setTimeout(() => btn.scale.set(1, 1, 1), 200);
                }
            });

            // "Poking" the air near the big screen also tries to force-start audio
            if (tip.distanceTo(jumbotron.position) < 3) {
                if (video.paused || video.muted) {
                    video.play();
                    video.muted = false;
                }
            }
        }
    });
}

function handleInput(id) {
    if (id === 0) { // PREV
        current = (current - 1 + streamList.length) % streamList.length;
        setupHLS(streamList[current]);
    }
    if (id === 1) { // NEXT
        current = (current + 1) % streamList.length;
        setupHLS(streamList[current]);
    }
    if (id === 2) { // MUTE/UNMUTE
        video.muted = !video.muted;
        video.play(); 
    }
    if (id === 3) { // DIAGNOSTICS
        console.log("Status: ", video.readyState, " FPS: ", window.fps);
    }
}
