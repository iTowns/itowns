/* global itowns, document, renderer, setupLoadingScreen */
// # Simple Globe viewer

// Define initial camera position
var positionOnGlobe = { longitude: 4.818, latitude: 45.7354, altitude: 3000 };
var promises = [];
var meshes = [];
var linesBus = [];
var scaler;

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var globeView = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });
setupLoadingScreen(viewerDiv, globeView);
function addLayerCb(layer) {
    return globeView.addLayer(layer);
}

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
itowns.proj4.defs('EPSG:2154',
    '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));

// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

function altitudeLine(properties, contour) {
    var altitudes = [];
    var i = 0;
    var result;
    var tile;
    var layer = globeView.wgs84TileLayer;
    if (contour.length && contour.length > 0) {
        for (; i < contour.length; i++) {
            result = itowns.DEMUtils.getElevationValueAt(layer, contour[i], 0, tile);
            if (!result) {
                result = itowns.DEMUtils.getElevationValueAt(layer, contour[i], 0);
            }
            tile = [result.tile];
            altitudes.push(result.z + 2);
        }
        return altitudes;
    }
    return 0;
}

function colorLine(properties) {
    var rgb = properties.couleur.split(' ');
    return new itowns.THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

function acceptFeatureBus(properties) {
    var line = properties.ligne + properties.sens;
    if (linesBus.indexOf(line) === -1) {
        linesBus.push(line);
        return true;
    }
    return false;
}

globeView.addLayer({
    name: 'lyon_tcl_bus',
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorLine,
        altitude: altitudeLine }),
    linewidth: 5,
    filter: acceptFeatureBus,
    url: 'https://download.data.grandlyon.com/wfs/rdata?',
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Bus lines',
    typeName: 'tcl_sytral.tcllignebus',
    level: 9,
    projection: 'EPSG:3946',
    extent: {
        west: 1822174.60,
        east: 1868247.07,
        south: 5138876.75,
        north: 5205890.19,
    },
    format: 'geojson',
}, globeView.tileLayer);

function colorBuildings(properties) {
    if (properties.id.indexOf('bati_remarquable') === 0) {
        return new itowns.THREE.Color(0x5555ff);
    } else if (properties.id.indexOf('bati_industriel') === 0) {
        return new itowns.THREE.Color(0xff5555);
    }
    return new itowns.THREE.Color(0xeeeeee);
}

function altitudeBuildings(properties) {
    return properties.z_min - properties.hauteur;
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

function acceptFeature(properties) {
    return !!properties.hauteur;
}

scaler = function update(/* dt */) {
    var i;
    var mesh;
    if (meshes.length) {
        globeView.notifyChange(true);
    }
    for (i = 0; i < meshes.length; i++) {
        mesh = meshes[i];
        if (mesh.children.length) {
            mesh.scale.z = Math.min(
                1.0, mesh.scale.z + 0.016);
            mesh.updateMatrixWorld(true);
        }
    }
    meshes = meshes.filter(function filter(m) { return m.scale.z < 1; });
};

globeView.addFrameRequester(itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, scaler);
globeView.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorBuildings,
        altitude: altitudeBuildings,
        extrude: extrudeBuildings }),
    onMeshCreated: function scaleZ(mesh) {
        mesh.scale.z = 0.01;
        meshes.push(mesh);
    },
    filter: acceptFeature,
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    networkOptions: { crossOrigin: 'anonymous' },
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Buildings',
    typeName: 'BDTOPO_BDD_WLD_WGS84G:bati_remarquable,BDTOPO_BDD_WLD_WGS84G:bati_indifferencie,BDTOPO_BDD_WLD_WGS84G:bati_industriel',
    level: 14,
    projection: 'EPSG:4326',
    ipr: 'IGN',
    format: 'application/json',
}, globeView.tileLayer);

function configPointMaterial(result) {
    var i = 0;
    var mesh;
    for (; i < result.children.length; i++) {
        mesh = result.children[i];

        mesh.material.sizeAttenuation = false;
    }
}

function colorPoint(/* properties */) {
    return new itowns.THREE.Color(0x7F180D);
}

function selectRoad(properties) {
    return properties.gestion === 'CEREMA';
}

function altitudePoint(properties, contour) {
    if (contour.length && contour.length > 0) {
        return itowns.DEMUtils.getElevationValueAt(globeView.wgs84TileLayer, contour[0]).z + 5;
    }
    return 0;
}

globeView.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        altitude: altitudePoint,
        color: colorPoint }),
    size: 5,
    onMeshCreated: configPointMaterial,
    filter: selectRoad,
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    networkOptions: { crossOrigin: 'anonymous' },
    protocol: 'wfs',
    version: '2.0.0',
    id: 'WFS Route points',
    typeName: 'BDPR_BDD_FXX_LAMB93_20170911:pr',
    level: 12,
    projection: 'EPSG:2154',
    ipr: 'IGN',
    format: 'application/json',
}, globeView.tileLayer);

exports.view = globeView;
exports.initialPosition = positionOnGlobe;
