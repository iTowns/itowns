import * as THREE from 'three';

let isUserInteracting = false;
let onMouseDownMouseX = 0;
let onMouseDownMouseY = 0;
let lon = 90;
let onMouseDownLon = 0;
let lat = 0;
let onMouseDownLat = 0;
let phi = 0;
let theta = 0;
const target = new THREE.Vector3();

let camera;
let domElement;
const minFOV = 1;
const maxFOV = 90;

function PanoramaControls(scene, _camera, _domElement) {
    this.wtf = true;
    camera = _camera;
    domElement = _domElement;
    this.scene = scene;

    domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    domElement.addEventListener('mousemove', onDocumentMouseMove.bind(this), false);
    domElement.addEventListener('mouseup', onDocumentMouseUp, false);
    domElement.addEventListener('mousewheel', onDocumentMouseWheel.bind(this), false); // every other browser
    domElement.addEventListener('DOMMouseScroll', onDocumentMouseWheel.bind(this), false); // firefox
}

PanoramaControls.prototype.constructor = PanoramaControls;

Object.assign(PanoramaControls.prototype, THREE.EventDispatcher.prototype);

// PanoramaControls.prototype = Object.create(THREE.EventDispatcher.prototype);
// PanoramaControls.prototype.constructor = PanoramaControls;

function onDocumentMouseDown(event) {
    event.preventDefault();
    isUserInteracting = true;

    onMouseDownMouseX = event.clientX;
    onMouseDownMouseY = event.clientY;
    onMouseDownLon = lon;
    onMouseDownLat = lat;
}

function onDocumentMouseMove(event) {
    if (isUserInteracting === true) {
        const fovCorrection = camera.fov / maxFOV; // 1 at maxFOV
        lon = (onMouseDownMouseX - event.clientX) * 0.13 * fovCorrection + onMouseDownLon;
        lat = (event.clientY - onMouseDownMouseY) * 0.13 * fovCorrection + onMouseDownLat;

        this.update();
    }
}

function onDocumentMouseUp() {
    isUserInteracting = false;
}

function onDocumentMouseWheel(event) {
    event.preventDefault();
    event.stopPropagation();

    let delta = 0;
    if (event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
        delta = -event.wheelDelta * 0.1;
    } else if (event.detail !== undefined) { // Firefox
        delta = event.detail;
    }
    camera.fov += delta;
    camera.fov = Math.min(maxFOV, Math.max(minFOV, camera.fov));
    camera.updateProjectionMatrix();

    this.update();
}

PanoramaControls.prototype.updateCamera = function updateCamera() {
    camera.aspect = domElement.innerWidth / domElement.innerHeight;
    camera.updateProjectionMatrix();
};

PanoramaControls.prototype.update = function update() {
    lat = Math.max(-85, Math.min(85, lat));
    phi = THREE.Math.degToRad(90 - lat);
    theta = THREE.Math.degToRad(lon);
    target.x = camera.position.x + 500 * Math.sin(phi) * Math.cos(theta);
    target.y = camera.position.y + 500 * Math.cos(phi);
    target.z = camera.position.z + 500 * Math.sin(phi) * Math.sin(theta);

    // camera.position.set(0, 0, 0);
    // camera.position.copy(target).negate();
    camera.lookAt(target);

    this.dispatchEvent({ type: 'change' });
    this.scene.notifyChange(0, true);
};

export default PanoramaControls;
