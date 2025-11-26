import * as itowns from 'itowns';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

export const Globe3dScene: SceneType = {
    title: 'Explore the World in 3D',
    description: 'Visualize the Earth in 3D with high-resolution orthophoto imagery. '
    + 'Navigate freely around the globe with intuitive controls.',
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
        if (Globe3dScene.ready) {
            return;
        }
        Globe3dScene.view = new View3D();

        Globe3dScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        Globe3dScene.layers.push(await LayerRepository.worldDTMLayer.getLayer());
        Globe3dScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());

        await Globe3dScene.view.addLayers(Globe3dScene.layers);

        Globe3dScene.ready = true;
    },
};
