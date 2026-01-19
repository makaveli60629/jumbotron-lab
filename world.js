import * as THREE from 'three';

let videoElement, videoTexture, jumbotron, diagPanel;
let hlsInstance = null;

const channels = [
    "https://content.uplynk.com/channel/3324f2467c414329b3b0cc5cd987b6be.m3u8", // ABC
    "https://bloomberg.com/media-manifest/streams/us.m3u8", // Bloomberg
    "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master_2000.m3u8" // NASA
];
let currentIdx = 0;
let buttons = [];

export function createWorld(scene) {
    videoElement = document.getElementById('video-source');
    loadChannel(channels[currentIdx]);
    
    videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    // 1. CURVED MESH (Stadium Style)
    // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)
    const geo = new THREE.CylinderGeometry(12, 12, 7, 40, 1, true, Math.PI * 0.7, Math.PI * 0.6);
    const mat = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide });
    jumbotron = new THREE.Mesh(geo, mat);
    jumbotron.position.set(0, 4, -4);
    jumbotron.rotation.y = Math.PI; // Correct orientation to face player
    scene.add(jumbotron);

    // 2. TACTILE CONTROL BUTTONS
    const btnConfigs = [
        { name: 'PREV', pos: [-2, 0.5, -3], color: 0xff3333, act: () => cycle(-1) },
        { name: 'NEXT', pos: [2, 0.5, -3], color: 0x3333ff, act: () => cycle(1) },
        { name: 'MUTE', pos: [0, 0.5, -3], color: 0xffff33, act: () => videoElement.muted = !videoElement.muted },
        { name: 'DIAG', pos: [0, 1.2, -3], color: 0x00ff00, act: () => diagPanel.visible = !diagPanel.visible }
    ];

    btnConfigs.forEach(cfg => {
        const bGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1);
        const bMat = new THREE.MeshStandardMaterial({ color: cfg.color });
        const mesh = new THREE.Mesh(bGeo, bMat);
        mesh.position.set(...cfg.pos);
        mesh.userData = { action: cfg.act, lastTouch: 0 };
        scene.add(mesh);
        buttons.push(mesh);
    });

    // 3. DIAGNOSTICS PANEL (Android Monitoring)
    diagPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 })
    );
    diagPanel.position.set(-3, 2, -4);
    diagPanel.visible = false;
    scene.add(diagPanel);

    scene.add(new THREE.AmbientLight(0xffffff, 1));
}

function loadChannel(url) {
    if (hlsInstance) hlsInstance.destroy();
    if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(videoElement);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => videoElement.play());
    }
}

function cycle(dir) {
    currentIdx = (currentIdx + dir + channels.length) % channels.length;
    loadChannel(channels[currentIdx]);
}

export function updateWorld(hand1, hand2) {
    const now = Date.now();
    [hand1, hand2].forEach(hand => {
        if (hand.joints && hand.joints['index-finger-tip']) {
            const tip = hand.joints['index-finger-tip'];
            
            buttons.forEach(btn => {
                const dist = tip.position.distanceTo(btn.position);
                // Simple Debounced Touch detection (0.5s)
                if (dist < 0.12 && now - btn.userData.lastTouch > 500) {
                    btn.scale.set(0.8, 0.8, 0.8); // Visual feedback
                    btn.userData.action();
                    btn.userData.lastTouch = now;
                    setTimeout(() => btn.scale.set(1, 1, 1), 200);
                }
            });
        }
    });

    // Update Diag readout if visible
    if (diagPanel.visible) {
        // In a real system, we would update a texture here, 
        // for now, we log to console as you requested for Android checks.
        if (now % 100 === 0) console.log("System Status:", window.systemFPS, "fps");
    }
}
