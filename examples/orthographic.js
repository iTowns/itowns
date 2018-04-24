/* global itowns, setupLoadingScreen */
// # Orthographic viewer

// Define geographic extent: CRS, min/max X, min/max Y
var extent = new itowns.Extent(
    'EPSG:3857',
    -20026376.39, 20026376.39,
    -20048966.10, 20048966.10);

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate PlanarView
var view = new itowns.PlanarView(viewerDiv, extent, { maxSubdivisionLevel: 10 });

// eslint-disable-next-line no-new
new itowns.PlanarControls(view, {
    // We do not want the user to zoom out too much
    maxAltitude: 40000000,
    // We want to keep the rotation disabled, to only have a view from the top
    enableRotation: false,
    // Faster zoom in/out speed
    zoomInFactor: 0.5,
    zoomOutFactor: 0.5,
    // Don't zoom too much on smart zoom
    smartZoomHeightMax: 100000,
});

// Turn in the right angle
view.camera.camera3D.rotateZ(-Math.PI / 2);

setupLoadingScreen(viewerDiv, view);

// By default itowns' tiles geometry have a "skirt" (ie they have a height),
// but in case of orthographic we don't need this feature, so disable it
view.tileLayer.disableSkirt = true;

// Add a TMS imagery layer
view.addLayer({
    type: 'color',
    protocol: 'xyz',
    id: 'OPENSM',
    // eslint-disable-next-line no-template-curly-in-string
    url: 'http://c.tile.stamen.com/watercolor/${z}/${x}/${y}.jpg',
    networkOptions: { crossOrigin: 'anonymous' },
    extent: [extent.west(), extent.east(), extent.south(), extent.north()],
    projection: 'EPSG:3857',
    options: {
        attribution: {
            name: 'OpenStreetMap',
            url: 'http://www.openstreetmap.org/',
        },
    },
    updateStrategy: {
        type: itowns.STRATEGY_DICHOTOMY,
    },
});

// Request redraw
view.notifyChange(true);
