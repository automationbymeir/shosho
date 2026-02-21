import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Helper to get all HTML files recursively in a directory
function getHtmlFiles(dir, files = []) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = resolve(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getHtmlFiles(fullPath, files);
        } else if (fullPath.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

const htmlFiles = getHtmlFiles(resolve(__dirname, 'public'));
const input = {};

htmlFiles.forEach(file => {
    // Create a proper key for the rollup input object based on relative path
    let relativePath = file.replace(resolve(__dirname, 'public') + '/', '');
    // Filter out test files and dev mockups from input
    const skipKeywords = ['test', 'mockup', '3d-', 'roadmap_visuals'];
    if (skipKeywords.some(kw => relativePath.toLowerCase().includes(kw))) {
        return;
    }
    const keyName = relativePath.replace(/\.html$/, '').replace(/\//g, '_');
    input[keyName] = file;
});

export default defineConfig({
    root: 'public',
    publicDir: resolve(__dirname, 'public'), // Copy all unbundled assets natively from public
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input,
            external: [
                'three',
                'three/addons/controls/OrbitControls.js',
                'https://unpkg.com/three@0.160.0/build/three.module.js',
                'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js',
                'gsap'
            ]
        }
    },
    resolve: {
        alias: {
            'three': 'https://unpkg.com/three@0.160.0/build/three.module.js'
        }
    }
});
