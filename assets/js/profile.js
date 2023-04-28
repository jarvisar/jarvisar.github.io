import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.149.0/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from "https://unpkg.com/three@0.138.0/examples/jsm/controls/OrbitControls.js"
import * as THREE from "https://cdn.skypack.dev/three@0.149.0";

// load computer glb using threejs, and put in div id=3d 
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 14, 1, 0.1, 1000 );
camera.position.x = 3.5;
camera.position.y = 1;
camera.position.z = 3.5;

const canvas = document.querySelector('.profile-container');
var renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
// get width of canvas
var divWidth = canvas.clientWidth;
renderer.setSize( divWidth, divWidth );

var size = 0.7125;
// create cube with texture from assets/img/profile-img.jpg
var geometry = new THREE.BoxGeometry( size, size, size );
var texture = new THREE.TextureLoader().load( 'assets/img/profile-img.jpg' );
var material = new THREE.MeshBasicMaterial( { map: texture } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

// ambient light
var light = new THREE.AmbientLight( 0xffffff ); // white light
scene.add( light );


// orbit controls
var controls = new OrbitControls( camera, canvas );
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.75;
controls.enablePan = false;

var animate = function () {
    requestAnimationFrame( animate );

    controls.update();

    renderer.render( scene, camera );
};

animate();