import * as itowns from 'itowns';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as OrthoLayer from '../Layers/OrthoLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType = {
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
    atmosphere: true,
    ready: false,
    onCreate: async () => {
        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());

        await Scene.view.addLayers(Scene.layers);
    },
};
