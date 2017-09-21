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
    transparent: false,
    extent: extent,
    axisOrder: 'wsen',
    options: {
        mimetype: 'image/jpeg',
    },
});

view.camera.camera3D.position.set(1839739, 5171618, 910);
view.camera.camera3D.lookAt(new itowns.THREE.Vector3(1840839, 5172718, 0));

// eslint-disable-next-line no-new
new itowns.PlanarControls(view, {});

// Request redraw
view.notifyChange(true);

function colorFunctionLine(layer, node, featureCollection) {
    var i;
    var featureProperties;
    var rgb;
    var colors = [];

    for (i = 0; i < featureCollection.features.length; i++) {
        featureProperties = featureCollection.features[i].properties;

        rgb = featureProperties.properties.couleur.split(' ');
        colors.push(new itowns.THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255));
    }

    itowns.FeatureProcessing.assignColorsToFeatureCollection(
        featureCollection, featureCollection.children[0], colors);

    featureCollection.children[0].material.linewidth = 5;
}

view.addLayer({
    update: itowns.FeatureProcessing.update(colorFunctionLine),
    url: 'https://download.data.grandlyon.com/wfs/rdata?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'tcl_bus',
    typeName: 'tcl_sytral.tcllignebus',
    level: 2,
    projection: 'EPSG:3946',
    extent: {
        west: 1822174.60,
        east: 1868247.07,
        south: 5138876.75,
        north: 5205890.19,
    },
    options: {
        mimetype: 'geojson',
    },
}, view.tileLayer);

function colorFunctionBuildings(layer, node, featureCollection) {
    var i;
    var featureProperties;
    var colors = [];

    for (i = 0; i < featureCollection.features.length; i++) {
        featureProperties = featureCollection.features[i].properties;

        if (featureProperties.id.indexOf('bati_remarquable') === 0) {
            colors.push(new itowns.THREE.Color(0x5555ff));
        } else if (featureProperties.id.indexOf('bati_industriel') === 0) {
            colors.push(new itowns.THREE.Color(0xff5555));
        } else {
            colors.push(new itowns.THREE.Color(0xeeeeee));
        }
    }

    itowns.FeatureProcessing.assignColorsToFeatureCollection(
        featureCollection, featureCollection.children[0], colors);
}

view.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update(colorFunctionBuildings),
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'wfsBuilding',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 5,
    projection: 'EPSG:4326',
    extent: {
        west: 4.568,
        east: 5.18,
        south: 45.437,
        north: 46.03,
    },
    style: {
        extrude: function extrude(properties) { return properties.hauteur; },
    },
    ipr: 'IGN',
    options: {
        mimetype: 'json',
    },
}, view.tileLayer);

exports.view = view;
