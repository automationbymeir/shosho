import * as THREE from 'three';

// Configuration
const CONFIG = {
    bookWidth: 5,         // Adjusted for better proportions
    bookHeight: 6,
    spineWidth: 0.8,      // Thicker spine for containing pages
    coverThickness: 0.1,  // Visible hardcover
    pageCount: 16,        // Improved density
    scatterRadius: 20,    // Wide scattering
    cycleDuration: 14.0   // Loop duration
};

// Reliable High-Res Unsplash Photos (Fixed IDs)
const PHOTO_URLS = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1552058544-f2b08499653d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1554151228-14d9def656ec?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
];

let scene, camera, renderer;
let bookGroup;
const parts = [];
let clock = new THREE.Clock();
let mouse = new THREE.Vector2();

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

export function initPhotosAssembling() {
    const container = document.getElementById('hero-canvas-container');
    if (!container) return;

    // 1. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Scene
    scene = new THREE.Scene();

    // 3. Camera (Angled Product Shot)
    camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
    // Positioned High and Centered to look down at the "Table"
    camera.position.set(0, 15, 12);
    camera.lookAt(0, 0, 0);

    // 4. Lights
    setupLighting();

    // 5. Build Book
    createBookComponents();

    // 6. Events
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);

    // 7. Loop
    animate();
}

function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    // Light coming from top-left for dramatic shadows
    dirLight.position.set(-8, 15, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xeef2ff, 0.5);
    fillLight.position.set(5, 5, 5);
    scene.add(fillLight);
}

function createBookComponents() {
    bookGroup = new THREE.Group();
    scene.add(bookGroup);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    // -- Dimensions --
    const bw = CONFIG.bookWidth;
    const bh = CONFIG.bookHeight;
    const coverThick = CONFIG.coverThickness;
    const spineW = CONFIG.spineWidth;

    // Pages fill the space between covers
    const availableSpace = spineW - (coverThick * 2);
    const pThick = availableSpace / CONFIG.pageCount;

    // Page Geometry (Slightly smaller than cover)
    const pageW = bw - 0.2;
    const pageH = bh - 0.2;
    const geomPage = new THREE.BoxGeometry(pageW, pThick, pageH);

    // Shared Page Material Base
    const matPageEdge = new THREE.MeshStandardMaterial({ color: 0xfdfbf7, roughness: 0.9 });

    // Stacking variables
    let currentY = (-spineW / 2) + coverThick;

    for (let i = 0; i < CONFIG.pageCount; i++) {
        const url = PHOTO_URLS[i % PHOTO_URLS.length];
        const tex = textureLoader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;

        // Correct orientation: Standard Plane Mapping
        tex.center.set(0.5, 0.5);
        tex.rotation = 0;

        const matPageFace = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.3
        });

        // BoxGeometry materials: +x, -x, +y, -y, +z, -z
        const matArray = [
            matPageEdge, // Right
            matPageEdge, // Left
            matPageFace, // Top (Photo)
            matPageEdge, // Bottom
            matPageEdge, // Front
            matPageEdge  // Back
        ];

        const mesh = new THREE.Mesh(geomPage, matArray);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Position: Center in X/Z, Stacked in Y
        const targetPos = new THREE.Vector3(0, currentY + (pThick / 2), 0);

        // Target Rot: 0,0,0
        const targetRot = new THREE.Euler(0, 0, 0);

        setupPart(mesh, {
            targetPos: targetPos,
            targetRot: targetRot,
            delay: i * 0.1 // Stagger
        });

        bookGroup.add(mesh);
        parts.push(mesh);

        currentY += pThick;
    }

    // -- Cover Material --
    const matCover = new THREE.MeshStandardMaterial({
        color: 0x0f0f13, // Almost Black to match sleek space/liquid abstract theme
        roughness: 0.3,
        metalness: 0.2
    });

    // -- Back Cover --
    const geomCoverFlat = new THREE.BoxGeometry(bw, coverThick, bh);

    const backCover = new THREE.Mesh(geomCoverFlat, matCover);
    backCover.castShadow = true;
    backCover.receiveShadow = true;

    setupPart(backCover, {
        targetPos: new THREE.Vector3(0, -spineW / 2 + coverThick / 2, 0),
        targetRot: new THREE.Euler(0, 0, 0),
        delay: 0
    });
    bookGroup.add(backCover);
    parts.push(backCover);

    // -- Front Cover --
    // Logo and Background for Cover
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = 1024;
    frontCanvas.height = 1024;
    const ctx = frontCanvas.getContext('2d');

    // Load Cover Background Image (Unique Cinematic Abstract)
    const coverBgImg = new Image();
    coverBgImg.crossOrigin = 'anonymous';
    coverBgImg.src = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1024&q=80';

    // Load SVG Icon (Favicon with no backgorund)
    const iconImg = new Image();
    iconImg.src = '/logo-nobg.svg';

    const texFront = new THREE.CanvasTexture(frontCanvas);
    texFront.colorSpace = THREE.SRGBColorSpace;

    // Draw Function
    const drawCover = () => {
        const width = frontCanvas.width;
        const height = frontCanvas.height;

        // 1. Draw Background
        if (coverBgImg.complete && coverBgImg.naturalWidth !== 0) {
            ctx.drawImage(coverBgImg, 0, 0, width, height);
            // Dark Overlay for contrast
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, width, height);
        } else {
            // Fallback Dark Base
            ctx.fillStyle = '#0f0f13';
            ctx.fillRect(0, 0, width, height);
        }

        // 2. Draw Logo + Text (SHOSHO)
        const text = 'SHOSHO';
        // Reduced font size from 180px to 140px as requested
        ctx.font = '900 140px Inter, sans-serif';
        const textW = ctx.measureText(text).width;

        // Icon dimensions
        const iconSize = 160; // Slightly larger for better visibility
        const spacing = 40;
        const totalW = iconSize + spacing + textW;

        // Start X to center everything
        const startX = (width - totalW) / 2;
        const centerY = height / 2;

        // -- Draw Icon (Left) --
        if (iconImg.complete && iconImg.naturalWidth !== 0) {
            // Use shadow for icon too
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 20;
            ctx.drawImage(iconImg, startX, centerY - iconSize / 2, iconSize, iconSize);
            ctx.shadowBlur = 0;
        }

        // -- Draw Text (Right) --
        ctx.fillStyle = 'rgba(255,255,255,1.0)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Shadow for text readability
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;

        ctx.fillText(text, startX + iconSize + spacing, centerY);
        ctx.shadowBlur = 0;

        texFront.needsUpdate = true;
    };

    // Initial Draw (Blue Fallback)
    drawCover();

    // Update when images load
    coverBgImg.onload = drawCover;
    iconImg.onload = drawCover;

    const matFrontFace = new THREE.MeshStandardMaterial({ map: texFront, roughness: 0.4 });
    const matFrontArray = [
        matCover, matCover,
        matFrontFace, // Top Face Y+
        matCover, matCover, matCover
    ];

    const frontCover = new THREE.Mesh(geomCoverFlat, matFrontArray);
    frontCover.castShadow = true;
    frontCover.receiveShadow = true;

    setupPart(frontCover, {
        targetPos: new THREE.Vector3(0, spineW / 2 - coverThick / 2, 0),
        targetRot: new THREE.Euler(0, 0, 0),
        delay: CONFIG.pageCount * 0.1 + 0.5 // Last to arrive
    });
    bookGroup.add(frontCover);
    parts.push(frontCover);

    // -- Spine --
    const geomSpine = new THREE.BoxGeometry(coverThick, spineW, bh);
    const spine = new THREE.Mesh(geomSpine, matCover);
    spine.castShadow = true;

    // Position: Left side (X = -bw/2). Y = 0 (Center of stack).
    setupPart(spine, {
        targetPos: new THREE.Vector3(-bw / 2 - coverThick / 2, 0, 0),
        targetRot: new THREE.Euler(0, 0, 0),
        delay: CONFIG.pageCount * 0.1 + 0.8
    });
    bookGroup.add(spine);
    parts.push(spine);
}

function setupPart(mesh, config) {
    // Start high up and scattered
    const range = CONFIG.scatterRadius;
    const startPos = new THREE.Vector3(
        (Math.random() - 0.5) * range,
        Math.random() * 10 + 10, // High up Y (10 to 20)
        (Math.random() - 0.5) * range
    );

    // Random Start Rotation
    const startRot = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
    );

    mesh.userData = {
        startPos: startPos,
        startRot: startRot,
        targetPos: config.targetPos,
        targetRot: config.targetRot,
        delay: config.delay
    };

    // Initialize at start
    mesh.position.copy(startPos);
    mesh.rotation.copy(startRot);
    // Initial Scale for animation
    mesh.scale.set(0.1, 0.1, 0.1);
}

function onWindowResize() {
    if (!renderer || !camera) return;
    const container = document.getElementById('hero-canvas-container');
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function onMouseMove(event) {
    mouse.x = (event.clientX - windowHalfX) * 0.0005;
    mouse.y = (event.clientY - windowHalfY) * 0.0005;
}

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    const t = time % CONFIG.cycleDuration;

    // Timeline logic
    // 0 -> 8: Assemble
    // 8 -> 12: Hold (Product Shot)
    // 12 -> 14: Disperse

    let phase = 'assemble';
    if (t > 8 && t <= 12) phase = 'hold';
    else if (t > 12) phase = 'disperse';

    // 1. Animate Parts
    parts.forEach(p => {
        const u = p.userData;

        let progress = 0;

        if (phase === 'assemble' || phase === 'hold') {
            // Calculate progress for arrival
            const flightDuration = 1.5;
            progress = (t - u.delay) / flightDuration;
            progress = Math.max(0, Math.min(1, progress));

            // Ease Out Cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            p.position.lerpVectors(u.startPos, u.targetPos, ease);

            // Rotation Lerp 
            p.rotation.x = THREE.MathUtils.lerp(u.startRot.x, u.targetRot.x, ease);
            p.rotation.y = THREE.MathUtils.lerp(u.startRot.y, u.targetRot.y, ease);
            p.rotation.z = THREE.MathUtils.lerp(u.startRot.z, u.targetRot.z, ease);

            // Scale Animation: Grow from 0.1 to 1.0
            const scale = THREE.MathUtils.lerp(0.1, 1.0, ease);
            p.scale.setScalar(scale);
        }
        else if (phase === 'disperse') {
            // Fly away logic
            const disperseTime = t - 12;
            const disperseDuration = 2.0;

            progress = disperseTime / disperseDuration;
            progress = Math.max(0, Math.min(1, progress));

            // Ease In Cubic (Accelerate away)
            const ease = progress * progress * progress;

            // Move UP and BACK to start
            const exitPos = new THREE.Vector3(u.startPos.x, u.startPos.y + 5, u.startPos.z);

            p.position.lerpVectors(u.targetPos, exitPos, ease);
            p.rotation.x = THREE.MathUtils.lerp(u.targetRot.x, u.startRot.x, ease);
            p.rotation.y = THREE.MathUtils.lerp(u.targetRot.y, u.startRot.y, ease);
            p.rotation.z = THREE.MathUtils.lerp(u.targetRot.z, u.startRot.z, ease);

            // Keep Scale at 1.0 during disperse
            p.scale.setScalar(1.0);
        }
    });

    // 2. Animate Whole Book (Camera Interaction)
    if (bookGroup) {
        // Floating motion
        const floatY = Math.sin(time * 0.5) * 0.2;
        bookGroup.position.y = floatY;

        // User interaction - subtle tilt
        const mouseTiltX = mouse.y * 0.5;
        const mouseTiltY = mouse.x * 0.5;

        // Base Rotation: 
        // 0 degrees = Parallel to Screen Bottom
        const baseRotY = 0;
        const baseRotX = 0.2; // Keep slight tilt to see cover face

        // Smoothly interpolate rotation
        const currentRotX = bookGroup.rotation.x;
        const currentRotY = bookGroup.rotation.y;

        bookGroup.rotation.x += ((baseRotX + mouseTiltX) - currentRotX) * 0.05;
        bookGroup.rotation.y += ((baseRotY + mouseTiltY) - currentRotY) * 0.05;
    }

    renderer.render(scene, camera);
}
