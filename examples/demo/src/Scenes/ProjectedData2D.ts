import * as itowns from 'itowns';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as ParksLayer from '../Layers/ParksLayer';
import * as FlatBuildingsLayer from '../Layers/FlatBuildingsLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType = {
    title: 'Projected Data 2D',
    description: 'Scene demonstrating projected 2D data with orthophoto and vector layers.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.828, 45.7254),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    atmosphere: false,
    ready: false,
    onCreate: async () => {
        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());
        Scene.layers.push(await FlatBuildingsLayer.getLayer());
        Scene.layers.push(await ParksLayer.getLayer());

        await Scene.view.addLayers(Scene.layers);

        Scene.ready = true;
    },
    onEnter() {
    },
    onExit() {
    },
};
