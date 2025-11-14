import * as itowns from 'itowns';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as ParksLayer from '../Layers/ParksLayer';
import * as FlatBuildingsLayer from '../Layers/FlatBuildingsLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType = {
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.828, 45.7254),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    ready: false,
    onCreate: async () => {
        const view = Scene.view.getView();

        const orthoLayer = await OrthoLayer.getLayer();
        const ignMntHighResLayer = await IgnMntHighResLayer.getLayer();
        const flatBuildingsLayer = await FlatBuildingsLayer.getLayer();
        const parksLayer = await ParksLayer.getLayer();

        Scene.layers.push(orthoLayer);
        Scene.layers.push(ignMntHighResLayer);
        Scene.layers.push(flatBuildingsLayer);
        Scene.layers.push(parksLayer);

        await view.addLayer(orthoLayer);
        await view.addLayer(ignMntHighResLayer);
        await view.addLayer(flatBuildingsLayer);
        await view.addLayer(parksLayer);

        Scene.ready = true;
    },
};
