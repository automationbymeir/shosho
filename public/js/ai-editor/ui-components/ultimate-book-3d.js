
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

// html2canvas is global from script tag
const html2canvas = window.html2canvas;

export class UltimateBook3D {
    constructor(container, renderPageCallback) {
        this.container = container;
        this.renderPageCallback = renderPageCallback; // Function(page, container)

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pages = [];
        this.bookGroup = null;
        this.isAnimating = false;
        this.requestId = null;

        // Config Defaults (Will be updated based on Album Aspect Ratio)
        this.config = {
            pageCount: 0,
            width: 3.5,
            height: 5.0,
            thickness: 0.03, // Visual thickness per page
            spacing: 0.031,   // Z-spacing (Stacking height)
            curveStrength: 2.5,
            duration: 1.2
        };

        // Material Cache
        this.textureLoader = new THREE.TextureLoader();
        this.matEdge = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 });
    }

    /**
     * Initialize the 3D Scene
     * @param {Array} pages - Array of page state objects
     * @param {Object} cover - Cover state object
     * @param {Object} templateConfig - Project config
     */
    async init(pages, cover, templateConfig) {
        this.dispose(); // Cleanup previous scene

        // 1. SETUP DIMENSIONS
        // Determine Aspect Ratio from Template
        this.editorW = templateConfig?.pageSize?.width || 1200;
        this.editorH = templateConfig?.pageSize?.height || 800; // Default to Landscape for common photobooks
        const aspectRatio = this.editorW / this.editorH;

        // Map dimensions to ThreeJS Units (Base Height = 5.0)
        this.config.height = 5.0;
        this.config.width = this.config.height * aspectRatio;

        // Adjust for "Big" view - no change needed to config, just camera

        // ... (Existing Page Mapping Logic - maintained as it is correct for spreads) ...

        // Cover Sheet
        // Note: Cover usually has different dims? We assume same for now or fits box.
        // We will assume pages array implies spreads if they are paired? 
        // Logic: 
        // Sheet 0: Front=Cover. Back=InsideCover (Blank/Gray?)
        // The previous logic put "Page 1" on Inner Cover (Sheet 0 Back)??
        // Wait, line 91 said: "back: { type: 'page', data: pages[0] }"
        // Is Page 0 the first content page? Yes.
        // If Page 0 is the first page, it is usually on the RIGHT side (Recto).
        // Sheet 0 (Cover) -> Flip -> Left is Inner Cover. Right is Sheet 1 Front.
        // So Sheet 0 Back should be Inner Cover.
        // Sheet 1 Front should be Page 0.
        // CORRECTED MAPPING FOR "SEPARATE" FEEL:

        this.bookSheets = [];

        // 1. Cover Sheet
        const coverSheet = {
            isCover: true,
            frontData: { type: 'cover', part: 'front', data: cover },
            backData: { type: 'cover', part: 'inner', data: cover }
        };

        const contentSheets = [];
        // Shoso Pages: [Page1, Page2, Page3, Page4...]
        // Spread 1: Page 1 (Right). (Left is Inner Cover)
        // Spread 2: Page 2 (Left), Page 3 (Right).
        // Spread 3: Page 4 (Left), Page 5 (Right).

        // Sheet 1: Front=Page 1. Back=Page 2.
        // Sheet 2: Front=Page 3. Back=Page 4.

        for (let i = 0; i < pages.length; i += 2) {
            const rightPage = pages[i];      // Page 1, 3...
            const leftPage = pages[i + 1];   // Page 2, 4... (Back of sheet)

            contentSheets.push({
                frontData: { type: 'page', data: rightPage, index: i },
                backData: { type: 'page', data: leftPage, index: i + 1 }
            });
        }

        // Back Cover
        const backCoverSheet = {
            isCover: true,
            frontData: { type: 'cover', part: 'inner-back', data: cover },
            backData: { type: 'cover', part: 'back', data: cover }
        };

        this.dataSheets = [coverSheet, ...contentSheets, backCoverSheet];
        this.config.pageCount = this.dataSheets.length;

        // 2. SETUP SCENE
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        // MOVED CLOSER for "BIGGER" feel
        this.camera.position.set(0, 5, 10); // Optimal framing
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 2;

        // Lights (Brightened & Adjusted)
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);

        // 3. BUILD BOOK
        await this.buildBookGeometry();

        // CENTER THE BOOK
        // The book grows from 0 to Width. Center it at 0.
        this.bookGroup.position.x = -this.config.width / 2;

        // 4. ANIMATION LOOP
        this.animate();

        // 5. EVENTS
        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(this.container);

        this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));

        return this;
    }

    /**
     * Build the Book Meshes using the valid Ultimate Architecture
     */
    async buildBookGeometry() {
        this.bookGroup = new THREE.Group();
        this.bookGroup.rotation.x = -0.4; // Tilt for viewing
        this.scene.add(this.bookGroup);

        // Center on X by shifting group? Or shift pages?
        // Let's keep group centered at 0,0,0 and shift pages via Pivot.
        // The pages pivot around their Spine (x=0).

        const geometry = new THREE.BoxGeometry(
            this.config.width,
            this.config.height,
            this.config.thickness,
            60, 1, 1 // Segments on X for bending
        );
        geometry.translate(this.config.width / 2, 0, 0); // Pivot at spine

        this.pages = [];

        // --- GENERATE TEXTURES ---
        for (let i = 0; i < this.config.pageCount; i++) {
            const sheetData = this.dataSheets[i];

            // Group Hinge
            const group = new THREE.Group();
            group.position.set(0, 0, 0);

            // Z-Stacking Logic
            // Page 0 (Cover) is Top.
            // Z Offset = (N - 1 - i) * spacing
            const zOffset = (this.config.pageCount - 1 - i) * this.config.spacing;

            // Materials (Placeholder 1st)
            // Create a pending texture
            const matFront = this.createPageMaterial(null, false, i);
            const matBack = this.createPageMaterial(null, true, i);

            // Trigger Load
            this.loadTextureForSheet(i, sheetData, matFront, matBack);

            const materials = [
                this.matEdge, this.matEdge, this.matEdge, this.matEdge,
                matFront, matBack
            ];

            const mesh = new THREE.Mesh(geometry, materials);
            mesh.position.z = zOffset; // Offset in Thickness direction
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Bending Shader
            this.applyBendingShader(mesh);

            group.add(mesh);
            this.bookGroup.add(group);

            this.pages.push({
                id: i,
                group: group,
                mesh: mesh,
                isFlipped: false,
                initialZ: zOffset,
                data: sheetData // Store data ref
            });
        }
    }

    createPageMaterial(texture, isBack, index) {
        // If texture null, use white/gray placeholder
        const tex = texture || new THREE.Texture(); // Empty
        if (isBack && texture) {
            tex.center.set(0.5, 0.5);
            tex.repeat.x = -1; // Mirror back
        }

        const mat = new THREE.MeshStandardMaterial({
            map: texture ? tex : null,
            color: texture ? 0xffffff : 0xeeeeee,
            roughness: 0.4,
            metalness: 0.1,
            polygonOffset: true,
            polygonOffsetFactor: -1 * index,
            polygonOffsetUnits: 1
        });
        return mat;
    }

    async loadTextureForSheet(index, sheetData, matFront, matBack) {
        // Use the callback to render HTML, then rasterize
        try {
            // Front
            const frontCanvas = await this.renderToCanvas(sheetData.frontData);
            const frontTex = new THREE.CanvasTexture(frontCanvas);
            frontTex.colorSpace = THREE.SRGBColorSpace;
            // High fidelity settings
            frontTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            frontTex.minFilter = THREE.LinearMipmapLinearFilter;

            matFront.map = frontTex;
            matFront.color.set(0xffffff);
            matFront.needsUpdate = true;

            // Back
            const backCanvas = await this.renderToCanvas(sheetData.backData);
            const backTex = new THREE.CanvasTexture(backCanvas);
            backTex.colorSpace = THREE.SRGBColorSpace;
            // High fidelity settings
            backTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
            backTex.minFilter = THREE.LinearMipmapLinearFilter;

            // Mirroring Back Texture REMOVED
            // The user reports strict mirroring issue.
            // Standard back face mapping should display LTR text correctly if not flipped.
            // backTex.center.set(0.5, 0.5);
            // backTex.repeat.x = -1;

            matBack.map = backTex;
            matBack.color.set(0xffffff);
            matBack.needsUpdate = true;

        } catch (e) {
            console.error("Texture Gen Error", e);
        }
    }

    async renderToCanvas(data) {
        if (!data) return document.createElement('canvas'); // Empty

        // Create hidden container with EXACT DIMENSIONS from Editor Template
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.left = '-9999px';
        div.style.width = `${this.editorW}px`;
        div.style.height = `${this.editorH}px`;
        div.style.background = 'white';
        // Ensure no transform scaling affects size

        document.body.appendChild(div);

        // Render Page HTML
        if (this.renderPageCallback) {
            await this.renderPageCallback(data, div);
        }

        // Rasterize with proper scale
        const canvas = await html2canvas(div, {
            scale: 3, // "As sharp as possible" - 3x is high fidelity
            logging: false,
            useCORS: true,
            backgroundColor: null
        });

        document.body.removeChild(div);
        return canvas;
    }

    // --- PHYSICS & ANIMATION (Ported from Ultimate) ---
    applyBendingShader(mesh) {
        mesh.userData.uniforms = {
            uBend: { value: 0 },
            uAngle: { value: 0 }
        };

        mesh.material.forEach(m => {
            m.onBeforeCompile = (shader) => {
                shader.uniforms.uBend = mesh.userData.uniforms.uBend;
                shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform float uBend;`);
                shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                    #include <begin_vertex>
                    float xNorm = clamp(position.x / ${this.config.width.toFixed(2)}, 0.0, 1.0);
                    float curl = -1.0 * pow(xNorm, 2.0);
                    transformed.z += curl * uBend * ${this.config.curveStrength.toFixed(2)};
                `);
            };
        });

        // Custom Depth Material
        const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
        depth.onBeforeCompile = (shader) => {
            shader.uniforms.uBend = mesh.userData.uniforms.uBend;
            shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nuniform float uBend;`);
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
                #include <begin_vertex>
                float xNorm = clamp(position.x / ${this.config.width.toFixed(2)}, 0.0, 1.0);
                float curl = -1.0 * pow(xNorm, 2.0);
                transformed.z += curl * uBend * ${this.config.curveStrength.toFixed(2)};
            `);
        };
        mesh.customDepthMaterial = depth;
    }

    onPointerDown(e) {
        if (this.isAnimating) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const meshList = this.pages.map(p => p.mesh);
        const intersects = raycaster.intersectObjects(meshList);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const hitPage = this.pages.find(p => p.mesh === hitMesh);
            if (hitPage) this.handleClick(hitPage);
        }
    }

    handleClick(hitPage) {
        // FIFO Logic
        const unflipped = this.pages.filter(p => !p.isFlipped).sort((a, b) => a.id - b.id);
        const flipped = this.pages.filter(p => p.isFlipped).sort((a, b) => b.id - a.id);

        if (!hitPage.isFlipped) {
            const topPage = unflipped[0]; // Top of Right Stack
            if (topPage) this.flipPage(topPage);
        } else {
            const topPage = flipped[0]; // Top of Left Stack
            if (topPage) this.flipPage(topPage);
        }
    }

    // --- EXTERNAL CONTROLS ---
    nextPage() {
        const unflipped = this.pages.filter(p => !p.isFlipped).sort((a, b) => a.id - b.id);
        if (unflipped.length > 0) {
            this.flipPage(unflipped[0]);
        }
    }

    prevPage() {
        const flipped = this.pages.filter(p => p.isFlipped).sort((a, b) => b.id - a.id);
        if (flipped.length > 0) {
            this.flipPage(flipped[0]);
        }
    }

    flipPage(page) {
        this.isAnimating = true;
        const isClosing = page.isFlipped;
        const targetAngle = isClosing ? 0 : -Math.PI;

        page.mesh.renderOrder = 1000;
        const zRadius = page.initialZ;
        const anim = { rot: page.group.rotation.y, bend: 0 };

        const tl = gsap.timeline({
            onUpdate: () => {
                page.group.rotation.y = anim.rot;
                // Pinned Spine Compensation
                const currentTheta = page.group.rotation.y;
                const xKick = zRadius * Math.sin(currentTheta);
                page.group.position.x = -xKick;

                if (page.mesh.userData.uniforms) {
                    page.mesh.userData.uniforms.uBend.value = anim.bend;
                }
            },
            onComplete: () => {
                page.isFlipped = !page.isFlipped;
                this.isAnimating = false;
                page.mesh.renderOrder = 0;
                page.group.rotation.y = targetAngle;
                page.group.position.x = 0;
            }
        });

        tl.to(anim, { rot: targetAngle, duration: this.config.duration, ease: "power2.inOut" }, 0);

        // Bending
        tl.to(anim, { bend: 1.0, duration: this.config.duration * 0.4, ease: "sine.out" }, 0);
        tl.to(anim, { bend: 0.0, duration: this.config.duration * 0.6, ease: "sine.in" }, this.config.duration * 0.4);

        // Update Centering (Wait until page is effectively part of the new stack? Or animate?)
        // Let's animate the centering concurrently.
        // If we are flipping Page 0 (Cover) Open -> We go from Closed to Open -> Shift to Spine (0).
        // If we are flipping Page 0 (Cover) Close -> We go from Open to Closed -> Shift to Cover Center (-W/2).
        this.updateCentering(page, isClosing);
    }

    updateCentering(flippingPage, isClosing) {
        // Logic:
        // If we are opening the FRONT COVER (Page 0) -> Move to 0.
        // If we are closing the FRONT COVER -> Move to -W/2.
        // If we are opening the BACK COVER (Last Page) -> Move to +W/2 ? 
        //   (User sees Back Cover centered).

        // Wait, "isClosing" means we are flipping BACK to the Right.
        // "Opening" means flipping to the Left.

        let targetX = this.bookGroup.position.x;

        if (flippingPage.id === 0) {
            // It's the front cover
            if (!isClosing) { // Opening Cover
                targetX = 0; // Center strict on Spine
            } else { // Closing Cover
                targetX = -this.config.width / 2; // Center on Front Cover
            }
        }
        else if (flippingPage.id === this.pages.length - 1) {
            // It's the back cover
            if (!isClosing) { // Opening Back Cover (Flipping Last Sheet to Left) -> Viewer sees Back Cover Face?
                // If we flip the last sheet, we see the Outside Back Cover on the LEFT.
                // So center should be -(-width/2) = width/2.
                targetX = this.config.width / 2;
            } else { // Closing Back Cover (Flipping back to Right) -> Viewer sees Inside Back Cover (Spread)
                targetX = 0;
            }
        }
        else {
            // Internal Page Flip -> Stay Centered on Spine (0)
            targetX = 0;
        }

        // Animate
        gsap.to(this.bookGroup.position, {
            x: targetX,
            duration: this.config.duration,
            ease: "power2.inOut"
        });
    }

    animate() {
        this.requestId = requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    setRotation(degrees) {
        if (!this.bookGroup) return;
        const rad = (degrees - 180) * (Math.PI / 180); // Offset to match slider feeling
        this.bookGroup.rotation.y = rad;
    }

    jumpToPage(targetIndex) {
        // targetIndex corresponds to the index of the last sheet that should be flipped LEFT.
        // -1: No sheets flipped (Closed Front).
        // 0: Sheet 0 flipped.
        // 1: Sheet 0, 1 flipped.

        this.pages.forEach(page => {
            const shouldBeFlipped = page.id <= targetIndex; // page.id is 0-based index

            if (page.isFlipped !== shouldBeFlipped) {
                page.isFlipped = shouldBeFlipped;

                // Set Rotation Instantly
                const targetAngle = shouldBeFlipped ? -Math.PI : 0;
                page.group.rotation.y = targetAngle;
                page.group.position.x = 0; // Reset any animation kicks
            }
        });

        // Update Centering Instantly
        let targetX = 0;
        const allUnflipped = this.pages.every(p => !p.isFlipped);
        const allFlipped = this.pages.every(p => p.isFlipped);

        if (allUnflipped) targetX = -this.config.width / 2;
        else if (allFlipped) targetX = this.config.width / 2;
        else targetX = 0;

        this.bookGroup.position.x = targetX;
    }

    dispose() {
        if (this.requestId) cancelAnimationFrame(this.requestId);
        if (this.renderer) {
            this.renderer.dispose();
            this.container.innerHTML = '';
        }
        if (this.resizeObserver) this.resizeObserver.disconnect();
    }
}
