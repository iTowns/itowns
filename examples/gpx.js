/* global itowns, document, renderer, setupLoadingScreen */
// # Loading gpx file

// Define initial camera position
var positionOnGlobe = { longitude: 0.089, latitude: 42.8989, altitude: 80000 };

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });

setupLoadingScreen(viewerDiv, globeView);

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
globeView.addLayer('./layers/JSONLayers/Ortho.json');
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
globeView.addLayer('./layers/JSONLayers/WORLD_DTM.json');
globeView.addLayer('./layers/JSONLayers/IGN_MNT_HIGHRES.json');

exports.view = globeView;
