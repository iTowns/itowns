/* global itowns, document, renderer, THREE, setupLoadingScreen */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };
var promises = [];
var effect;

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });

// Eye separation value
var eyeSep = 0.064;

// Save StereoCamera update function
var fnUpdateStereoCamera = itowns.THREE.StereoCamera.prototype.update;

setupLoadingScreen(viewerDiv, globeView);

itowns.THREE.StereoCamera.prototype.update = function _update(camera) {
    this.cameraL.far = camera.far;
    this.cameraR.far = camera.far;
    this.cameraL.layers = camera.layers;
    this.cameraR.layers = camera.layers;
    this.eyeSep = eyeSep;
    fnUpdateStereoCamera.bind(this)(camera);
};

function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

/* eslint-disable no-unused-vars */
function updateEyeSep(value) {
    document.getElementById('eyeSepValue').innerHTML = value;
    eyeSep = value;

    if (!effect) return;

    globeView.notifyChange(true);
}

function disableEffect() {
    if (effect && effect.dispose) {
        effect.dispose();
    }

    effect = null;
    globeView.render = null;

    globeView.notifyChange(true);
}

function enableEffect(_eff) {
    var size;
    var g = globeView.mainLoop.gfxEngine;
    var r = g.renderer;

    if (effect) {
        disableEffect();
    }

    effect = _eff;
    size = globeView.mainLoop.gfxEngine.getWindowSize();
    effect.setSize(size.x, size.y);

    globeView.render = function render() {
        r.clear();
        effect.render(globeView.scene, globeView.camera.camera3D);
    };

    globeView.notifyChange(true);
}

/**
 * Activate an anaglyph effect to the view. With a pair of red/blue glasses, the
 * user can see the scene in 3D. See https://en.wikipedia.org/wiki/Anaglyph_3D
 * for more information about this effect.
 */
function enableAnaglyph() {
    var _eff;
    if (effect instanceof THREE.AnaglyphEffect) return;
    _eff = new THREE.AnaglyphEffect(globeView.mainLoop.gfxEngine.renderer,
        globeView.camera.camera3D);
    enableEffect(_eff);
}

/**
 * Activate a parallax effect to the view. With a pair of polarized glasses, the
 * user can see the scene in 3D. This effect works better on an adapted screen.
 * See https://en.wikipedia.org/wiki/Polarized_3D_system for more information
 * about this effect.
 */
function enableParallax() {
    var _eff;
    if (effect instanceof THREE.ParallaxBarrierEffect) return;
    _eff = new THREE.ParallaxBarrierEffect(globeView.mainLoop.gfxEngine.renderer,
        globeView.camera.camera3D);
    enableEffect(_eff);
}

/**
 * Activate a stereo effect to the view.
 */
function enableStereo() {
    var _eff;
    if (effect instanceof THREE.StereoEffect) return;
    _eff = new THREE.StereoEffect(globeView.mainLoop.gfxEngine.renderer,
        globeView.camera.camera3D);
    enableEffect(_eff);
}

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
