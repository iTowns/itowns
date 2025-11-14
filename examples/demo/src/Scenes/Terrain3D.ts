import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as OrthoLayer from '../Layers/OrthoLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType = {
    placement: {
        coord: { long: 9, lat: 44.5 },
        range: 300000,
        tilt: 0,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    onEnter: () => {
    },
    onExit: () => {
    },
};

Scene.layers.push(await OrthoLayer.getLayer());
Scene.layers.push(await IgnMntLayer.getLayer());
Scene.layers.push(await IgnMntHighResLayer.getLayer());
