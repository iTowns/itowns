/* global itowns, document, renderer */
// # Planar (EPSG:3946) viewer

var extent;
var viewerDiv;
var view;

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Define geographic extent: CRS, min/max X, min/max Y
extent = new itowns.Extent(
    'EPSG:3946',
    1837816.94334, 1847692.32501,
    5170036.4587, 5178412.82698);

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
viewerDiv = document.getElementById('viewerDiv');

// Instanciate PlanarView*
view = new itowns.PlanarView(viewerDiv, extent, { renderer: renderer });
view.tileLayer.disableSkirt = true;

// Add an WMS imagery layer (see WMS_Provider* for valid options)
view.addLayer({
    url: 'https://download.data.grandlyon.com/wms/grandlyon',
    networkOptions: { crossOrigin: 'anonymous' },
    type: 'color',
    protocol: 'wms',
    version: '1.3.0',
    id: 'wms_imagery',
    name: 'Ortho2009_vue_ensemble_16cm_CC46',
    projection: 'EPSG:3946',
    axisOrder: 'wsen',
    options: {
        mimetype: 'image/jpeg',
    },
});

// Add an WMS elevation layer (see WMS_Provider* for valid options)
view.addLayer({
    url: 'https://download.data.grandlyon.com/wms/grandlyon',
    type: 'elevation',
    protocol: 'wms',
    networkOptions: { crossOrigin: 'anonymous' },
    version: '1.3.0',
    id: 'wms_elevation',
    name: 'MNT2012_Altitude_10m_CC46',
    projection: 'EPSG:3946',
    axisOrder: 'wsen',
    heightMapWidth: 256,
    options: {
        mimetype: 'image/jpeg',
    },
});
// Since the elevation layer use color textures, specify min/max z
view.tileLayer.materialOptions = {
    useColorTextureElevation: true,
    colorTextureElevationMinZ: 37,
    colorTextureElevationMaxZ: 240,
};

view.camera.setPosition(new itowns.Coordinates('EPSG:3946', extent.west(), extent.south(), 2000));
// Then look at extent's center
view.camera.camera3D.lookAt(extent.center().xyz());

// instanciate controls
// eslint-disable-next-line no-new
new itowns.PlanarControls(view, {});

// Request redraw
view.notifyChange(true);

exports.view = view;
