import * as itowns from 'itowns';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

export const Globe3dScene: SceneType = {
    title: '3D Globe',
    description: 'Scene demonstrating a 3D globe view with orthophoto layer.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 2.351323, 48.856712),
        range: 25000000,
        tilt: 89.5,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    ready: false,
    onCreate: async () => {
        Globe3dScene.view = new View3D();

        Globe3dScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        Globe3dScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        Globe3dScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());

        await Globe3dScene.view.addLayers(Globe3dScene.layers);
    },
};
