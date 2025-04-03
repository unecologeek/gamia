// This file initializes the Three.js scene, camera, and renderer, and integrates the Globe and Game modules.

import * as THREE from 'three';
import Globe from './js/Globe/Globe.js';
import Game from './js/Game.js';

let scene, camera, renderer, globe, game;

function initThreeJS() {
    // Create the scene
    scene = new THREE.Scene();

    // Set up the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Set up the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('globe-container').appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start the animation loop
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function init() {
    const container = document.getElementById('globe-container');

    // Initialize the Globe
    globe = new Globe(container);
    globe.loadCountries().then(() => {
        // Initialize the Game once the globe is ready
        game = new Game(globe);
        game.start();
    }).catch(error => {
        console.error('Error loading countries:', error);
    });
}

document.addEventListener('DOMContentLoaded', init);