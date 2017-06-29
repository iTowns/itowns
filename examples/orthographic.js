/* global itowns, renderer */
// # Orthographic viewer

// Define geographic extent: CRS, min/max X, min/max Y
const extent = new itowns.Extent(
    'EPSG:3857',
    -20026376.39, 20026376.39,
    -20048966.10, 20048966.10);

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
const viewerDiv = document.getElementById('viewerDiv');


const r = viewerDiv.clientWidth / viewerDiv.clientHeight;
const camera = new itowns.THREE.OrthographicCamera(
    extent.west(), extent.east(),
    extent.east() / r, extent.west() / r,
    0, 1000);

// Instanciate PlanarView
var view = new itowns.PlanarView(viewerDiv, extent, { renderer, maxSubdivisionLevel: 10, camera });

// By default itowns' tiles geometry have a "skirt" (ie they have a height),
// but in case of orthographic we don't need this feature, so disable it
view.tileLayer.disableSkirt = true;

// Add an TMS imagery layer
view.addLayer({
    type: 'color',
    protocol: 'tms',
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

var onMouseWheel = (event) => {
    const change = 1 - (Math.sign(event.wheelDelta || -event.detail) * 0.1);

    const halfNewWidth = (view.camera.camera3D.right - view.camera.camera3D.left) * change * 0.5;
    const halfNewHeight = (view.camera.camera3D.top - view.camera.camera3D.bottom) * change * 0.5;
    const cx = (view.camera.camera3D.right + view.camera.camera3D.left) * 0.5;
    const cy = (view.camera.camera3D.top + view.camera.camera3D.bottom) * 0.5;

    view.camera.camera3D.left = cx - halfNewWidth;
    view.camera.camera3D.right = cx + halfNewWidth;
    view.camera.camera3D.top = cy + halfNewHeight;
    view.camera.camera3D.bottom = cy - halfNewHeight;

    view.notifyChange(true);
};
viewerDiv.addEventListener('DOMMouseScroll', onMouseWheel);
viewerDiv.addEventListener('mousewheel', onMouseWheel);

let dragStartPosition;
let dragCameraStart;
viewerDiv.addEventListener('mousedown', (event) => {
    dragStartPosition = new itowns.THREE.Vector2(event.clientX, event.clientY);
    dragCameraStart = {
        left: view.camera.camera3D.left,
        right: view.camera.camera3D.right,
        top: view.camera.camera3D.top,
        bottom: view.camera.camera3D.bottom,
    };
});
viewerDiv.addEventListener('mousemove', (event) => {
    if (dragStartPosition) {
        const width = view.camera.camera3D.right - view.camera.camera3D.left;
        const deltaX = width * (event.clientX - dragStartPosition.x) / -viewerDiv.clientWidth;
        const deltaY = width * (event.clientY - dragStartPosition.y) / viewerDiv.clientHeight;

        view.camera.camera3D.left = dragCameraStart.left + deltaX;
        view.camera.camera3D.right = dragCameraStart.right + deltaX;
        view.camera.camera3D.top = dragCameraStart.top + deltaY;
        view.camera.camera3D.bottom = dragCameraStart.bottom + deltaY;
        view.notifyChange(true);
    }
});
viewerDiv.addEventListener('mouseup', () => {
    dragStartPosition = undefined;
});

// Request redraw
view.notifyChange(true);
