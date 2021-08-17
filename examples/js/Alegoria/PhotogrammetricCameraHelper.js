// Cameras
var prevCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var viewCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var nextCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var textureCamera = new PhotogrammetricCamera.PhotogrammetricCamera();

var viewCameraGUI = {}, textureCameraGUI = {};

var textureLoader = new THREE.TextureLoader();
const uvTexture = textureLoader.load('data/uv.jpg');

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
    pointsMaterial.setScreenSize(window.innerWidth, window.innerHeight);
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
    if (name.length > 30)
      name = name.substr(0,13)+'[..]'+name.substr(-13,13)
    viewCameraGUI.name = 'View: ' + name;

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
    if (name.length > 30)
      name = name.substr(0,13)+'[..]'+name.substr(-13,13)
    textureCameraGUI.name = 'Tex: ' + name;

    textureCamera.copy(camera);
    textureCamera.year = camera.year;
    textureCamera.number = camera.number;
    textureCamera.updateProjectionMatrix();

    // Turn off texturing pyramids visibility if it's on
    if (pyramidsVisibility.texturingVisible)
        updateTexturingPyramidsVisibility(false);

    // Sphere
    setMaterial(sphereMaterial, camera);

    // Buildings
    if (buildingsMaterial.isPCMultiTextureMaterial)
        buildingsMaterial.setTextureCameras(camera, textures[camera.name] || uvTexture, renderer);
    else
        setMaterial(buildingsMaterial, camera);

    // Points
    if (pointsMaterial.isPCNewMaterial || pointsMaterial.isPCSpriteMaterial)
        setMaterial(pointsMaterial, camera);
    else if (pointsMaterial.isPCMultiTextureSpriteMaterial)
        pointsMaterial.setTextureCameras(camera, textures[camera.name] || uvTexture, renderer);

    // Test coherence
    if (buildingsMaterial.isPCMultiTextureMaterial && pointsMaterial.isPCMultiTextureSpriteMaterial)
        testCoherenceBetweenMaterials();

    // Turn texturing pyramids visibility back on
    if (pyramidsVisibility.texturingVisible)
        updateTexturingPyramidsVisibility(true);
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
        //viewCamera.far = 10000;
        viewCamera.updateProjectionMatrix();
        //gui.updateCameras();
        animateInterpolation();
    }
}

function testCoherenceBetweenMaterials() {
    const pointsCameras = pointsMaterial.getTexturingCameras();
    const buildingsCameras = buildingsMaterial.getTexturingCameras();

    const quantityProblem = pointsCameras.length != buildingsCameras.length;
    if (quantityProblem) {
        console.error('Points and buildings material are diverging on the texture cameras\' selection.');
        return;
    }

    var indexProblem = false;
    var weightProblem = false;

    for (let i = 0; i < pointsCameras.length; i++) {

        indexProblem = pointsCameras[i].index != buildingsCameras[i].index;
        weightProblem = pointsCameras[i].weight != buildingsCameras[i].weight;

        if (indexProblem || weightProblem) {
            console.error('Points and buildings material are diverging on the texture cameras\' selection.');
            return;
        }
    }
}

function updateTexturingPyramidsVisibility(value) {

    if (buildingsMaterial.isPCNewMaterial && (pointsMaterial.isPCNewMaterial || pointsMaterial.isPCSpriteMaterial)) {

        const camName = textureCamera.name;
        const texCam = orientedImageLayer.cameras.children.find( c => c.name == camName );
        if (texCam == undefined)
            return;
        else
            texCam.visible = value;

    } else if (pointsMaterial.isPCMultiTextureSpriteMaterial) {

        const texCameras = pointsMaterial.getTexturingCameras();
        texCameras.forEach( c => c.visible = value );

    } else if (buildingsMaterial.isPCMultiTextureMaterial) {

        const texCameras = buildingsMaterial.getTexturingCameras();
        texCameras.forEach( c => c.visible = value );
    }
}

function updateAllPyramidsVisibility(value) {
    orientedImageLayer.cameras.children.forEach( c => c.visible = value );
}