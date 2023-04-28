import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.149.0/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from "https://unpkg.com/three@0.138.0/examples/jsm/controls/OrbitControls.js"
import * as THREE from "https://cdn.skypack.dev/three@0.88.0";

// load computer glb using threejs, and put in div id=3d 
var scene = new THREE.Scene();

const canvas = document.querySelector('.hero-canvas');
var renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setClearColor(0x000000, 1);
// black fog
scene.fog = new THREE.Fog(0x000000, 1, 350000);
// get width of canvas
var divWidth = canvas.clientWidth;
var divHeight = canvas.clientHeight;
renderer.setSize( divWidth, divHeight );

var vertexHeight = 15000,
    planeDefinition = 100,
    planeSize = 1245000;

var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 400000)
camera.position.z = 10000;
camera.position.y = 50000;

// look at a downward angle to the right
camera.rotation.x = -0.61;

var planeGeo = new THREE.PlaneGeometry(planeSize, planeSize, planeDefinition, planeDefinition);
var plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
    color: 0xaaaaaa,
    wireframe: true,
    wireframeLinewidth: 10
}));
plane.rotation.x -= Math.PI * .5;

scene.add(plane);

updatePlane();

function updatePlane() {
    console.log(planeGeo)
    for (var i = 0; i < planeGeo.vertices.length; i++) {
        planeGeo.vertices[i].z += Math.random() * vertexHeight * 1.5 - vertexHeight;
        planeGeo.vertices[i]._myZ = planeGeo.vertices[i].z
    }
};

render();

var count = 0
function render() {
    requestAnimationFrame(render);
    // camera.position.z -= 150;
    var x = camera.position.x;
    var z = camera.position.z;

    for (var i = 0; i < planeGeo.vertices.length; i++) {
        var z = +planeGeo.vertices[i].z;
        var randomOffset = (Math.random() - 0.5) * 10; // generates a random number between -5 and 5
        planeGeo.vertices[i].z = Math.sin(( i + count * 0.000002)) * (planeGeo.vertices[i]._myZ - (planeGeo.vertices[i]._myZ* 0.4)) + randomOffset;
        plane.geometry.verticesNeedUpdate = true;
    
        count += 0.1
    }

    renderer.render(scene, camera);
}

// on resize
window.addEventListener('resize', function() {
    var width = window.innerWidth;
    var height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

