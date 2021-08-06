// Cameras
var prevCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var viewCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var nextCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var textureCamera = new PhotogrammetricCamera.PhotogrammetricCamera();

/* callbacks */
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    renderer.setSize(width, height);
    viewCamera.aspect = aspect;
    viewCamera.updateProjectionMatrix();
    prevCamera.aspect = aspect;
    prevCamera.updateProjectionMatrix();
    nextCamera.aspect = aspect;
    nextCamera.updateProjectionMatrix();
}

/* Keyboard events */
function setMaterial(material, camera) {
    material.map = textures[camera.name] || uvTexture;
    material.setCamera(camera);
}

function setView(camera) {
    if (!camera) return;

    // update view camera name
    var name = camera.name;
    console.log('View:', name);
    // if (name.length > 30)
    //   name = name.substr(0,13)+'[..]'+name.substr(-13,13)
    // viewCameraGUI.name = 'View: ' + name;

    prevCamera.set(viewCamera);
    nextCamera.set(camera);
    prevCamera.timestamp = 0; // timestamp will be set in the update callback
    nextCamera.zoom = viewCamera.zoom; // keep the current zoom
    onWindowResize();
    view.controls.enabled = false;
}

function setTexture(camera) {
    if (!camera) return;

    // update texture camera name
    var name = camera.name;
    console.log('Texture:', name);
    // if (name.length > 30)
    //   name = name.substr(0,13)+'[..]'+name.substr(-13,13)
    // textureCameraGUI.name = 'Tex: ' + name;

    textureCamera.copy(camera);
    textureCamera.updateProjectionMatrix();

    setMaterial(textureMaterial, textureCamera);
}

function setCamera(camera) {
    setView(camera);
    setTexture(camera);
}

function getCamera(camera, delta = 0) {
    const array = cameras.children;
    const index = array.findIndex(cam => cam.name == camera.name);
    return array[(index + delta + array.length) %  array.length];
}


// Camera interpolation

var duration = 2.0;
var interpolating = false;
var counter = 0;
function interpolateCameras(timestamp) {

    if (prevCamera.timestamp !== undefined) {
        if (prevCamera.timestamp == 0) {
            prevCamera.timestamp = timestamp;
            nextCamera.timestamp = prevCamera.timestamp + 1000 * duration;
        }
        if (timestamp < nextCamera.timestamp) {
            const t = 0.001 * (timestamp - prevCamera.timestamp) / duration;
            viewCamera.set(prevCamera).lerp(nextCamera, t);
        } else {
            //console.log('finish interpolation');
            viewCamera.set(nextCamera);
            prevCamera.timestamp = undefined;
            nextCamera.timestamp = undefined;
            //orbitControls.saveState();
            view.controls.enabled = true;
        }
        viewCamera.near = 1;
        viewCamera.far = 10000;
        viewCamera.updateProjectionMatrix();
        //gui.updateCameras();
        animateInterpolation();
    }
}