// Cameras
var prevCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var viewCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var nextCamera = new PhotogrammetricCamera.PhotogrammetricCamera();
var textureCamera = new PhotogrammetricCamera.PhotogrammetricCamera();

var viewCameraGUI = {}, textureCameraGUI = {};
var screenQuads = new THREE.Group();
screenQuads.name = 'ScreenQuads';
var scene, renderer;

// Depth maps
const numTextures = 10;
const maxTextures = 40;
const numMaxDepthMapsUpdate = 5;
const updateDepthMapsInterval = 200;
var depthMapRenderTarget, depthMapArray, depthMapArrayRenderTarget;
const depthMapHeight = 1024, depthMapWidth = 1024;

depthMapArray = new THREE.DataTexture2DArray();
depthMapArray.format = THREE.DepthFormat;
depthMapArray.type = THREE.UnsignedShortType;
depthMapArray.image.depth = maxTextures;
depthMapArrayRenderTarget = new THREE.WebGLRenderTarget( depthMapWidth, depthMapHeight, maxTextures ); // window.innerWidth, window.innerHeight );
depthMapArrayRenderTarget.texture.format = THREE.RGBFormat;
depthMapArrayRenderTarget.texture.type = THREE.UnsignedByteType;
depthMapArrayRenderTarget.texture.minFilter = THREE.NearestFilter;
depthMapArrayRenderTarget.texture.magFilter = THREE.NearestFilter;
depthMapArrayRenderTarget.texture.generateMipmaps = false;
depthMapArrayRenderTarget.stencilBuffer = false;
depthMapArrayRenderTarget.depthBuffer = true;
depthMapArrayRenderTarget.depthTexture = depthMapArray;


// Materials
var buildingsMaterial, pointsMaterial, sphereMaterial;
var textures;

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
    screenQuads.children.forEach(quad => quad.setScreenSize( width , height ));
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

    // Turn off texturing pyramids visibility if it's on
    if (pyramidsVisibility.texturingVisible)
        updateTexturingPyramidsVisibility(false);

    textureCamera.copy(camera);
    textureCamera.year = camera.year;
    textureCamera.number = camera.number;
    textureCamera.renderTarget = camera.renderTarget;
    textureCamera.updateProjectionMatrix();

    // Sphere
    if (sphereMaterial.isPCMultiTextureMaterial)
        sphereMaterial.setTextureCameras(camera, textures[camera.name] || uvTexture, renderer);
    else
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
            viewCamera.set(nextCamera);
            prevCamera.timestamp = undefined;
            nextCamera.timestamp = undefined;
            view.controls.enabled = true;
        }
        viewCamera.near = 1;
        //viewCamera.far = 10000;
        viewCamera.updateProjectionMatrix();
        animateInterpolation();
    }
}

function testCoherenceBetweenMaterials() {  // For now this test doesn't include the sphere material
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

// HUD
function addScreenQuad(name) {
    const screenQuad = new ScreenQuad({
        height: 0.19,
        aspect: 16/9.0,
        top: 1 - (0.01+0.2*screenQuads.children.length) - 0.19,
        left: 0.01,
        texture: uvTexture
    });
    const size = new THREE.Vector2();
    renderer.getSize(size);
    screenQuad.setScreenSize( size.x , size.y );
    screenQuad.name = name;
    screenQuads.add(screenQuad);
    return screenQuad;
}

function createDepthMap(textureCamera) {

    let renderTarget;
    if (!renderTarget) {
        renderTarget = new THREE.WebGLRenderTarget(1024, 1024); // window.innerWidth, window.innerHeight );
        renderTarget.texture.format = THREE.RGBFormat;
        renderTarget.texture.type = THREE.UnsignedByteType;
        renderTarget.texture.minFilter = THREE.NearestFilter;
        renderTarget.texture.magFilter = THREE.NearestFilter;
        renderTarget.texture.generateMipmaps = false;
        renderTarget.stencilBuffer = false;
        renderTarget.depthBuffer = true;
        renderTarget.depthTexture = new THREE.DataTexture();
        renderTarget.depthTexture.format = THREE.DepthFormat;
        renderTarget.depthTexture.type = THREE.UnsignedIntType;
    }

    const quadsVisible = screenQuads.visible;
    screenQuads.visible = false;

    const pointCloud = view.scene.children.find(element => element.name == 'PointCloud');
    var pointCloudVisible;
    if (pointCloud) {
        pointCloudVisible = pointCloud.visible;
        pointCloud.visible = false;
    }

    var indexes = [];
    var cameras = [];
    var numberUpdates = (numTextures < numMaxDepthMapsUpdate) ? numTextures : numMaxDepthMapsUpdate;
    
    if (pointsMaterial) {
        if (pointsMaterial.isPCMultiTextureSpriteMaterial) {
            pointsMaterial.depthMapArray = null;

            numberUpdates = (numberUpdates < pointsMaterial.allCameras.length) ? numberUpdates : pointsMaterial.allCameras.length;
            for (var i = 0; i < numberUpdates; i++) {
                indexes.push(pointsMaterial.allCameras[i].structure.index);
                cameras.push(pointsMaterial.allCameras[i].cam);
            }

        } else {
            pointsMaterial.depthMap = null;
        }
    }
    
    if (buildingsMaterial) {
        if (buildingsMaterial.isPCMultiTextureMaterial) {
            buildingsMaterial.depthMapArray = null;

            if (!indexes.length) {
                numberUpdates = (numberUpdates < buildingsMaterial.allCameras.length) ? numberUpdates : buildingsMaterial.allCameras.length;
                for (var i = 0; i < numberUpdates; i++) {
                    indexes.push(buildingsMaterial.allCameras[i].structure.index);
                    cameras.push(buildingsMaterial.allCameras[i].cam);
                }
            }

        } else {
            buildingsMaterial.depthMap = null;
        }
    }

    if (sphereMaterial) {
        if (sphereMaterial.isPCMultiTextureMaterial) {
            sphereMaterial.depthMapArray = null;

            if (!indexes.length) {
                numberUpdates = (numberUpdates < sphereMaterial.allCameras.length) ? numberUpdates : sphereMaterial.allCameras.length;
                for (var i = 0; i < numberUpdates; i++) {
                    indexes.push(sphereMaterial.allCameras[i].structure.index);
                    cameras.push(sphereMaterial.allCameras[i].cam);
                }
            }

        } else {
            sphereMaterial.depthMap = null;
        }
    }

    const cameraMask = textureCamera.layers.mask;
    textureCamera.layers.mask = 51;

    // Simple depth texture
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    renderer.render(view.scene, textureCamera);
    renderer.setRenderTarget(null);

    // Texture2DArray depth texture
    if ((pointsMaterial && pointsMaterial.isPCMultiTextureSpriteMaterial) || (buildingsMaterial && buildingsMaterial.isPCMultiTextureMaterial) || (sphereMaterial && sphereMaterial.isPCMultiTextureMaterial)) {

        for (var i = 0; i < numberUpdates; i++) {
            const index = indexes[i];
            const camera = cameras[i];

            const cameraMask = camera.layers.mask;
            camera.layers.mask = 51;

            renderer.setRenderTarget(depthMapArrayRenderTarget, index);
            renderer.clear();
            renderer.render(view.scene, camera);
            renderer.setRenderTarget(null);

            camera.layers.mask = cameraMask;
        }        
    }

    textureCamera.layers.mask = cameraMask;

    if (pointsMaterial) {
        if (pointsMaterial.isPCMultiTextureSpriteMaterial) {
            pointsMaterial.depthMapArray = depthMapArrayRenderTarget.depthTexture;
        } else {
            pointsMaterial.depthMap = renderTarget.depthTexture;
        }
    }
    
    if (buildingsMaterial) {
        if (buildingsMaterial.isPCMultiTextureMaterial) {
            buildingsMaterial.depthMapArray = depthMapArrayRenderTarget.depthTexture;
        } else {
            buildingsMaterial.depthMap = renderTarget.depthTexture;
        }
    }

    if (sphereMaterial) {
        if (sphereMaterial.isPCMultiTextureMaterial) {
            sphereMaterial.depthMapArray = depthMapArrayRenderTarget.depthTexture;
        } else {
            sphereMaterial.depthMap = renderTarget.depthTexture;
        }
    }
    
    screenQuads.visible = quadsVisible;
    if (pointCloud) {
        pointCloud.visible = pointCloudVisible;
    }

    updateScreenQuads(renderTarget);
    view.notifyChange(true);
}

function updateScreenQuads(renderTarget) {
    screenQuads.children[0].material.uniforms.uTexture.value = renderTarget.texture ? renderTarget.texture : uvTexture;
    screenQuads.children[1].material.uniforms.uTexture.value = renderTarget.depthTexture ? renderTarget.depthTexture : uvTexture;
}
