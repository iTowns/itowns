import * as itowns from 'itowns';
import View3D from '../Views/View3D';
import { LayerRepository } from '../Repositories/LayerRepository';
import type { SceneType } from '../Types/SceneType';

export const PointCloudScene: SceneType = {
    title: 'Point Cloud Visualization',
    description: 'Scene demonstrating point cloud visualization using COPC format.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.860377, 45.760213),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    atmosphere: false,
    ready: false,
    onCreate: async () => {
        PointCloudScene.view = new View3D();

        const view = PointCloudScene.view.getView();

        PointCloudScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        PointCloudScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        PointCloudScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());

        await PointCloudScene.view.addLayers(PointCloudScene.layers);

        const source = new itowns.CopcSource({
            url: 'https://data.geopf.fr/telechargement/download/LiDARHD-NUALID/NUALHD_1-0__LAZ_LAMB93_OL_2025-02-20/LHD_FXX_0844_6520_PTS_LAMB93_IGN69.copc.laz',
        });
        const options = {
            mode: 2,
            opacity: 0.5,
        };
        const config = {
            source,
            crs: view.referenceCrs,
            sseThreshold: 4,
            pointBudget: 1000000,
            ...options,
        };
        const pointCloudLayer = new itowns.CopcLayer('PointCloudLayer', config);
        PointCloudScene.layers.push(pointCloudLayer);
        await itowns.View.prototype.addLayer.call(view, pointCloudLayer);

        PointCloudScene.ready = true;
    },
};
