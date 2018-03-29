/* global itowns, document, setupLoadingScreen */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 2.351323, latitude: 48.856712, altitude: 25000000 };

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');
var promises = [];

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { noControls: true });
var flyControls = new itowns.FlyControls(globeView, { focusOnClick: true });
flyControls.moveSpeed = 1000;

setupLoadingScreen(viewerDiv, globeView);

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(globeView.addLayer('./layers/JSONLayers/Ortho.json'));
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(globeView.addLayer('./layers/JSONLayers/WORLD_DTM.json'));
promises.push(globeView.addLayer('./layers/JSONLayers/IGN_MNT_HIGHRES.json'));

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
