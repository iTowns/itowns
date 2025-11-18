import * as itowns from 'itowns';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as OrthoLayer from '../Layers/OrthoLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType = {
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
        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());

        await Scene.view.addLayers(Scene.layers);

        Scene.ready = true;
    },
};
