import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType = {
    title: 'Textured Meshes 3D',
    description: 'Scene demonstrating textured 3D meshes.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 3.0270044, 50.6273158),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    meshes: [],
    atmosphere: false,
    ready: false,
    onCreate: async () => {
        const view = Scene.view.getView();

        // Enable various compression support for 3D Tiles tileset:
        itowns.enableDracoLoader('./libs/draco/');
        itowns.enableKtx2Loader('./lib/basis/', view.renderer);
        itowns.enableMeshoptDecoder(MeshoptDecoder);

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(view.renderer);
        view.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        const tiles3DSource = new itowns.OGC3DTilesSource({
            url: 'https://webimaging.lillemetropole.fr/externe/maillage/2020_mel_5cm/tileset.json',
        });

        const tiles3DLayer = new itowns.OGC3DTilesLayer('3DTiles', {
            source: tiles3DSource,
            // @ts-expect-error PNTS_SIZE_MODE interpreted as type number
            // assigned to string
            pntsSizeMode: itowns.PNTS_SIZE_MODE.ATTENUATED,
        });

        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());
        Scene.layers.push(tiles3DLayer);

        await Scene.view.addLayers(Scene.layers);

        Scene.ready = true;
    },
};
