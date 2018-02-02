/* global itowns, document, renderer, setupLoadingScreen */
// # Planar (EPSG:3946) viewer

var extent;
var viewerDiv;
var view;
var meshes;

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
itowns.proj4.defs('EPSG:2154',
    '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Define geographic extent: CRS, min/max X, min/max Y
extent = new itowns.Extent(
    'EPSG:3946',
    1837816.94334, 1847692.32501,
    5170036.4587, 5178412.82698);

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
viewerDiv = document.getElementById('viewerDiv');

// Instanciate PlanarView*
view = new itowns.PlanarView(viewerDiv, extent, { renderer: renderer });
setupLoadingScreen(viewerDiv, view);
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
    format: 'image/jpeg',
});

view.camera.camera3D.position.set(1839739, 5171618, 910);
view.camera.camera3D.lookAt(new itowns.THREE.Vector3(1840839, 5172718, 0));

// eslint-disable-next-line no-new
new itowns.PlanarControls(view, {});

// Request redraw
view.notifyChange(true);

function setMaterialLineWidth(result) {
    result.children[0].material.linewidth = 5;
}

function colorLine(properties) {
    var rgb = properties.couleur.split(' ');
    return new itowns.THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

view.addLayer({
    name: 'lyon_tcl_bus',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorLine }),
    onMeshCreated: setMaterialLineWidth,
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
    format: 'geojson',
}, view.tileLayer);

function colorBuildings(properties) {
    if (properties.id.indexOf('bati_remarquable') === 0) {
        return new itowns.THREE.Color(0x5555ff);
    } else if (properties.id.indexOf('bati_industriel') === 0) {
        return new itowns.THREE.Color(0xff5555);
    }
    return new itowns.THREE.Color(0xeeeeee);
}

function extrudeBuildings(properties) {
    return properties.hauteur;
}

meshes = [];
function scaler(/* dt */) {
    var i;
    var mesh;
    if (meshes.length) {
        view.notifyChange(true);
    }
    for (i = 0; i < meshes.length; i++) {
        mesh = meshes[i];
        mesh.scale.z = Math.min(
            1.0, mesh.scale.z + 0.016);
        mesh.updateMatrixWorld(true);
    }
    meshes = meshes.filter(function filter(m) { return m.scale.z < 1; });
}

view.addFrameRequester(itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, scaler);
view.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        color: colorBuildings,
        extrude: extrudeBuildings }),
    onMeshCreated: function scaleZ(mesh) {
        mesh.scale.z = 0.01;
        meshes.push(mesh);
    },
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    networkOptions: { crossOrigin: 'anonymous' },
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
    ipr: 'IGN',
    format: 'application/json',
}, view.tileLayer);

function configPointMaterial(result) {
    var i = 0;
    var mesh;
    for (; i < result.children.length; i++) {
        mesh = result.children[i];

        mesh.material.size = 15;
        mesh.material.sizeAttenuation = false;
    }
}

function colorPoint(properties) {
    if (properties.gestion === 'CEREMA') {
        return new itowns.THREE.Color(0x7F180D);
    }
    return new itowns.THREE.Color(0xFFB300);
}

view.addLayer({
    type: 'geometry',
    update: itowns.FeatureProcessing.update,
    convert: itowns.Feature2Mesh.convert({
        altitude: 0,
        color: colorPoint }),
    onMeshCreated: configPointMaterial,
    url: 'http://wxs.ign.fr/72hpsel8j8nhb5qgdh07gcyp/geoportail/wfs?',
    networkOptions: { crossOrigin: 'anonymous' },
    protocol: 'wfs',
    version: '2.0.0',
    id: 'wfsPoint',
    typeName: 'BDPR_BDD_FXX_LAMB93_20170911:pr',
    level: 2,
    projection: 'EPSG:2154',
    ipr: 'IGN',
    format: 'application/json',
}, view.tileLayer);
exports.view = view;
