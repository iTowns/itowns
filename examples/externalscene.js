/* global itowns, document, renderer */
const positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

const scene = new itowns.THREE.Scene();

// iTowns namespace defined here
const viewerDiv = document.getElementById('viewerDiv');
const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { scene3D: scene, renderer });

globeView.mainLoop.name = 'external-ML';

itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(result => globeView.addLayer(result));
itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT.json').then(result => globeView.addLayer(result));

exports.globeView = globeView;
exports.scene = scene;
