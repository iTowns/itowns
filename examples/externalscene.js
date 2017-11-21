/* global itowns, THREE, document, renderer */
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

var scene = new THREE.Scene();

// iTowns namespace defined here
var viewerDiv = document.getElementById('viewerDiv');
var globeView = new itowns.GlobeView(
        viewerDiv, positionOnGlobe, { scene3D: scene, renderer: renderer });

globeView.mainLoop.name = 'external-ML';

itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(globeView.baseLayer.addColorLayer);
itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT.json').then(globeView.baseLayer.addElevationLayer);

exports.globeView = globeView;
exports.scene = scene;
