// import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.149.0/examples/jsm/loaders/GLTFLoader'
// import { OrbitControls } from "https://unpkg.com/three@0.138.0/examples/jsm/controls/OrbitControls.js"
// import * as THREE from "https://cdn.skypack.dev/three@0.149.0";

// // load computer glb using threejs, and put in div id=3d 
// var scene = new THREE.Scene();
// var camera = new THREE.PerspectiveCamera( 14, 1, 0.1, 1000 );
// camera.position.x = 3.5;
// camera.position.y = 1;
// camera.position.z = 3.5;

// const canvas = document.querySelector('.profile-container');
// var renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
// // get width of canvas
// var divWidth = canvas.clientWidth;
// renderer.setSize( divWidth, divWidth );

// var size = 0.8;
// // create cube with texture from assets/img/profile-img.jpg
// var geometry = new THREE.BoxGeometry( size, size, size );
// var texture = new THREE.TextureLoader().load( 'assets/img/profile-img.jpg' );
// var material = new THREE.MeshBasicMaterial( { map: texture } );
// var cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

// // ambient light
// var light = new THREE.AmbientLight( 0xffffff ); // white light
// scene.add( light );

// // look at cube
// camera.lookAt(cube.position);

// var currentRotation = 0;
// var targetRotation = 0;
// var maxRotationSpeed = 1; // set the maximum rotation speed

// var animate = function () {
//     requestAnimationFrame(animate);


//     // rotate cube based on window.pageYOffset
//     targetRotation = window.pageYOffset * 0.001;
//     var rotationSpeed = (targetRotation - currentRotation) * 0.05;
//     rotationSpeed = Math.min(rotationSpeed, maxRotationSpeed);
//     rotationSpeed = Math.max(rotationSpeed, -maxRotationSpeed);
//     currentRotation += rotationSpeed;
//     cube.rotation.y = currentRotation;

//     renderer.render(scene, camera);
// };


// animate();
