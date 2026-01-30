import * as itowns from 'itowns';
import * as Layers from '../Layers';
import { View3D } from '../Views';
import type { SceneType } from '../Types';

export const ProjectedData2dScene: SceneType = {
    title: 'Bring Your Data to Life',
    description: 'Overlay vector data on your terrain. Display GeoJSON, vector tiles, and more. '
    + 'Click on features to explore their attributes.',
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
        if (ProjectedData2dScene.ready) {
            return;
        }
        ProjectedData2dScene.view = new View3D();

        ProjectedData2dScene.layers.push(await Layers.OrthoLayer.getLayer());
        ProjectedData2dScene.layers.push(await Layers.WorldDTMLayer.getLayer());
        ProjectedData2dScene.layers.push(await Layers.IgnMntHighResLayer.getLayer());
        ProjectedData2dScene.layers.push(await Layers.FlatBuildingsLayer.getLayer());
        ProjectedData2dScene.layers.push(await Layers.ParksLayer.getLayer());
        await ProjectedData2dScene.view.addLayers(ProjectedData2dScene.layers);

        ProjectedData2dScene.ready = true;
    },
};
