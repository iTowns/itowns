/* global itowns, THREE, document, renderer, setupLoadingScreen */
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

var scene = new THREE.Scene();

// iTowns namespace defined here
var viewerDiv = document.getElementById('viewerDiv');
var globeView = new itowns.GlobeView(
        viewerDiv, positionOnGlobe, { scene3D: scene, renderer: renderer });
setupLoadingScreen(viewerDiv, globeView);

globeView.mainLoop.name = 'external-ML';

globeView.addLayer('./layers/JSONLayers/Ortho.json');
globeView.addLayer('./layers/JSONLayers/IGN_MNT.json');

exports.globeView = globeView;
exports.scene = scene;
