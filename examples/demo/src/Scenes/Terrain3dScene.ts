import * as itowns from 'itowns';
import * as Layers from '../Layers';
import { View3D } from '../Views';
import type { SceneType } from '../Types';

export const Terrain3dScene: SceneType = {
    title: 'Feel the Relief',
    description: 'Add realistic relief to your maps with elevation data. '
    + 'iTowns supports multiple terrain formats such as WMTS with images and COG.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 9, 44.5),
        range: 300000,
        tilt: 0,
        heading: 0,
    },
    layers: [],
    view: undefined,
    ready: false,
    getView: () => {
        if (!Terrain3dScene.view) {
            throw new Error('Terrain 3D Scene view is not initialized');
        }
        return Terrain3dScene.view;
    },
    getItownsView: () => Terrain3dScene.getView().getItownsView(),
    onCreate: async () => {
        if (Terrain3dScene.ready) {
            return;
        }
        Terrain3dScene.view = new View3D();

        Terrain3dScene.layers.push(await Layers.OrthoFetcherLayer.getLayer());
        Terrain3dScene.layers.push(await Layers.WorldDTMFetcherLayer.getLayer());
        Terrain3dScene.layers.push(await Layers.IgnMntHighResFetcherLayer.getLayer());

        await Terrain3dScene.view.addLayers(Terrain3dScene.layers);

        Terrain3dScene.ready = true;
    },
};
