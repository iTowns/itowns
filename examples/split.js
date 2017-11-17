/* global itowns, document, renderer, Promise */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 3.36, latitude: 51.22, altitude: 480000 };

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var view = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });

var promises = [];

var orthoLayer;
var osmLayer;
var splitSlider;
var splitPosition;
var xD;

function addLayerCb(layer) {
    return view.addLayer(layer);
}
// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb).then(function _(l) { orthoLayer = l; }));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/OPENSM.json').then(addLayerCb).then(function _(l) { osmLayer = l; }));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb);
itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb);

// Slide handling
splitPosition = 0.5 * window.innerWidth;
xD = 0;
function splitSliderMove(evt) {
    var s = (evt.clientX - xD) / splitSlider.parentElement.offsetWidth;
    splitSlider.style.left = (100.0 * s) + '%';
    splitPosition = s * window.innerWidth;
    view.notifyChange(true);
}

function mouseDown(evt) {
    xD = evt.clientX - splitSlider.offsetLeft;
    window.addEventListener('mousemove', splitSliderMove, true);
}

function mouseUp() {
    window.removeEventListener('mousemove', splitSliderMove, true);
}

function changeLayerVisibility(ortho, osm) {
    var material;
    var orthoIndex;
    var opensmIndex;

    view.scene.traverse(function _(obj) {
        if (obj.material && obj.material.setLayerVisibility && obj.material.visible) {
            material = obj.material;
            orthoIndex = material.indexOfColorLayer(orthoLayer.id);
            opensmIndex = material.indexOfColorLayer(osmLayer.id);

            material.setLayerVisibility(orthoIndex, ortho);
            material.setLayerVisibility(opensmIndex, osm);
        }
    });
}
splitSlider = document.getElementById('splitSlider');
document.getElementById('splitSlider').addEventListener('mousedown', mouseDown, false);
window.addEventListener('mouseup', mouseUp, false);

// Rendering code
function splitRendering() {
    var g = view.mainLoop.gfxEngine;
    var r = g.renderer;

    r.setScissorTest(true);

    // render ortho layer on the left
    changeLayerVisibility(true, false);

    r.setScissor(0, 0, splitPosition + 2, window.innerHeight);
    g.renderView(view);

    // render osm layer on the right
    changeLayerVisibility(false, true);

    r.setScissor(splitPosition + 2, 0, window.innerWidth - splitPosition - 2, window.innerHeight);
    g.renderView(view);
}

// Override default rendering method when color layers are ready
Promise.all(promises).then(function _() { view.render = splitRendering; });

exports.view = view;
exports.initialPosition = positionOnGlobe;
