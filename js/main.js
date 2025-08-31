import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Scene components
let scene, camera, renderer, controls;

// DOM elements
const container = document.getElementById('container');
const canvas = document.getElementById('viewer');

function init() {
    // Scene
    scene = new THREE.Scene();
    window.scene = scene; // Expose scene for debugging/testing
    scene.background = new THREE.Color(0x222222);

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start the animation loop
    animate();
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Initialize the scene
init();

// File loading
const fileInput = document.getElementById('file-input');
let currentModel;

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    if (currentModel) {
        scene.remove(currentModel);
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const contents = e.target.result;
        loadModel(contents, file.name);
    };

    const extension = file.name.split('.').pop().toLowerCase();
    if (extension === 'stl' || extension === 'fbx') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
});

function loadModel(contents, fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    let loader;

    switch (extension) {
        case 'obj':
            loader = new OBJLoader();
            currentModel = loader.parse(contents);
            scene.add(currentModel);
            updateModelInfo(currentModel);
            break;
        case 'stl':
            loader = new STLLoader();
            const geometry = loader.parse(contents);
            const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
            currentModel = new THREE.Mesh(geometry, material);
            scene.add(currentModel);
            updateModelInfo(currentModel);
            break;
        case 'fbx':
            if (typeof pako === 'undefined') {
                console.error('pako is not defined. This is a dependency for FBXLoader.');
            }
            loader = new FBXLoader();
            currentModel = loader.parse(contents);
            scene.add(currentModel);
            updateModelInfo(currentModel);
            break;
        default:
            console.error('Unsupported file format:', extension);
            return;
    }
}

function updateModelInfo(model) {
    let vertices = 0;
    let faces = 0;
    let rightTriangles = 0;

    model.traverse((child) => {
        if (child.isMesh) {
            const geometry = child.geometry;
            if (geometry.isBufferGeometry) {
                vertices += geometry.attributes.position.count;

                if (geometry.index) {
                    faces += geometry.index.count / 3;
                    rightTriangles += countRightTriangles(geometry);
                } else {
                    faces += geometry.attributes.position.count / 3;
                    rightTriangles += countRightTriangles(geometry);
                }
            }
        }
    });

    document.getElementById('vertices').textContent = vertices.toLocaleString();
    document.getElementById('faces').textContent = faces.toLocaleString();
    document.getElementById('right-triangles').textContent = rightTriangles.toLocaleString();
}

function countRightTriangles(geometry) {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    let count = 0;
    const epsilon = 1e-5;

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();

    if (indices) {
        for (let i = 0; i < indices.count; i += 3) {
            const iA = indices.getX(i);
            const iB = indices.getX(i + 1);
            const iC = indices.getX(i + 2);

            vA.fromBufferAttribute(positions, iA);
            vB.fromBufferAttribute(positions, iB);
            vC.fromBufferAttribute(positions, iC);

            if (isRightTriangle(vA, vB, vC, epsilon)) {
                count++;
            }
        }
    } else {
        for (let i = 0; i < positions.count; i += 3) {
            vA.fromBufferAttribute(positions, i);
            vB.fromBufferAttribute(positions, i + 1);
            vC.fromBufferAttribute(positions, i + 2);

            if (isRightTriangle(vA, vB, vC, epsilon)) {
                count++;
            }
        }
    }
    return count;
}

function isRightTriangle(p1, p2, p3, epsilon) {
    const d1 = p1.distanceToSq(p2);
    const d2 = p2.distanceToSq(p3);
    const d3 = p3.distanceToSq(p1);

    return Math.abs((d1 + d2) - d3) < epsilon ||
           Math.abs((d2 + d3) - d1) < epsilon ||
           Math.abs((d3 + d1) - d2) < epsilon;
}
