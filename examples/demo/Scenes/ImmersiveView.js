import * as THREE from 'three';
import * as itowns from 'itowns';
import ImmersiveView from '../Views/ImmersiveView.js';
import * as OrthoLayer from '../Layers/OrthoLayer.js';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer.js';

export const Scene = {
    placement: {
        coord: { long: 2.33481381, lat: 48.85060296 },
        range: 25,
        tilt: 0,
        heading: 180,

    },
    layers: [],
    view: new ImmersiveView(),
    onEnter: () => {
    },
    onExit: () => {
    },
};

itowns.CRS.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

const view = Scene.view.getView();

Scene.layers.push(await OrthoLayer.getLayer());
Scene.layers.push(await IgnMntHighResLayer.getLayer());

function altitudeBuildings(properties) {
    // I set altitude building 3 meters down, to be sure building is anchored in the ground
    return properties.altitude_minimale_sol - 3;
}

function extrudeBuildings(properties) {
    // As I've set altitude building 3 meters down, I have to make 3 meters high.
    return properties.hauteur + 3;
}

// Prepare oriented image source
const orientedImageSource = new itowns.OrientedImageSource({
    url: 'http://www.itowns-project.org/itowns-sample-data-small/images/140616/Paris-140616_0740-{cameraId}-00001_0000{panoId}.jpg',
    // Url to a GEOJSON file describing feature points. It describre position and orientation of each panoramic.
    orientationsUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/panoramicsMetaDataParis.geojson',
    // Url of a a JSON file with calibration for all cameras. see [CameraCalibrationParser]{@link module:CameraCalibrationParser.parse}
    // in this example, we have the ladybug, it's a set of 6 cameras
    calibrationUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/cameraCalibration.json',
});


// Create oriented image layer
const olayer = new itowns.OrientedImageLayer('demo_orientedImage', {
    // Radius in meter of the sphere used as a background.
    backgroundDistance: 1200,
    source: orientedImageSource,
    crs: view.referenceCrs,
    useMask: false,
    onPanoChanged: (e) => {
        view.controls.setPreviousPosition(e.previousPanoPosition);
        view.controls.setCurrentPosition(e.currentPanoPosition);
        view.controls.setNextPosition(e.nextPanoPosition);
    },
});

// when oriented image layer is ready..
view.addLayer(olayer, view.tileLayer).then((orientedImageLayer) => {
    // prepare WFS source for the buildings
    const wfsBuildingSource = new itowns.WFSSource({
        url: 'https://data.geopf.fr/wfs/ows?',
        version: '2.0.0',
        typeName: 'BDTOPO_V3:batiment',
        crs: 'EPSG:4326',
        ipr: 'IGN',
        format: 'application/json',
        extent: {
            west: 2.334,
            east: 2.335,
            south: 48.849,
            north: 48.851,
        },
    });

    // create geometry layer for the buildings
    const wfsBuildingLayer = new itowns.FeatureGeometryLayer('Buildings', {
        style: {
            fill: {
                base_altitude: altitudeBuildings,
                extrusion_height: extrudeBuildings,
            },
        },
        // when a building is created, it get the projective texture mapping, from oriented image layer.
        onMeshCreated: mesh => mesh.traverse(object => object.material = orientedImageLayer.material),
        source: wfsBuildingSource,
        zoom: { min: 15 },
    });

    // add the created building layer, and debug UI
    view.addLayer(wfsBuildingLayer).then((buildingLayer) => {
        view.controls.buildingsLayer = buildingLayer.id;
    });

    const altitude = new THREE.Vector3();

    view.controls.transformationPositionPickOnTheGround = (position) => {
        position.copy(orientedImageLayer.mostNearPano(position).position);
        altitude.copy(position).normalize().multiplyScalar(3);
        return position.sub(altitude);
    };
});

view.addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED, () => {
    // eslint-disable-next-line no-console
    console.info('Globe initialized');

    // set camera to current panoramic
    view.controls.setCameraToCurrentPosition();
    view.notifyChange(view.camera3D);
});
