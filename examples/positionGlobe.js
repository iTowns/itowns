/* global itowns, document, renderer, GuiTools, Promise */
// # Simple Globe viewer

// Define initial camera position
// Coordinate can be found on https://www.geoportail.gouv.fr/carte
// setting is "coordonnée geographiques en degres decimaux"

// Position near Annecy lake.
// var positionOnGlobe = { longitude: 6.2230, latitude: 45.8532, altitude: 5000 };

// Position near Gerbier mountain.
var positionOnGlobe = { longitude: 4.22, latitude: 44.844, altitude: 4000 };

// `viewerDiv` will contain iTowns' rendering area (`<canvas>`)
var viewerDiv = document.getElementById('viewerDiv');

// Instanciate iTowns GlobeView*
var view = new itowns.GlobeView(viewerDiv, positionOnGlobe, { renderer: renderer });

var promises = [];

var menuGlobe = new GuiTools('menuDiv');

menuGlobe.view = view;

function addLayerCb(layer) {
    return view.addLayer(layer);
}
// Add one imagery layer to the scene
// This layer is defined in a json file but it could be defined as a plain js
// object. See Layer* for more info.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/Ortho.json').then(addLayerCb));
// Add two elevation layers.
// These will deform iTowns globe geometry to represent terrain elevation.
promises.push(itowns.Fetcher.json('./layers/JSONLayers/WORLD_DTM.json').then(addLayerCb));
promises.push(itowns.Fetcher.json('./layers/JSONLayers/IGN_MNT_HIGHRES.json').then(addLayerCb));

exports.view = view;
exports.initialPosition = positionOnGlobe;


function addMeshToScene() {
    // creation of the new mesh (a cylinder)
    var THREE = itowns.THREE;
    var geometry = new THREE.CylinderGeometry(0, 10, 60, 8);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var mesh = new THREE.Mesh(geometry, material);

    // get the position on the globe, from the camera
    var cameraTargetPosition = view.controls.getCameraTargetGeoPosition();

    // position of the mesh
    var meshCoord = cameraTargetPosition;
    meshCoord.setAltitude(cameraTargetPosition.altitude() + 30);

    // position and orientation of the mesh
    mesh.position.copy(meshCoord.as(view.referenceCrs).xyz());
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    mesh.rotateX(Math.PI / 2);

    // update coordinate of the mesh
    mesh.updateMatrixWorld();

    // add the mesh to the scene
    view.scene.add(mesh);

    // make the object usable from outside of the function
    view.mesh = mesh;
}

// Listen for globe full initialisation event
view.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, function () {
    // eslint-disable-next-line no-console
    console.info('Globe initialized');
    Promise.all(promises).then(function () {
        menuGlobe.addImageryLayersGUI(view.getLayers(function (l) { return l.type === 'color'; }));
        menuGlobe.addElevationLayersGUI(view.getLayers(function (l) { return l.type === 'elevation'; }));

        addMeshToScene();

        view.controls.setTilt(60, true);
    });
});
