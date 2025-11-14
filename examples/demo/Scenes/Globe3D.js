import * as OrthoLayer from '../Layers/OrthoLayer.js';
import View3D from '../Views/View3D.js';

export const Scene = {
    placement: {
        coord: { long: 2.351323, lat: 48.856712 },
        range: 25000000,
        tilt: 89.5,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    onEnter: () => {},
    onExit: () => {},
};

Scene.layers.push(await OrthoLayer.getLayer());

