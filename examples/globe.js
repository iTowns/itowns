/* global itowns, document, renderer */
// # Simple Globe viewer

// Define initial camera position
const positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
const viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
const globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer });

const promises = [];

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(result => globeView.addLayer(result)));
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(result => globeView.addLayer(result)));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(result => globeView.addLayer(result)));

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
