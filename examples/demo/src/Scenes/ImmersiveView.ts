import * as THREE from 'three';
import * as itowns from 'itowns';
import ImmersiveView from '../Views/ImmersiveView';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType & { immersivePlacement: THREE.Vector3 | null } = {
    title: 'Immersive View',
    description: 'Scene demonstrating immersive view with oriented images '
    + 'and textured 3D buildings.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 2.33481381, 48.85060296),
        range: 25,
        tilt: 0,
        heading: 180,
    },
    immersivePlacement: null,
    layers: [],
    view: new ImmersiveView(),
    atmosphere: false,
    ready: false,
    event: () => {
        const view = Scene.view.getView() as itowns.GlobeView;
        // set camera to current panoramic
        // @ts-expect-error setCameraToCurrentPosition method undefined
        view.controls!.setCameraToCurrentPosition();
        view.notifyChange(view.camera3D);
    },
    onCreate: async () => {
        itowns.CRS.defs('EPSG:2154',
            '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 '
        + '+x_0=700000 +y_0=6600000 +ellps=GRS80 '
        + '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

        const view = Scene.view.getView() as itowns.GlobeView;

        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());

        function altitudeBuildings(properties: {
            altitude_minimale_sol: number,
        }) {
            return properties.altitude_minimale_sol - 3;
        }

        function extrudeBuildings(properties: {
            hauteur: number,
        }) {
            return properties.hauteur + 3;
        }

        // Gate readiness until we get the first pano change
        let resolvePanoReady: (() => void) | null = null;
        const panoReady = new Promise<void>((res) => { resolvePanoReady = res; });

        // Prepare oriented image source
        const orientedImageSource = new itowns.OrientedImageSource({
            url: 'http://www.itowns-project.org/itowns-sample-data-small/images/140616/Paris-140616_0740-{cameraId}-00001_0000{panoId}.jpg',
            orientationsUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/panoramicsMetaDataParis.geojson',
            calibrationUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/cameraCalibration.json',
        });

        // Create oriented image layer
        const olayer = new itowns.OrientedImageLayer('demo_orientedImage', {
            // Radius in meter of the sphere used as a background.
            backgroundDistance: 1200,
            source: orientedImageSource,
            crs: view.referenceCrs,
            // @ts-expect-error useMask property used
            // but not defined in OrientedImageLayerOptions
            useMask: false,
            onPanoChanged: (e: {
                previousPanoPosition: THREE.Vector3,
                currentPanoPosition: THREE.Vector3,
                nextPanoPosition: THREE.Vector3,
            }) => {
                // @ts-expect-error setPreviousPosition method undefined
                view.controls!.setPreviousPosition(e.previousPanoPosition);
                // @ts-expect-error setCurrentPosition method undefined
                view.controls!.setCurrentPosition(e.currentPanoPosition);
                // @ts-expect-error setNextPosition method undefined
                view.controls!.setNextPosition(e.nextPanoPosition);

                if (resolvePanoReady) {
                    resolvePanoReady();
                    resolvePanoReady = null;
                }
            },
        });

        Scene.layers.push(olayer);

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
            // @ts-expect-error 'style' property used
            // but not defined in FeatureGeometryLayerOptions
            style: {
                fill: {
                    base_altitude: altitudeBuildings,
                    extrusion_height: extrudeBuildings,
                },
            },
            // when a building is created,
            // it get the projective texture mapping,
            // from oriented image layer.
            onMeshCreated: (mesh: {
                traverse: (arg0: (object: {
                    material: THREE.Material;
                }) => void) => void;
            }) => mesh.traverse(object =>
                object.material = olayer.material),
            source: wfsBuildingSource,
            zoom: { min: 15 },
        });

        Scene.layers.push(wfsBuildingLayer);

        await Scene.view.addLayers(Scene.layers);

        // @ts-expect-error buildingsLayer property undefined
        view.controls!.buildingsLayer = wfsBuildingLayer.id;

        const altitude = new THREE.Vector3();

        // @ts-expect-error transformationPositionPickOnTheGround
        // property undefined
        view!.controls!.transformationPositionPickOnTheGround =
            (position: THREE.Vector3) => {
                position.copy(olayer.mostNearPano(position).position);
                altitude.copy(position).normalize().multiplyScalar(3);
                return position.sub(altitude);
            };

        // Wait until we have a current pano, then set the camera
        await panoReady;

        // @ts-expect-error setCameraToCurrentPosition method undefined
        view.controls!.setCameraToCurrentPosition();
        view.notifyChange(view.camera3D);

        Scene.immersivePlacement = view.camera3D.position.clone();

        Scene.ready = true;
    },
    onEnter: () => {
        const view = Scene.view.getView() as itowns.GlobeView;

        // Ensure pose is correct on every entry
        view.camera3D.position.copy(Scene.immersivePlacement!);
        view.notifyChange(view.camera3D);

        Scene.view.getView().addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED,
            Scene.event!);
    },
    onExit: () => {
        Scene.view.getView().removeEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED,
            Scene.event!);
    },
};
