/* global itowns, document, renderer, setupLoadingScreen */
// # Planar (EPSG:3946) viewer

var extent;
var viewerDiv;
var view;
var controls;
var scale;
var parent;
var index;
var wms;
var obj;
var offset;
var tileLayer;

var wmsLayers = [
    'fpc_fond_plan_communaut.fpcilot',
    'pvo_patrimoine_voirie.pvochausseetrottoir',
    'Ortho2009_vue_ensemble_16cm_CC46',
    'pos_opposable.poshauvoi',
    'MNT2015_Ombrage_2m',
    'cad_cadastre.cadilot',
];

var cubeTransformations = [
    {
        position: new itowns.THREE.Vector3(0, 0, 0.5),
        rotation: new itowns.THREE.Euler(),
    },
    {
        position: new itowns.THREE.Vector3(0, 0, -0.5),
        rotation: new itowns.THREE.Euler().set(Math.PI, 0, 0),
    },
    {
        position: new itowns.THREE.Vector3(0, 0.5, 0),
        rotation: new itowns.THREE.Euler().set(-Math.PI * 0.5, 0, 0),
    },
    {
        position: new itowns.THREE.Vector3(0, -0.5, 0),
        rotation: new itowns.THREE.Euler().set(Math.PI * 0.5, 0, 0),
    },
    {
        position: new itowns.THREE.Vector3(0.5, 0, 0),
        rotation: new itowns.THREE.Euler().set(0, Math.PI * 0.5, 0),
    },
    {
        position: new itowns.THREE.Vector3(-0.5, 0, 0),
        rotation: new itowns.THREE.Euler().set(0, -Math.PI * 0.5, 0),
    },
];

// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
itowns.proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Define geographic extent: CRS, min/max X, min/max Y
extent = new itowns.Extent(
    'EPSG:3946',
    1837900, 1837900 + 8000,
    5170100, 5170100 + 8000);

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
viewerDiv = document.getElementById('viewerDiv');

itowns.THREE.Object3D.DefaultUp.set(0, 0, 1);

scale = new itowns.THREE.Vector3(1, 1, 1).divideScalar(extent.dimensions().x);

// Instanciate View
view = new itowns.View(extent.crs(), viewerDiv, { renderer: renderer });
setupLoadingScreen(viewerDiv, view);

view.mainLoop.gfxEngine.renderer.setClearColor(0x999999);

parent = new itowns.THREE.Mesh(
    new itowns.THREE.BoxGeometry(8000, 8000, 8000),
    new itowns.THREE.MeshBasicMaterial({ color: 0xdddddd }));
parent.scale.copy(scale);
parent.updateMatrixWorld(true);

view.scene.add(parent);

for (index = 0; index < wmsLayers.length; index++) {
    wms = wmsLayers[index];
    obj = new itowns.THREE.Object3D();
    offset = extent.center().xyz().negate().applyEuler(cubeTransformations[index].rotation);
    offset.add(cubeTransformations[index].position.divide(scale));
    obj.position.copy(offset);
    obj.rotation.copy(cubeTransformations[index].rotation);
    parent.add(obj);
    obj.updateMatrixWorld(true);

    tileLayer = itowns.createPlanarLayer('planar' + wms + index, extent, { object3d: obj });
    tileLayer.disableSkirt = true;

    view.addLayer(tileLayer);

    view.addLayer({
        update: itowns.updateLayeredMaterialNodeImagery,
        url: 'https://download.data.grandlyon.com/wms/grandlyon',
        networkOptions: { crossOrigin: 'anonymous' },
        type: 'color',
        protocol: 'wms',
        version: '1.3.0',
        id: 'wms_imagery' + wms + index,
        name: wms,
        projection: 'EPSG:3946',
        format: 'image/jpeg',
    }, tileLayer);

    view.addLayer({
        update: itowns.updateLayeredMaterialNodeElevation,
        url: 'https://download.data.grandlyon.com/wms/grandlyon',
        type: 'elevation',
        protocol: 'wms',
        networkOptions: { crossOrigin: 'anonymous' },
        version: '1.3.0',
        id: 'wms_elevation' + wms + index,
        name: 'MNT2012_Altitude_10m_CC46',
        projection: 'EPSG:3946',
        heightMapWidth: 256,
        format: 'image/jpeg',
    }, tileLayer);

    // Since the elevation layer use color textures, specify min/max z
    tileLayer.materialOptions = {
        useColorTextureElevation: true,
        colorTextureElevationMinZ: -600,
        colorTextureElevationMaxZ: 400,
    };
}

// Since PlanarView doesn't create default controls, we manipulate directly three.js camera
// Position the camera at south-west corner
view.camera.camera3D.position.set(3, 2, 3);
view.camera.camera3D.updateMatrixWorld(true);
view.camera.camera3D.lookAt(new itowns.THREE.Vector3(0, 0, 0));

controls = new itowns.THREE.OrbitControls(view.camera.camera3D, viewerDiv);
controls.minDistance = 1;
controls.addEventListener('change', function _() { view.notifyChange(true); });

// Request redraw
view.notifyChange(true);

exports.view = view;
