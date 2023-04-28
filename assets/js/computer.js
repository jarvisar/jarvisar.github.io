import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.149.0/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from "https://unpkg.com/three@0.138.0/examples/jsm/controls/OrbitControls.js"
import * as THREE from "https://cdn.skypack.dev/three@0.149.0";

// load computer glb using threejs, and put in div id=3d 
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 12, 1, 0.1, 1000 );
camera.position.x = 3.5;
camera.position.y = 1;
camera.position.z = 3.5;

var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
// get div height
var divHeight = document.getElementById("three-container").clientWidth;
renderer.setSize( divHeight, divHeight );
document.getElementById("three-container").appendChild( renderer.domElement );

var loader = new GLTFLoader();
loader.load( 'assets/models/computer.glb', function ( gltf ) {
  gltf.scene.traverse( child => {

    if ( child.material ) child.material.metalness = 0;
  });
  scene.add( gltf.scene );
}, undefined, function ( error ) {
    console.error( error );
} );

// ambient light
var light = new THREE.AmbientLight( 0xffffff ); // white light
scene.add( light );

// directional light
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(0, 1, 0); // set position
scene.add(directionalLight);

// directional light
var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 0, 1); // set position
scene.add(directionalLight);

// directional light
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(0, 1, -1); // set position
scene.add(directionalLight);

// directional light
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(1, 1, 0); // set position
scene.add(directionalLight);

// directional light
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(-1, 1, 0); // set position
scene.add(directionalLight);

// orbit controls
var controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.enableZoom = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI / 2.3;
controls.minPolarAngle = Math.PI / 2.3;


var animate = function () {
    requestAnimationFrame( animate );

    controls.update();

    renderer.render( scene, camera );
};

animate();