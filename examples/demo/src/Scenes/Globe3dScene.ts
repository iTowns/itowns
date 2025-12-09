import * as itowns from 'itowns';
import * as Layers from '../Layers';
import { View3D } from '../Views';
import type { SceneType } from '../Types';

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

        Globe3dScene.layers.push(await Layers.OrthoLayer.getLayer());
        Globe3dScene.layers.push(await Layers.WorldDTMLayer.getLayer());
        Globe3dScene.layers.push(await Layers.IgnMntHighResLayer.getLayer());

        await Globe3dScene.view.addLayers(Globe3dScene.layers);

        Globe3dScene.ready = true;
    },
};
