import * as itowns from 'itowns';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

export const Terrain3dScene: SceneType = {
    title: 'Terrain 3D',
    description: 'Scene demonstrating 3D terrain with orthophoto and elevation layers.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 9, 44.5),
        range: 300000,
        tilt: 0,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    ready: false,
    onCreate: async () => {
        if (Terrain3dScene.ready) {
            return;
        }
        Terrain3dScene.view = new View3D();

        Terrain3dScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        Terrain3dScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        Terrain3dScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());

        await Terrain3dScene.view.addLayers(Terrain3dScene.layers);

        Terrain3dScene.ready = true;
    },
};
