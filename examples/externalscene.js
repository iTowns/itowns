/* global itowns, THREE, document, renderer */
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

var scene = new THREE.Scene();

// iTowns namespace defined here
var viewerDiv = document.getElementById('viewerDiv');
var globeView = new itowns.GlobeView(
        viewerDiv, positionOnGlobe, { scene3D: scene, renderer: renderer });

globeView.mainLoop.name = 'external-ML';

function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb);
itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT.json').then(addLayerCb);

exports.globeView = globeView;
exports.scene = scene;
