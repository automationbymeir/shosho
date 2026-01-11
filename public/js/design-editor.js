// ============================================
// DESIGN EDITOR - CANVA-LIKE FEATURES
// ============================================

class DesignEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentImage = null;
        this.currentFilter = 'none';

        // New: Mutable adjustments state
        this.adjustments = {
            brightness: 100, // 0-200, 100 is neutral
            contrast: 100,   // 0-200, 100 is neutral
            saturation: 100  // 0-200, 100 is neutral
        };

        this.isDrawing = false;
        this.currentTool = 'move'; // move, brush, text
        this.brushSize = 5;
        this.brushColor = '#ff0000';
        // ... (rest of constructor fields if any, checking context)
        this.paths = [];
        this.textElements = [];
        this.drawingHistory = []; // Undo stack (Fix: Renamed from history)
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.selectedTextId = null;

        // Image filters
        this.filters = {
            none: { filter: 'none' },
            grayscale: { filter: 'grayscale(100%)' },
            sepia: { filter: 'sepia(100%)' },
            blur: { filter: 'blur(5px)' },
            brightness: { filter: 'brightness(1.2)' },
            contrast: { filter: 'contrast(1.5)' },
            saturate: { filter: 'saturate(1.5)' },
            vintage: { filter: 'sepia(50%) contrast(1.2) brightness(0.9)' },
            blackwhite: { filter: 'grayscale(100%) contrast(1.3)' },
            warm: { filter: 'sepia(30%) saturate(1.2) brightness(1.1)' },
            cool: { filter: 'brightness(0.9) saturate(0.8) hue-rotate(10deg)' },
            vivid: { filter: 'saturate(1.5) contrast(1.2)' },
            muted: { filter: 'saturate(0.5) brightness(1.1)' }
        };
    }

    init(containerId, config = {}) {
        this.config = Object.assign({
            filterControlsId: 'filterControls',
            toolControlsId: 'toolControls',
            brushControlsId: 'brushControls',
            brushSizeId: 'brushSize',
            brushColorId: 'brushColor',
            brushSizeValId: 'brushSizeVal'
        }, config);

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Design editor container not found:', containerId);
            return;
        }

        // Clear container first
        container.innerHTML = '';

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'designCanvas';
        this.canvas.style.display = 'block';
        this.canvas.style.visibility = 'visible';
        this.canvas.style.margin = '0 auto';
        this.canvas.style.border = '2px solid var(--color-border)';
        this.canvas.style.borderRadius = 'var(--radius-md)';
        this.canvas.style.cursor = 'crosshair';
        this.canvas.style.background = 'white';
        this.canvas.style.boxShadow = 'var(--shadow-md)';
        this.canvas.style.opacity = '1';

        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        if (!this.ctx) {
            console.error('Failed to get canvas context');
            return;
        }

        // Ensure container is visible
        container.style.display = 'flex';
        container.style.visibility = 'visible';
        container.style.opacity = '1';

        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Setup event listeners
        this.setupEventListeners();

        // Initialize UI
        this.initUI();

        console.log('Design editor initialized, canvas created:', this.canvas.width, 'x', this.canvas.height);
        console.log('Canvas element:', this.canvas);
        console.log('Canvas parent:', this.canvas.parentElement);
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // Ensure we have valid dimensions
        if (rect.width <= 0 || rect.height <= 0) {
            // Use default square dimensions if container not yet visible
            // CRITICAL FIX: Always default to something usable so we don't end up with 0x0 canvas
            this.canvas.width = 600;
            this.canvas.height = 600;
            // console.warn('Canvas container hidden or 0 size, defaulting to 600x600');
        } else {
            // Make the drawing area square so photos are never stretched
            const availableWidth = rect.width - 40;
            const availableHeight = rect.height - 80; // leave some vertical padding
            const side = Math.max(
                320,
                Math.min(600, Math.min(availableWidth, availableHeight))
            );
            this.canvas.width = side;
            this.canvas.height = side;
        }

        // Set display size to match canvas size
        this.canvas.style.width = this.canvas.width + 'px';
        this.canvas.style.height = this.canvas.height + 'px';

        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
        this.redraw();
    }

    setupEventListeners() {
        if (!this.canvas) return;

        // Drawing events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        // Mobile touch move/end
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            // Simple mapping to mousemove for now
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }

    initUI() {
        // Filter controls
        const filterContainer = document.getElementById(this.config.filterControlsId);
        if (filterContainer) {
            filterContainer.innerHTML = Object.keys(this.filters).map(filterName => {
                const filter = this.filters[filterName];
                // Map filter names to chips
                let label = this.formatFilterName(filterName);
                if (filterName === 'blackwhite') label = 'B&W';

                return `
                    <button class="filter-chip ${this.currentFilter === filterName ? 'active' : ''}" 
                            data-filter="${filterName}" 
                            onclick="designEditor.applyFilter('${filterName}')">
                        ${label}
                    </button>
                `;
            }).join('');
        }

        // Tool controls
        const toolContainer = document.getElementById(this.config.toolControlsId);
        if (toolContainer) {
            toolContainer.innerHTML = `
                <button class="tool-btn active" data-tool="select" onclick="designEditor.setTool('select')">
                    <span>✋</span> Select
                </button>
                <button class="tool-btn" data-tool="brush" onclick="designEditor.setTool('brush')">
                    <span>🖌️</span> Brush
                </button>
                <button class="tool-btn" data-tool="text" onclick="designEditor.setTool('text')">
                    <span>📝</span> Text
                </button>
                <button class="tool-btn" data-tool="eraser" onclick="designEditor.setTool('eraser')">
                    <span>🧹</span> Eraser
                </button>
            `;
        }

        // Brush controls
        const brushContainer = document.getElementById(this.config.brushControlsId);
        if (brushContainer) {
            brushContainer.innerHTML = `
                <div class="control-group">
                    <label>Brush Size:</label>
                    <input type="range" id="${this.config.brushSizeId}" min="1" max="50" value="${this.brushSize}" 
                           oninput="designEditor.setBrushSize(this.value)">
                    <span id="${this.config.brushSizeValId}">${this.brushSize}px</span>
                </div>
                <div class="control-group">
                    <label>Color:</label>
                    <input type="color" id="${this.config.brushColorId}" value="${this.brushColor}" 
                           oninput="designEditor.setBrushColor(this.value)">
                </div>
            `;
        }
    }

    formatFilterName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
    }

    loadImage(imageUrl, fallbackUrl = null) {
        return new Promise((resolve, reject) => {
            if (!this.canvas || !this.ctx) {
                console.error('Canvas not initialized when loading image');
                reject(new Error('Canvas not initialized'));
                return;
            }

            console.log('Loading image:', imageUrl.substring(0, 100) + '...', fallbackUrl ? '(has fallback)' : '');

            const img = new Image();
            // For data URLs, don't set crossOrigin
            if (!imageUrl.startsWith('data:')) {
                img.crossOrigin = 'anonymous';
            }

            img.onload = () => {
                console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
                this.currentImage = img;
                // Ensure canvas is properly sized
                this.resizeCanvas();
                // Force immediate redraw
                this.redraw();
                // Also redraw after a short delay to ensure visibility
                setTimeout(() => {
                    this.redraw();
                }, 100);
                resolve();
            };

            img.onerror = (e) => {
                console.warn('Image load error for ' + imageUrl, e);

                if (fallbackUrl) {
                    console.log('Attempting to load fallback URL...');
                    this.loadImage(fallbackUrl, null)
                        .then(resolve)
                        .catch(err => {
                            reject(new Error('Failed to load image and fallback: ' + (e.message || 'Unknown error')));
                        });
                } else {
                    reject(new Error('Failed to load image: ' + (e.message || 'Unknown error')));
                }
            };

            // Set source after setting up handlers
            img.src = imageUrl;
        });
    }

    applyFilter(filterName) {
        this.currentFilter = filterName;
        this.redraw();

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filterName);
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.canvas.style.cursor = tool === 'brush' || tool === 'eraser' ? 'crosshair' :
            tool === 'text' ? 'text' : 'default';

        // Update active tool button
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });

        // Show/hide brush controls
        const brushControls = document.getElementById('brushControlsSection');
        if (brushControls) {
            brushControls.style.display = (tool === 'brush' || tool === 'eraser') ? 'block' : 'none';
        }
    }

    setBrushSize(size) {
        this.brushSize = parseInt(size);
        document.getElementById('brushSizeVal').textContent = size + 'px';
    }

    setBrushColor(color) {
        this.brushColor = color;
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startDrawing(e) {
        if (this.currentTool === 'select') return;

        this.isDrawing = true;
        const pos = this.getMousePos(e);

        if (this.currentTool === 'text') {
            this.addText(pos.x, pos.y);
        } else {
            this.saveState();
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        }
    }

    draw(e) {
        if (!this.isDrawing || this.currentTool === 'select' || this.currentTool === 'text') return;

        const pos = this.getMousePos(e);

        if (this.currentTool === 'brush') {
            this.ctx.lineWidth = this.brushSize;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = this.brushColor;
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.currentTool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.lineWidth = this.brushSize;
            this.ctx.lineCap = 'round';
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
            this.ctx.globalCompositeOperation = 'source-over';
        }
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.beginPath();
        }
    }

    addText(x, y) {
        const text = prompt('Enter text:');
        if (!text) return;

        this.saveState();
        const textElement = {
            text: text,
            x: x,
            y: y,
            fontSize: 24,
            fontFamily: 'Playfair Display',
            color: this.brushColor,
            id: Date.now()
        };

        this.textElements.push(textElement);
        this.redraw();
        this.showTextEditor(textElement);
    }

    showTextEditor(textElement) {
        // Create or update text editor UI
        let editor = document.getElementById('textEditor');
        if (!editor) {
            editor = document.createElement('div');
            editor.id = 'textEditor';
            editor.className = 'text-editor-panel';
            document.body.appendChild(editor);
        }

        editor.innerHTML = `
            <div class="text-editor-content">
                <h4>Edit Text</h4>
                <div class="control-group">
                    <label>Text:</label>
                    <input type="text" id="editText" value="${textElement.text}" 
                           oninput="designEditor.updateTextElement(${textElement.id}, 'text', this.value)">
                </div>
                <div class="control-group">
                    <label>Size:</label>
                    <input type="range" id="editFontSize" min="12" max="72" value="${textElement.fontSize}" 
                           oninput="designEditor.updateTextElement(${textElement.id}, 'fontSize', this.value)">
                    <span>${textElement.fontSize}px</span>
                </div>
                <div class="control-group">
                    <label>Color:</label>
                    <input type="color" id="editTextColor" value="${textElement.color}" 
                           oninput="designEditor.updateTextElement(${textElement.id}, 'color', this.value)">
                </div>
                <div class="control-group">
                    <label>Font:</label>
                    <select id="editFontFamily" onchange="designEditor.updateTextElement(${textElement.id}, 'fontFamily', this.value)">
                        <option value="Playfair Display" ${textElement.fontFamily === 'Playfair Display' ? 'selected' : ''}>Playfair Display</option>
                        <option value="Montserrat" ${textElement.fontFamily === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
                        <option value="Lato" ${textElement.fontFamily === 'Lato' ? 'selected' : ''}>Lato</option>
                        <option value="Georgia" ${textElement.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
                        <option value="Arial" ${textElement.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                        <option value="Times New Roman" ${textElement.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                        <option value="Courier New" ${textElement.fontFamily === 'Courier New' ? 'selected' : ''}>Courier New</option>
                        <option value="Verdana" ${textElement.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
                        <option value="Helvetica" ${textElement.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                    </select>
                </div>
                <button class="btn btn-small" onclick="designEditor.deleteTextElement(${textElement.id})">Delete</button>
                <button class="btn btn-small" onclick="designEditor.closeTextEditor()">Close</button>
            </div>
        `;
        editor.style.display = 'block';
    }

    updateTextElement(id, property, value) {
        const element = this.textElements.find(t => t.id === id);
        if (element) {
            element[property] = property === 'fontSize' ? parseInt(value) : value;
            this.redraw();
        }
    }

    deleteTextElement(id) {
        this.saveState();
        this.textElements = this.textElements.filter(t => t.id !== id);
        this.redraw();
        this.closeTextEditor();
    }

    closeTextEditor() {
        const editor = document.getElementById('textEditor');
        if (editor) {
            editor.style.display = 'none';
        }
    }

    saveState() {
        const state = this.canvas.toDataURL();
        this.drawingHistory = this.drawingHistory.slice(0, this.historyIndex + 1);
        this.drawingHistory.push(state);
        if (this.drawingHistory.length > this.maxHistory) {
            this.drawingHistory.shift();
        }
        this.historyIndex = this.drawingHistory.length - 1;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState();
        }
    }

    redo() {
        if (this.historyIndex < this.drawingHistory.length - 1) {
            this.historyIndex++;
            this.restoreState();
        }
    }

    restoreState() {
        if (this.drawingHistory[this.historyIndex]) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0);
                this.redrawText();
            };
            img.src = this.drawingHistory[this.historyIndex];
        }
    }

    setAdjustment(name, value) {
        if (this.adjustments.hasOwnProperty(name)) {
            this.adjustments[name] = parseInt(value, 10);
            this.redraw();
        }
    }

    redraw() {
        if (!this.ctx || !this.canvas) {
            console.warn('Cannot redraw: canvas or context not available');
            return;
        }

        // Ensure canvas is visible
        this.canvas.style.display = 'block';
        this.canvas.style.visibility = 'visible';
        this.canvas.style.opacity = '1';

        // Clear canvas with white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image with filter
        if (this.currentImage) {
            this.ctx.save();

            // Draw image - center and scale to fit
            const scale = Math.min(
                this.canvas.width / this.currentImage.width,
                this.canvas.height / this.currentImage.height
            );
            const scaledWidth = this.currentImage.width * scale;
            const scaledHeight = this.currentImage.height * scale;
            const x = (this.canvas.width - scaledWidth) / 2;
            const y = (this.canvas.height - scaledHeight) / 2;

            // Draw white background locally
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // 1. Draw raw image
            this.ctx.drawImage(
                this.currentImage,
                0, 0, this.currentImage.width, this.currentImage.height,
                x, y, scaledWidth, scaledHeight
            );

            // 2. Apply Filters + Adjustments (Pixel Manipulation)
            // We must grab the data for the drawn area (or whole canvas to be safe/easy)
            // Getting whole canvas is easier for simplicity
            const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.applyFilterToImageData(imgData.data, this.currentFilter);
            this.ctx.putImageData(imgData, 0, 0);

            this.ctx.restore();
        } else {
            // Show placeholder text if no image
            this.ctx.fillStyle = '#999';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('No image loaded', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillStyle = '#ccc';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('Click Edit on a photo to load it here', this.canvas.width / 2, this.canvas.height / 2 + 30);
        }

        // Remove CSS filter (we are doing it in JS now)
        this.canvas.style.filter = 'none';

        // Redraw text elements (on top of the filtered image)
        this.redrawText();
    }

    redrawText() {
        this.textElements.forEach(element => {
            this.ctx.save();
            this.ctx.font = `${element.fontSize}px ${element.fontFamily}`;
            this.ctx.fillStyle = element.color;
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(element.text, element.x, element.y);
            this.ctx.restore();
        });
    }

    exportImage(format = 'png', quality = 0.9, options = {}) {
        // Export at higher resolution WITHOUT upscaling beyond source pixels.
        // This is critical so the generated PDF never uses a low-res raster.
        //
        // options:
        // - maxDimension: cap the exported longest side in pixels (default 2400)

        const baseW = this.canvas.width;
        const baseH = this.canvas.height;

        const maxDimension = Number.isFinite(options?.maxDimension) ? options.maxDimension : 2400;

        // Default export size matches the editor canvas.
        let exportW = baseW;
        let exportH = baseH;

        if (this.currentImage) {
            // FIX: Match export aspect ratio to the image, not the square canvas
            // This prevents adding white borders to non-square images
            exportW = this.currentImage.width;
            exportH = this.currentImage.height;

            // Apply maxDimension constraint if needed
            if (Math.max(exportW, exportH) > maxDimension) {
                const scale = maxDimension / Math.max(exportW, exportH);
                exportW = Math.round(exportW * scale);
                exportH = Math.round(exportH * scale);
            }
        }

        const scaleFactor = exportW / baseW;

        // Create a temporary canvas to export with filters applied to image data
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportW;
        exportCanvas.height = exportH;
        const exportCtx = exportCanvas.getContext('2d');

        // Draw white background
        exportCtx.fillStyle = 'white';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        if (!this.currentImage) {
            // No image - just export canvas as is
            return this.canvas.toDataURL(`image/${format}`, quality);
        }

        // Calculate image position and size
        const x = 0;
        const y = 0;
        const scaledWidth = exportCanvas.width;
        const scaledHeight = exportCanvas.height;

        // Create a temporary canvas for the image at full resolution
        const imageCanvas = document.createElement('canvas');
        imageCanvas.width = this.currentImage.width;
        imageCanvas.height = this.currentImage.height;
        const imageCtx = imageCanvas.getContext('2d');

        // Draw original image to temp canvas
        imageCtx.drawImage(this.currentImage, 0, 0);

        // Apply filter to image data if filter is active
        if (this.currentFilter && this.currentFilter !== 'none' && this.filters[this.currentFilter]) {
            const imageData = imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
            this.applyFilterToImageData(imageData.data, this.currentFilter);
            imageCtx.putImageData(imageData, 0, 0);
        }

        // Draw filtered image to export canvas
        exportCtx.drawImage(imageCanvas, x, y, scaledWidth, scaledHeight);

        // Draw text elements (scaled to match export resolution)
        this.textElements.forEach(element => {
            exportCtx.save();
            exportCtx.font = `${Math.round(element.fontSize * scaleFactor)}px ${element.fontFamily}`;
            exportCtx.fillStyle = element.color;
            exportCtx.textBaseline = 'top';
            exportCtx.fillText(
                element.text,
                Math.round(element.x * scaleFactor),
                Math.round(element.y * scaleFactor)
            );
            exportCtx.restore();
        });

        return exportCanvas.toDataURL(`image/${format}`, quality);
    }

    applyFilterToImageData(data, filterName) {
        const { brightness, contrast, saturation } = this.adjustments;

        // Math helpers
        // Brightness: 0..200 -> 0..2 multiplier
        const bMult = brightness / 100;

        // Contrast: 0..200 -> 0..3 (approx)
        const cVal = (contrast - 100) * 2.55;
        const cFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));

        // Saturation: 0..200 -> 0..2 multiplier
        const sMult = saturation / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // 1. Presets
            switch (filterName) {
                case 'grayscale':
                case 'blackwhite': // Treating bw as grayscale + high contrast via slider ideally, but keeping logic implies bw is preset
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    r = gray; g = gray; b = gray;
                    if (filterName === 'blackwhite') {
                        // Hardcode extra contrast for BW preset
                        r = (r - 128) * 1.5 + 128;
                        g = (g - 128) * 1.5 + 128;
                        b = (b - 128) * 1.5 + 128;
                    }
                    break;
                case 'sepia':
                    const tr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
                    const tg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
                    const tb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
                    r = tr; g = tg; b = tb;
                    break;
                case 'vintage':
                    r = (r * 0.9 + 20);
                    g = (g * 0.8 + 20);
                    b = (b * 0.6 + 20);
                    break;
                case 'warm':
                    r = r * 1.1;
                    g = g * 1.05;
                    b = b * 0.9;
                    break;
                case 'cool':
                    b = b * 1.15;
                    r = r * 0.9;
                    break;
            }

            // 2. Adjustments
            if (brightness !== 100) { r *= bMult; g *= bMult; b *= bMult; }
            if (contrast !== 100) {
                r = (cFactor * (r - 128)) + 128;
                g = (cFactor * (g - 128)) + 128;
                b = (cFactor * (b - 128)) + 128;
            }
            if (saturation !== 100) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = gray + (r - gray) * sMult;
                g = gray + (g - gray) * sMult;
                b = gray + (b - gray) * sMult;
            }

            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }
    }

    clear() {
        if (confirm('Clear all edits?')) {
            this.saveState();
            this.textElements = [];
            this.redraw();
        }
    }

    reset() {
        if (confirm('Reset to original image?')) {
            this.saveState();
            this.textElements = [];
            this.drawingHistory = [];
            this.historyIndex = -1;
            this.currentFilter = 'none';
            this.redraw();
        }
    }

    async generateAIImage() {
        const promptInput = document.getElementById('aiPrompt');
        const prompt = promptInput ? promptInput.value.trim() : '';

        if (!prompt) {
            alert('Please enter a prompt for the AI design.');
            return;
        }

        if (!this.currentImage) {
            alert('Please select a photo first.');
            return;
        }

        // Show loading state
        const btn = document.querySelector('#design-tab .btn-primary');
        const originalText = btn ? btn.innerHTML : 'Design with AI';
        if (btn) {
            btn.innerHTML = '<span class="icon spinner"></span> Generating...';
            btn.disabled = true;
        }

        try {
            console.log('Generating AI design with prompt:', prompt);

            // Call "Nana Banana" Cloud Function (Gemini/OpenAI wrapper)
            const generateDesign = firebase.functions().httpsCallable('generatePhotoDesign');

            // Note: If using a data URL, we might need to handle differently, but assuming standard URL here.
            const result = await generateDesign({
                imageUrl: this.currentImage.src,
                prompt: prompt
            });

            const data = result.data;
            if (!data.success) throw new Error(data.error || 'Unknown error');

            this.saveState();

            // Apply filters proposed by the "Nana Banana" model
            if (data.filters) {
                if (data.filters.brightness) this.setAdjustment('brightness', data.filters.brightness);
                if (data.filters.contrast) this.setAdjustment('contrast', data.filters.contrast);
                if (data.filters.saturation) this.setAdjustment('saturation', data.filters.saturation);
                if (data.filters.sepia) this.applyFilter('sepia', data.filters.sepia / 100); // Normalize if needed
                // Add more mappings as necessary
            }

            // If the model returned a new image URL (e.g. generative fill), load it
            if (data.newImageUrl && data.newImageUrl !== this.currentImage.src) {
                // Determine if we need to replace the image entirely
                // checks if load logic is available, otherwise just warn
                console.log("New AI Image URL received:", data.newImageUrl);
                // Future: Implement replaceImage(data.newImageUrl) if real generational AI provided
            }

            alert(`AI Design applied: "${prompt}"\n${data.designNote || ''}`);

        } catch (error) {
            console.error('AI Generation failed:', error);
            alert('Failed to generate design. ' + (error.message || 'Please try again.'));
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    }
}

// Initialize global instance
const designEditor = new DesignEditor();

// Export functions for use in app.js
window.designEditor = designEditor;