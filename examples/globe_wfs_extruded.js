/* global itowns, document, renderer */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 4.818, latitude: 45.7354, altitude: 3000 };
var promises = [];

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });
function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

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

globeView.addLayer({
    update: itowns.FeatureProcessing.update(colorFunctionLine),
    url: 'https://download.data.grandlyon.com/wfs/rdata?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'tcl_bus',
    typeName: 'tcl_sytral.tcllignebus',
    level: 14,
    projection: 'EPSG:3946',
    style: {
        altitude: function altitude() { return 180; },
    },
    extent: {
        west: 1822174.60,
        east: 1868247.07,
        south: 5138876.75,
        north: 5205890.19,
    },
    options: {
        mimetype: 'geojson',
    },
}, globeView.tileLayer);

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
globeView.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update(colorFunctionBuildings),
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'wfsBuilding',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 14,
    projection: 'EPSG:4326',
    // extent: {
    //     west: 4,
    //     east: 6,
    //     south: 44,
    //     north: 47,
    // },
    style: {
        altitude: function altitude(properties) { return properties.z_min - properties.hauteur; },
        extrude: function extrude(properties) { return properties.hauteur; },
    },
    ipr: 'IGN',
    options: {
        mimetype: 'json',
    },
}, globeView.tileLayer);

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
