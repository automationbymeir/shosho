// ============================================
// DESIGN EDITOR - CANVA-LIKE FEATURES
// ============================================

class DesignEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.currentImage = null;
        this.currentFilter = 'none';
        this.isDrawing = false;
        this.currentTool = 'select'; // select, brush, text, eraser
        this.brushSize = 10;
        this.brushColor = '#000000';
        this.textElements = [];
        this.drawingHistory = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
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
            cool: { filter: 'brightness(0.9) saturate(0.8) hue-rotate(10deg)' }
        };
    }

    init(containerId) {
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
            // Use default dimensions if container not yet visible
            this.canvas.width = 800;
            this.canvas.height = 600;
        } else {
            // Use available space but with reasonable limits
            const maxWidth = Math.min(800, rect.width - 40);
            const maxHeight = Math.min(600, rect.height - 40);
            this.canvas.width = Math.max(400, maxWidth);
            this.canvas.height = Math.max(300, maxHeight);
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
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
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
        const filterContainer = document.getElementById('filterControls');
        if (filterContainer) {
            filterContainer.innerHTML = Object.keys(this.filters).map(filterName => {
                const filter = this.filters[filterName];
                return `
                    <button class="filter-btn" data-filter="${filterName}" onclick="designEditor.applyFilter('${filterName}')">
                        ${this.formatFilterName(filterName)}
                    </button>
                `;
            }).join('');
        }

        // Tool controls
        const toolContainer = document.getElementById('toolControls');
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
        const brushContainer = document.getElementById('brushControls');
        if (brushContainer) {
            brushContainer.innerHTML = `
                <div class="control-group">
                    <label>Brush Size:</label>
                    <input type="range" id="brushSize" min="1" max="50" value="${this.brushSize}" 
                           oninput="designEditor.setBrushSize(this.value)">
                    <span id="brushSizeVal">${this.brushSize}px</span>
                </div>
                <div class="control-group">
                    <label>Color:</label>
                    <input type="color" id="brushColor" value="${this.brushColor}" 
                           oninput="designEditor.setBrushColor(this.value)">
                </div>
            `;
        }
    }

    formatFilterName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
    }

    loadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            if (!this.canvas || !this.ctx) {
                console.error('Canvas not initialized when loading image');
                reject(new Error('Canvas not initialized'));
                return;
            }

            console.log('Loading image:', imageUrl.substring(0, 100) + '...');

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
                    console.log('Image drawn on canvas, canvas visible:', this.canvas.style.display, 'opacity:', this.canvas.style.opacity);
                }, 100);
                resolve();
            };

            img.onerror = (e) => {
                console.error('Image load error:', e, imageUrl);
                reject(new Error('Failed to load image: ' + (e.message || 'Unknown error')));
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

            console.log('Drawing image at:', x.toFixed(1), y.toFixed(1), 'size:', scaledWidth.toFixed(1), 'x', scaledHeight.toFixed(1));

            // Draw white background first
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw the image (filter will be applied during export)
            this.ctx.drawImage(
                this.currentImage,
                0, 0, this.currentImage.width, this.currentImage.height,
                x, y, scaledWidth, scaledHeight
            );

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

        // Apply CSS filter to canvas element (for visual preview only)
        // Note: This is just for display - the actual filter is applied to image data above
        if (this.filters[this.currentFilter] && this.filters[this.currentFilter].filter !== 'none') {
            this.canvas.style.filter = this.filters[this.currentFilter].filter;
        } else {
            this.canvas.style.filter = 'none';
        }

        // Redraw text elements
        this.redrawText();

        // Log canvas state for debugging
        if (this.canvas) {
            const rect = this.canvas.getBoundingClientRect();
            console.log('Canvas state after redraw:', {
                display: this.canvas.style.display,
                visibility: this.canvas.style.visibility,
                opacity: this.canvas.style.opacity,
                width: this.canvas.width,
                height: this.canvas.height,
                boundingRect: {
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left
                }
            });
        }
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

    exportImage(format = 'png', quality = 0.9) {
        // Create a temporary canvas to export with filters applied to image data
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.canvas.width;
        exportCanvas.height = this.canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Draw white background
        exportCtx.fillStyle = 'white';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        if (!this.currentImage) {
            // No image - just export canvas as is
            return this.canvas.toDataURL(`image/${format}`, quality);
        }
        
        // Calculate image position and size
        const scale = Math.min(
            exportCanvas.width / this.currentImage.width,
            exportCanvas.height / this.currentImage.height
        );
        const scaledWidth = this.currentImage.width * scale;
        const scaledHeight = this.currentImage.height * scale;
        const x = (exportCanvas.width - scaledWidth) / 2;
        const y = (exportCanvas.height - scaledHeight) / 2;
        
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
        
        // Draw text elements
        this.textElements.forEach(element => {
            exportCtx.save();
            exportCtx.font = `${element.fontSize}px ${element.fontFamily}`;
            exportCtx.fillStyle = element.color;
            exportCtx.textBaseline = 'top';
            exportCtx.fillText(element.text, element.x, element.y);
            exportCtx.restore();
        });
        
        return exportCanvas.toDataURL(`image/${format}`, quality);
    }
    
    applyFilterToImageData(data, filterName) {
        // Apply filter effects to image data array (RGBA format)
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            // data[i + 3] is alpha, we keep it unchanged
            
            switch (filterName) {
                case 'grayscale':
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                    break;
                    
                case 'blackwhite':
                    const gray2 = 0.299 * r + 0.587 * g + 0.114 * b;
                    const contrast = 1.3;
                    const adjusted = Math.min(255, Math.max(0, (gray2 - 128) * contrast + 128));
                    data[i] = adjusted;
                    data[i + 1] = adjusted;
                    data[i + 2] = adjusted;
                    break;
                    
                case 'sepia':
                    const tr = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
                    const tg = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
                    const tb = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
                    data[i] = tr;
                    data[i + 1] = tg;
                    data[i + 2] = tb;
                    break;
                    
                case 'vintage':
                    const tr2 = 0.393 * r + 0.769 * g + 0.189 * b;
                    const tg2 = 0.349 * r + 0.686 * g + 0.168 * b;
                    const tb2 = 0.272 * r + 0.534 * g + 0.131 * b;
                    const contrast2 = 1.2;
                    data[i] = Math.min(255, Math.max(0, (tr2 * 0.9 - 128) * contrast2 + 128));
                    data[i + 1] = Math.min(255, Math.max(0, (tg2 * 0.9 - 128) * contrast2 + 128));
                    data[i + 2] = Math.min(255, Math.max(0, (tb2 * 0.9 - 128) * contrast2 + 128));
                    break;
                    
                case 'warm':
                    const tr3 = 0.393 * r + 0.769 * g + 0.189 * b;
                    const tg3 = 0.349 * r + 0.686 * g + 0.168 * b;
                    const tb3 = 0.272 * r + 0.534 * g + 0.131 * b;
                    data[i] = Math.min(255, tr3 * 1.1);
                    data[i + 1] = Math.min(255, tg3 * 1.1);
                    data[i + 2] = Math.min(255, tb3 * 1.1);
                    break;
                    
                case 'brightness':
                    data[i] = Math.min(255, r * 1.2);
                    data[i + 1] = Math.min(255, g * 1.2);
                    data[i + 2] = Math.min(255, b * 1.2);
                    break;
                    
                case 'contrast':
                    const factor = 1.5;
                    data[i] = Math.min(255, Math.max(0, (r - 128) * factor + 128));
                    data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factor + 128));
                    data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factor + 128));
                    break;
                    
                case 'saturate':
                    const gray3 = 0.299 * r + 0.587 * g + 0.114 * b;
                    data[i] = Math.min(255, Math.max(0, gray3 + (r - gray3) * 1.5));
                    data[i + 1] = Math.min(255, Math.max(0, gray3 + (g - gray3) * 1.5));
                    data[i + 2] = Math.min(255, Math.max(0, gray3 + (b - gray3) * 1.5));
                    break;
                    
                case 'cool':
                    data[i] = Math.min(255, r * 0.9);
                    data[i + 1] = Math.min(255, g * 0.8);
                    data[i + 2] = Math.min(255, b * 0.9);
                    // Slight hue shift towards blue
                    const temp = data[i];
                    data[i] = Math.min(255, data[i] * 0.95 + data[i + 2] * 0.05);
                    data[i + 2] = Math.min(255, data[i + 2] * 0.95 + temp * 0.05);
                    break;
                    
                case 'blur':
                    // Blur requires multi-pass processing with neighbors
                    // For now, skip blur as it's complex to implement properly
                    break;
            }
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
}

// Initialize global instance
const designEditor = new DesignEditor();

// Export functions for use in app.js
window.designEditor = designEditor;