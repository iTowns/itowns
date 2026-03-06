import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as Layers from '../Layers';
import { View3D } from '../Views';
import type { SceneType } from '../Types';
import { BIMLoader } from '../ModelLoaders';

export const BIMScene: SceneType = {
    title: 'From Building to Territory',
    description: 'Integrate Building Information Models into your geospatial context. '
    + 'Load glTF models to combine architectural and geographic data.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.76633, 45.706118),
        range: 300,
        tilt: 20,
        heading: 90,
    },
    layers: [],
    view: undefined,
    ready: false,
    meshes: [],
    getView: () => {
        if (!BIMScene.view) {
            throw new Error('BIM Scene view is not initialized');
        }
        return BIMScene.view;
    },
    getItownsView: () => BIMScene.getView().getItownsView(),
    onCreate: async () => {
        if (BIMScene.ready) {
            return;
        }
        BIMScene.view = new View3D();

        const view = BIMScene.getItownsView();

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(view.renderer);
        view.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        BIMScene.layers.push(await Layers.OrthoFetcherLayer.getLayer());
        BIMScene.layers.push(await Layers.WorldDTMFetcherLayer.getLayer());
        BIMScene.layers.push(await Layers.IgnMntHighResFetcherLayer.getLayer());

        await BIMScene.view.addLayers(BIMScene.layers);

        const model = await BIMLoader.getModel();

        model.scale.set(4, 4, 4);

        const coord = BIMScene.placement.coord.clone();
        coord.z = 240; // elevation offset

        // Position in the view CRS
        model.position.copy(coord.as(view.referenceCrs).toVector3());

        // Align glTF's Y-up to the local ground normal
        model.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            coord.geodesicNormal,
        );

        const rotation = [0, 125, 0];
        const eulerRot = new THREE.Euler(
            THREE.MathUtils.degToRad(rotation[2]),
            -THREE.MathUtils.degToRad(rotation[1]),
            -THREE.MathUtils.degToRad(rotation[0]), 'ZYX',
        );
        model.quaternion.multiply(
            new THREE.Quaternion().setFromEuler(eulerRot));

        // Notify that the model has been updated
        model.updateMatrixWorld(true);

        BIMScene.meshes?.push(model);

        BIMScene.ready = true;
    },
    onEnter: async () => {
        const view = BIMScene.getItownsView();
        view.scene.add(...BIMScene.meshes!);
    },
    onExit: async () => {
        const view = BIMScene.getItownsView();
        view.scene.remove(...BIMScene.meshes!);
    },
};
