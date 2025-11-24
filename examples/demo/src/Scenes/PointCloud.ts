import * as itowns from 'itowns';
// @ts-expect-error debug imported from import-map
// eslint-disable-next-line import/no-unresolved
import * as debug from 'debug';
// @ts-expect-error lil imported from import-map
// eslint-disable-next-line import/no-unresolved
import lil from 'lil';
import View3D from '../Views/View3D';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType = {
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
    gui: new lil(),
    atmosphere: false,
    ready: false,
    onCreate: async () => {
        const view = Scene.view.getView();

        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());

        await Scene.view.addLayers(Scene.layers);

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
        Scene.layers.push(pointCloudLayer);
        await itowns.View.prototype.addLayer.call(view, pointCloudLayer);

        debug.PointCloudDebug.initTools(view, pointCloudLayer, Scene.gui);
        Scene.ready = true;
    },
    onEnter: async () => {
        Scene.gui.show();
    },
    onExit: async () => {
        Scene.gui.reset();
        Scene.gui.hide();
    },
};

Scene.gui.hide();
