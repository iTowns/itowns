/* global itowns */

// set object position to the coordinate
// set object ENH orientation: X to the east, Y (green) to the north, Z (blue) look to the sky.
function placeObjectFromCoordinate(object, coord) {
    // set object position to the coordinate
    coord.toVector3(object.position);
    // set ENH orientation, looking at the sky (Z axis), so Y axis look to the north..
    object.lookAt(coord.geodesicNormal.clone().add(object.position));
}

function createTexturedPlane(textureUrl, opacity) {
    const texture = new itowns.THREE.TextureLoader().load(textureUrl);
    const geometry = new itowns.THREE.PlaneGeometry(1, 1, 32);
    const material = new itowns.THREE.MeshBasicMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        opacity: opacity,
    });
    return new itowns.THREE.Mesh(geometry, material);
}

function transformTexturedPlane(camera, distance, plane) {
    const Yreel = 2 * Math.tan(itowns.THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    const Xreel = camera.aspect * Yreel;

    // set position and scale
    plane.scale.set(Xreel, Yreel, 1);
    plane.position.set(0, 0, -distance);

    plane.updateMatrixWorld();
}

// eslint-disable-next-line no-unused-vars
function initCamera(view, image, coord, EnhToOrientationUp, EnhToOrientationLookAt, rotMatrix,
    orientationToCameraUp, orientationToCameraLookAt, distance, size, focale) {
    const fov = itowns.THREE.MathUtils.radToDeg((2 * Math.atan((size[1] / 2) / focale)));
    const coordView = coord.as(view.referenceCrs);

    // create 'local space', with the origin placed on 'coord',
    // with Y axis to the north, X axis to the east and Z axis as the geodesic normal.
    const localSpace = new itowns.THREE.Object3D();
    view.scene.add(localSpace);
    placeObjectFromCoordinate(localSpace, coordView);

    // add second object : 'oriented image'
    const orientedImage = new itowns.THREE.Object3D();
    // setup initial convention orientation.
    orientedImage.up.copy(EnhToOrientationUp);
    orientedImage.lookAt(EnhToOrientationLookAt);

    // place the 'oriented image' in the 'local space'
    localSpace.add(orientedImage);

    // apply rotation
    const quaternion = new itowns.THREE.Quaternion().setFromRotationMatrix(rotMatrix);
    orientedImage.quaternion.multiply(quaternion);
    // orientedImage.updateMatrixWorld();

    // create a THREE JS Camera
    const camera = new itowns.THREE.PerspectiveCamera(fov, size[0] / size[1], distance / 2, distance * 2);
    camera.up.copy(orientationToCameraUp);
    camera.lookAt(orientationToCameraLookAt);

    orientedImage.add(camera);

    localSpace.updateMatrixWorld(true);
    return camera;
}

// eslint-disable-next-line no-unused-vars
function setupPictureFromCamera(camera, imageUrl, opacity, distance) {
    // create a textured plane, representing the picture.
    const plane = createTexturedPlane(imageUrl, opacity);
    camera.add(plane);

    transformTexturedPlane(camera, distance, plane);

    return plane;
}

// set camera settings to view.camera,
// BUT keep the geodesic normal as Up vector
// eslint-disable-next-line no-unused-vars
function setupViewCameraLookingAtObject(camera, coord, objectToLookAt) {
    camera.position.copy(coord);
    camera.up.copy(coord.geodesicNormal);
    camera.lookAt(objectToLookAt.getWorldPosition());
}

// set camera settings to view.camera, even the up vector !
// eslint-disable-next-line no-unused-vars
function setupViewCameraDecomposing(view, camera) {
    let upWorld;
    camera.matrixWorld.decompose(view.camera3D.position, view.camera3D.quaternion, view.camera3D.scale);

    // setup up vector
    upWorld = camera.localToWorld(camera.up.clone());
    upWorld = view.camera3D.position.clone().sub(upWorld);
    view.camera3D.up.copy(upWorld);
}

// add a camera helper to debug camera position..
// eslint-disable-next-line no-unused-vars
function addCameraHelper(view, camera) {
    const cameraHelper = new itowns.THREE.CameraHelper(camera);
    view.scene.add(cameraHelper);
    cameraHelper.updateMatrixWorld(true);
}

// eslint-disable-next-line no-unused-vars
function setupPictureUI(menu, pictureInfos, plane, updateDistanceCallback, view, min, max) {
    const orientedImageGUI = menu.gui.addFolder('Oriented Image');
    orientedImageGUI.add(pictureInfos, 'distance', min, max).name('Distance').onChange(function distanceChanged(value) {
        pictureInfos.distance = value;
        updateDistanceCallback();
        view.notifyChange();
    });
    orientedImageGUI.add(pictureInfos, 'opacity', 0, 1).name('Opacity').onChange(function opacityChanged(value) {
        plane.material.opacity = value;
        view.notifyChange();
    });
}
