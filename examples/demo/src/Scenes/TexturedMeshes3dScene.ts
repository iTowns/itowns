import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as Layers from '../Layers';
import { View3D } from '../Views';
import type { SceneType } from '../Types';

export const TexturedMeshes3dScene: SceneType = {
    title: 'Stream Entire Cities',
    description: 'Load and navigate detailed 3D city models using 3D Tiles. '
    + 'Stream only what you need for optimal performance.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 3.0270044, 50.6273158),
        range: 800,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: undefined,
    meshes: [],
    ready: false,
    getView: () => {
        if (!TexturedMeshes3dScene.view) {
            TexturedMeshes3dScene.view = new View3D();
        }
        return TexturedMeshes3dScene.view;
    },
    getItownsView: () => TexturedMeshes3dScene.getView().getItownsView(),
    onCreate: async () => {
        if (TexturedMeshes3dScene.ready) {
            return;
        }
        if (!TexturedMeshes3dScene.view) {
            TexturedMeshes3dScene.view = new View3D();
        }

        const itownsView = TexturedMeshes3dScene.getItownsView();

        // Enable various compression support for 3D Tiles tileset:
        itowns.enableDracoLoader('./libs/draco/');
        itowns.enableKtx2Loader('./lib/basis/', itownsView.renderer);
        itowns.enableMeshoptDecoder(MeshoptDecoder);

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(itownsView.renderer);
        itownsView.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        TexturedMeshes3dScene.layers.push(await Layers.OrthoFetcherLayer.getLayer());
        TexturedMeshes3dScene.layers.push(await Layers.WorldDTMFetcherLayer.getLayer());
        TexturedMeshes3dScene.layers.push(await Layers.IgnMntHighResFetcherLayer.getLayer());
        TexturedMeshes3dScene.layers.push(await Layers.Tiles3dLayer.getLayer());

        await TexturedMeshes3dScene.view.addLayers(TexturedMeshes3dScene.layers);

        TexturedMeshes3dScene.ready = true;
    },
};
