import * as itowns from 'itowns';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

export const ProjectedData2dScene: SceneType = {
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
    ready: false,
    onCreate: async () => {
        ProjectedData2dScene.view = new View3D();

        ProjectedData2dScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.flatBuildingsLayer.getLayer());
        ProjectedData2dScene.layers.push(await LayerRepository.parksLayer.getLayer());
        await ProjectedData2dScene.view.addLayers(ProjectedData2dScene.layers);

        ProjectedData2dScene.ready = true;
    },
    onEnter() {
    },
    onExit() {
    },
};
