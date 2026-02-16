
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Premium Configuration ---
const CONFIG = {
    width: 14,
    height: 20,
    thickness: 0.04, // Quality paper thickness
    segments: 50,    // Smooth bending
    pageCount: 8,
    curveStrength: 2.5
};

let scene, camera, renderer, controls, bookGroup;
const pages = [];
let clock = new THREE.Clock();

// Mouse Tracking
let mouse = new THREE.Vector2();
let targetRotation = new THREE.Vector2();
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

function init() {
    const container = document.getElementById('hero-canvas-container');
    if (!container) return;

    // 1. Renderer - High Quality Settings
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // renderer.toneMappingExposure = 1.0;

    // Clear existing
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Scene
    scene = new THREE.Scene();

    // 3. Camera (Cinematic Angle)
    camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 35, 30); // High angle
    camera.lookAt(0, 0, 0);

    // 4. Controls (Optional - primarily mouse driven)
    // We disable full orbit controls to keep the "curated view" but maybe allow slight damping?
    // Let's rely on our custom mouse movement for the hero effect.
    // controls = new OrbitControls(camera, renderer.domElement);

    // 5. Lighting (Bright Studio)
    setupLighting();

    // 6. Build Book
    createBook();

    // 7. Events
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);

    // Start Auto-Open Sequence
    startIntroAnimation();

    // Start Loop
    animate();
}

function onMouseMove(event) {
    mouse.x = (event.clientX - windowHalfX);
    mouse.y = (event.clientY - windowHalfY);
}

function setupLighting() {
    // 1. Hemisphere (Sky/Ground)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // 2. Main Directional Light (Sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    // 3. Ambient (Fill)
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // 4. Spot for Rim/Highlight
    const spotLight = new THREE.SpotLight(0x3366ff, 2.0);
    spotLight.position.set(-20, 20, -10);
    spotLight.lookAt(0, 0, 0);
    spotLight.penumbra = 0.5;
    scene.add(spotLight);
}

function createBook() {
    bookGroup = new THREE.Group();
    scene.add(bookGroup);

    const textureLoader = new THREE.TextureLoader();

    // Paper Edge Material
    const matEdge = new THREE.MeshStandardMaterial({
        color: 0xfdfbf7,
        roughness: 0.9,
        side: THREE.FrontSide
    });

    // Spine Material (Dark Grey/Black)
    const matSpine = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.6,
        metalness: 0.1
    });

    // Geometry
    const geometry = new THREE.BoxGeometry(CONFIG.width, CONFIG.thickness, CONFIG.height, CONFIG.segments, 1, 1);
    geometry.translate(CONFIG.width / 2, 0, 0); // Pivot at spine edge (0,0,0)

    // Tighten spacing
    const spacing = CONFIG.thickness + 0.0005;

    for (let i = 0; i < CONFIG.pageCount; i++) {
        const group = new THREE.Group();
        group.position.set(0, 0, 0);

        // Textures
        // Use local assets or fallback
        // Cover is index 0 (Top physical layer in closed stack)
        let matFront, matBack;

        if (i === 0) {
            // Front Cover
            const coverTex = textureLoader.load('assets/templates/wedding-3d.png', undefined, undefined, () => {
                return textureLoader.load('https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?q=80&w=600&auto=format&fit=crop');
            });
            coverTex.colorSpace = THREE.SRGBColorSpace;
            coverTex.center.set(0.5, 0.5);

            matFront = new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.2, metalness: 0.0 });
            matBack = matSpine; // Inside cover usually plain
        } else {
            // Inner Pages
            const imgIndex = 110 + i * 2;
            const urlFront = `https://picsum.photos/id/${imgIndex}/600/900`;
            const urlBack = `https://picsum.photos/id/${imgIndex}/600/900`; // Simplify

            const loadPageMat = (url) => {
                const tex = textureLoader.load(url);
                tex.colorSpace = THREE.SRGBColorSpace;
                return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
            };

            matFront = loadPageMat(urlFront);
            matBack = loadPageMat(urlBack);
        }

        // Apply materials
        // Order: Right, Left, Top, Bottom, Front, Back
        // But BoxGeometry uses: +x, -x, +y, -y, +z, -z
        // +x is Right Edge (Page Edge)
        // -x is Left Edge (Spine)
        // +y is Top Face (Front Content)
        // -y is Bottom Face (Back Content)
        // +z, -z are Top/Bottom Edges of book vertical

        // Actually BoxGeometry default UVs mapping:
        // 0: +x (Right) -> Edge
        // 1: -x (Left) -> Spine
        // 2: +y (Top) -> Front Content
        // 3: -y (Bottom) -> Back Content
        // 4: +z (Front Edge) -> Edge
        // 5: -z (Back Edge) -> Edge

        const materials = [
            matEdge,  // Right
            matSpine, // Left (Spine)
            matFront, // Top Face (Front)
            matBack,  // Bottom Face (Back)
            matEdge,  // Front Edge
            matEdge   // Back Edge
        ];

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // MESH OFFSET LOGIC
        // Page i: Offset = (N-1-i)*spacing
        // Page 0 (Top) -> High Offset (+Y)
        // Page N (Bottom) -> Low Offset (0)
        const initialOffset = (CONFIG.pageCount - 1 - i) * spacing;
        mesh.position.y = initialOffset; // Start closed

        enableBending(mesh);

        group.add(mesh);
        bookGroup.add(group);

        pages.push({
            group: group,
            mesh: mesh,
            index: i,
            initialY: initialOffset
        });
    }

    // Apply initial stacking logic
    updateZIndices();

    // Initial Position - Center it
    bookGroup.position.x = 0;
    bookGroup.rotation.x = -0.3;

    // FORCE OPEN STATE IMMEDIATELY
    const cover = pages[0];
    if (cover) {
        cover.group.rotation.z = -Math.PI / 1.05; // Fully Open
        // Adjust bend for open state
        if (cover.mesh.userData.uniforms) {
            cover.mesh.userData.uniforms.uBend.value = 0.15; // Slight relaxed bend
        }
        updateZIndices();
    }
}

// --- Improved Bending Shader ---
function enableBending(mesh) {
    mesh.userData.uniforms = {
        uBend: { value: 0.0 },
        uDir: { value: 1.0 }
    };

    const onBeforeCompile = (shader) => {
        shader.uniforms.uBend = mesh.userData.uniforms.uBend;
        shader.uniforms.uDir = mesh.userData.uniforms.uDir;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `
            #include <common>
            uniform float uBend;
            uniform float uDir;
            `
        );

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            
            float xPos = position.x;
            float width = ${CONFIG.width.toFixed(1)}; 
            float xNorm = clamp(xPos / width, 0.0, 1.0);
            
            // Dynamic Curl
            float bendAmount = uBend * 1.5; 
            float curl = -bendAmount * pow(xNorm, 2.0) * uDir;
            
            // Static Spine Curve
            float spineCurl = -0.05 * pow(1.0 - xNorm, 3.0) * uDir;
            
            transformed.y += curl + spineCurl;
            `
        );
    };

    mesh.material.forEach(m => {
        m.onBeforeCompile = onBeforeCompile;
    });

    const depthMat = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking
    });
    depthMat.onBeforeCompile = onBeforeCompile;
    mesh.customDepthMaterial = depthMat;
}

// --- Global Stacking Enforcer ---
function updateZIndices() {
    pages.forEach(p => {
        // Simple logic for single spread opening
        // We assume index 0 is cover, it flips.
        // Others stay or slightly lift.

        let zIndex = CONFIG.pageCount - p.index;

        // If cover is flipped open (rotation > 90 deg approx -1.57)
        if (p.group.rotation.z < -1.5) {
            // It's on the left stack effectively
            zIndex = p.index + 1;
        }

        p.mesh.renderOrder = zIndex;

        if (p.mesh.material[0].polygonOffset) {
            p.mesh.material.forEach(m => m.polygonOffsetFactor = -zIndex);
        }
    });
}

function startIntroAnimation() {
    if (!window.gsap) return;

    // Open Cover
    const cover = pages[0];
    if (cover) {
        // Rotate Group
        gsap.to(cover.group.rotation, {
            z: -Math.PI / 1.1, // Open almost flat
            duration: 2.5,
            ease: "power2.inOut",
            delay: 0.5,
            onUpdate: () => {
                // Update bending based on rotation
                const progress = Math.abs(cover.group.rotation.z / (-Math.PI / 1.1));
                // Peak bend at 50%
                const bend = Math.sin(progress * Math.PI) * 0.4;
                if (cover.mesh.userData.uniforms) {
                    cover.mesh.userData.uniforms.uBend.value = bend;

                    // Logic to flip bend direction if passed 90 degrees?
                    // Shader handles uDir.
                }
                updateZIndices();
            }
        });
    }
}

function onWindowResize() {
    const container = document.getElementById('hero-canvas-container');
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    // 1. Floating Animation
    bookGroup.position.y = Math.sin(time * 0.5) * 0.2;

    // 2. Mouse Interaction
    const targetX = mouse.y * 0.0005;
    const targetY = mouse.x * 0.0005;

    targetRotation.x += (targetX - targetRotation.x) * 0.05;
    targetRotation.y += (targetY - targetRotation.y) * 0.05;

    // 3. Continuous Rotation (Show all sides)
    const autoRotation = time * 0.2;

    // Apply rotation
    bookGroup.rotation.x = -0.4 + targetRotation.x; // Allow tilt up/down
    bookGroup.rotation.y = autoRotation + (targetRotation.y * 2.5); // Spin + Mouse Pan

    renderer.render(scene, camera);
}

// Export init to window
window.init3DBook = init;
export { init as init3DBook };
