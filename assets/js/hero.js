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
    wireframeLinewidth: 1 
}));
plane.rotation.x -= Math.PI * .5;

var plane2Geo = new THREE.PlaneGeometry(planeSize, planeSize, planeDefinition, planeDefinition);
var plane2 = new THREE.Mesh(plane2Geo, new THREE.MeshBasicMaterial({
    color: 0x333333,
    wireframe: true,
    wireframeLinewidth: 1 
}));
plane2.position.y = -10000; 
plane2.position.x = 7000;
plane2.rotation.x -= Math.PI * .5;

var plane3Geo = new THREE.PlaneGeometry(planeSize, planeSize, planeDefinition, planeDefinition);
var plane3 = new THREE.Mesh(plane3Geo, new THREE.MeshBasicMaterial({
    color: 0x666666,
    wireframe: true,
    wireframeLinewidth: 1
}));
plane3.position.y = -20000;
plane3.position.x = 10000;
plane3.rotation.x -= Math.PI * .5;

scene.add(plane);
scene.add(plane2);
scene.add(plane3);

updatePlane();
updatePlane2();
updatePlane3();


function updatePlane() {
    console.log(planeGeo)
    for (var i = 0; i < planeGeo.vertices.length; i++) {
        planeGeo.vertices[i].z += Math.random() * vertexHeight * 1.5 - vertexHeight;
        planeGeo.vertices[i]._myZ = planeGeo.vertices[i].z
    }
};

function updatePlane2() {
    for (var i = 0; i < plane2Geo.vertices.length; i++) {
        plane2Geo.vertices[i].z += Math.random() * vertexHeight * 1.5 - vertexHeight;
        plane2Geo.vertices[i]._myZ = plane2Geo.vertices[i].z
    }
};

function updatePlane3() {
    for (var i = 0; i < plane3Geo.vertices.length; i++) {
        plane3Geo.vertices[i].z += Math.random() * vertexHeight * 1.5 - vertexHeight;
        plane3Geo.vertices[i]._myZ = plane3Geo.vertices[i].z
    }
};

camera.position.z = 600000;
// camera.position.z = -300000;

render();

var count = 0
function render() {
    requestAnimationFrame(render);
    
    // update vertices of first plane
    for (var i = 0; i < planeGeo.vertices.length; i++) {
        var z = +planeGeo.vertices[i].z;
        var randomOffset = (Math.random() - 0.5) * 10;
        planeGeo.vertices[i].z = Math.sin(( i + count * 0.000001)) * (planeGeo.vertices[i]._myZ - (planeGeo.vertices[i]._myZ* 0.4)) + randomOffset;
        plane.geometry.verticesNeedUpdate = true;
    
        count += 0.1
    }

    // update vertices of second plane
    for (var i = 0; i < plane2Geo.vertices.length; i++) {
        var z = +plane2Geo.vertices[i].z;
        var randomOffset = (Math.random() - 0.5) * 10;
        plane2Geo.vertices[i].z = Math.cos(( i + count * 0.00000075)) * (plane2Geo.vertices[i]._myZ - (plane2Geo.vertices[i]._myZ* 0.5)) + randomOffset;
        plane2.geometry.verticesNeedUpdate = true;
    
        count += 0.1
    }

    // update vertices of third plane
    for (var i = 0; i < plane3Geo.vertices.length; i++) {
        var z = +plane3Geo.vertices[i].z;
        var randomOffset = (Math.random() - 0.5) * 10;
        plane3Geo.vertices[i].z = Math.sin(( i + count * 0.0000005)) * (plane3Geo.vertices[i]._myZ - (plane3Geo.vertices[i]._myZ* 0.6)) + randomOffset;
        plane3.geometry.verticesNeedUpdate = true;

        count += 0.1
    }

    // move camera forward if not at very edge
    if (camera.position.z > -300000){
        camera.position.z -= 20;
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

