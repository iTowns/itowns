/* global itowns, document, renderer, setupLoadingScreen */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };
var promises = [];
var miniView;
var minDistance = 10000000;
var maxDistance = 30000000;

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');
var miniDiv = document.getElementById('miniDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });
setupLoadingScreen(viewerDiv, globeView);
function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Dont' instance mini viewer if it's Test env
if (!renderer) {
    miniView = new itowns.GlobeView(miniDiv, positionOnGlobe, {
        // `limit globe' subdivision level:
        // we're don't need a precise globe model
        // since the mini globe will always be seen from a far point of view (see minDistance above)
        maxSubdivisionLevel: 2,
        // Don't instance default controls since miniview's camera will be synced
        // on the main view's one (see globeView.addFrameRequester)
        noControls: true,
    });

    // Set a 0 alpha clear value (instead of the default '1')
    // because we want a transparent background for the miniglobe view to be able
    // to see the main view "behind"
    miniView.mainLoop.gfxEngine.renderer.setClearColor(0x000000, 0);

    // update miniview's camera with the globeView's camera position
    globeView.addFrameRequester(itowns.MAIN_LOOP_EVENTS.AFTER_RENDER, function updateMiniView() {
        // clamp distance camera from globe
        var distanceCamera = globeView.camera.camera3D.position.length();
        var distance = Math.min(Math.max(distanceCamera * 1.5, minDistance), maxDistance);
        var camera = miniView.camera.camera3D;
        // Update target miniview's camera
        camera.position.copy(globeView.controls.moveTarget()).setLength(distance);
        camera.lookAt(globeView.controls.moveTarget());
        miniView.notifyChange(true);
    });

    // Add one imagery layer to the miniview
    itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(function _(layer) { miniView.addLayer(layer); });
}

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
