import * as THREE from 'three';
import * as itowns from 'itowns';
import { ImmersiveView } from '../Views';
import * as Layers from '../Layers';
import type { SceneType } from '../Types';

itowns.CRS.defs('EPSG:2154',
    '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 '
    + '+x_0=700000 +y_0=6600000 +ellps=GRS80 '
    + '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

export const ImmersiveViewScene: SceneType = {
    title: 'Walk Your Data',
    description: 'Experience your data at ground level with first-person navigation. '
    + 'Perfect for street-level visualization and immersive exploration.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 2.33481381, 48.85060296),
        range: 25,
        tilt: 0,
        heading: 180,
    },
    cameraPlacement: null,
    layers: [],
    view: undefined,
    ready: false,
    getView: () => {
        if (!ImmersiveViewScene.view) {
            throw new Error('Immersive View Scene view is not initialized');
        }
        return ImmersiveViewScene.view;
    },
    getItownsView: () => ImmersiveViewScene.getView().getItownsView(),
    event: () => {
        const itownsView = ImmersiveViewScene.getItownsView();
        // set camera to current panoramic
        // @ts-expect-error setCameraToCurrentPosition method undefined
        itownsView.controls!.setCameraToCurrentPosition();
        itownsView.notifyChange(itownsView.camera3D);
    },
    onCreate: async () => {
        if (ImmersiveViewScene.ready) {
            return;
        }
        ImmersiveViewScene.view = new ImmersiveView();

        const itownsView = ImmersiveViewScene.getItownsView();

        ImmersiveViewScene.layers.push(await Layers.OrthoFetcherLayer.getLayer());
        ImmersiveViewScene.layers.push(await Layers.IgnMntHighResFetcherLayer.getLayer());

        // Gate readiness until we get the first pano change
        let resolvePanoReady: (() => void) | null = null;
        const panoReady = new Promise<void>((res) => { resolvePanoReady = res; });

        const olayer = (await Layers.OrientedImageLayer.getLayer(itownsView.referenceCrs, (e: {
                previousPanoPosition: THREE.Vector3,
                currentPanoPosition: THREE.Vector3,
                nextPanoPosition: THREE.Vector3,
            }) => {
            // @ts-expect-error setPreviousPosition method undefined
            itownsView.controls!.setPreviousPosition(e.previousPanoPosition);
            // @ts-expect-error setCurrentPosition method undefined
            itownsView.controls!.setCurrentPosition(e.currentPanoPosition);
            // @ts-expect-error setNextPosition method undefined
            itownsView.controls!.setNextPosition(e.nextPanoPosition);

            if (resolvePanoReady) {
                resolvePanoReady();
                resolvePanoReady = null;
            }
        })) as itowns.OrientedImageLayer;
        ImmersiveViewScene.layers.push(olayer);

        const wfsBuildingLayer = await Layers.BuildingsWFSLayer.getLayer(
            (mesh: THREE.Mesh) => mesh.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.material = olayer.material;
                }
            }),
        );
        ImmersiveViewScene.layers.push(wfsBuildingLayer);

        await ImmersiveViewScene.view.addLayers(ImmersiveViewScene.layers);

        // @ts-expect-error buildingsLayer property undefined
        itownsView.controls!.buildingsLayer = wfsBuildingLayer.id;

        const altitude = new THREE.Vector3();

        // @ts-expect-error transformationPositionPickOnTheGround
        // property undefined
        itownsView!.controls!.transformationPositionPickOnTheGround =
            (position: THREE.Vector3) => {
                position.copy(olayer.mostNearPano(position).position);
                altitude.copy(position).normalize().multiplyScalar(3);
                return position.sub(altitude);
            };

        // Wait until we have a current pano, then set the camera
        await panoReady;

        // @ts-expect-error setCameraToCurrentPosition method undefined
        itownsView.controls!.setCameraToCurrentPosition();
        itownsView.notifyChange(itownsView.camera3D);

        ImmersiveViewScene.cameraPlacement = itownsView.camera3D.position.clone();

        ImmersiveViewScene.ready = true;
    },
    onEnter: async () => {
        const itownsView = ImmersiveViewScene.getItownsView();

        // Ensure pose is correct on every entry
        itownsView.camera3D.position.copy(ImmersiveViewScene.cameraPlacement!);
        itownsView.camera3D.updateMatrixWorld(true);
        itownsView.notifyChange(itownsView.camera3D);

        itownsView
            .addEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED,
            ImmersiveViewScene.event!);
    },
    onExit: async () => {
        const itownsView = ImmersiveViewScene.getItownsView();
        itownsView.removeEventListener(itowns.GLOBE_VIEW_EVENTS.GLOBE_INITIALIZED,
            ImmersiveViewScene.event!);
    },
};
