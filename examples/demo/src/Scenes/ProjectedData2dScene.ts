import * as itowns from 'itowns';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

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

        ProjectedData2dScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.flatBuildingsLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.parksLayer.getLayer());
        await ProjectedData2dScene.view.addLayers(ProjectedData2dScene.layers);

        ProjectedData2dScene.ready = true;
    },
};
