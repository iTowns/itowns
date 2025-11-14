import * as itowns from 'itowns';
import * as THREE from 'three';
// @ts-expect-error debug imported from import-map
// eslint-disable-next-line import/no-unresolved
import * as debug from 'debug';
// @ts-expect-error lil imported from import-map
// eslint-disable-next-line import/no-unresolved
import lil from 'lil';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as ParksLayer from '../Layers/ParksLayer';
import * as FlatBuildingsLayer from '../Layers/FlatBuildingsLayer';
import PointCloudView from '../Views/PointCloudView';
import type { Scene as SceneType } from './Scene';

const gui = new lil();
gui.hide();

export const Scene: SceneType = {
    title: 'Point Cloud Visualization',
    description: 'Scene demonstrating point cloud visualization using COPC format.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.828, 45.7254),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new PointCloudView(),
    ready: false,
    onCreate: async () => {
        const view = Scene.view.getView();

        const orthoLayer = await OrthoLayer.getLayer();
        const ignMntLayer = await IgnMntLayer.getLayer();
        const ignMntHighResLayer = await IgnMntHighResLayer.getLayer();
        const flatBuildingsLayer = await FlatBuildingsLayer.getLayer();
        const parksLayer = await ParksLayer.getLayer();

        Scene.layers.push(orthoLayer);
        Scene.layers.push(ignMntLayer);
        Scene.layers.push(ignMntHighResLayer);
        Scene.layers.push(flatBuildingsLayer);
        Scene.layers.push(parksLayer);

        await view.addLayer(orthoLayer);
        await view.addLayer(ignMntLayer);
        await view.addLayer(ignMntHighResLayer);
        await view.addLayer(flatBuildingsLayer);
        await view.addLayer(parksLayer);

        const source = new itowns.CopcSource({
            url: 'https://data.geopf.fr/telechargement/download/LiDARHD-NUALID/NUALHD_1-0__LAZ_LAMB93_OL_2025-02-20/LHD_FXX_0844_6520_PTS_LAMB93_IGN69.copc.laz',
        });
        const config = {
            source,
            crs: view.referenceCrs,
            sseThreshold: 0,
            pointBudget: 3000000,
        };
        const pointCloudLayer = new itowns.CopcLayer('PointCloudLayer', config);
        Scene.layers.push(pointCloudLayer as unknown as itowns.Layer);
        await view.addLayer(pointCloudLayer);

        Scene.ready = true;
    },
    onEnter: async () => {
        const view = Scene.view.getView();
        const layer = view.getLayerById('PointCloudLayer');
        const camera = view.camera.camera3D;

        const lookAt = new THREE.Vector3();
        const size = new THREE.Vector3();
        layer.root.bbox.getSize(size);
        layer.root.bbox.getCenter(lookAt);
        lookAt.x += size.x / 2;
        lookAt.y += size.y / 2;

        // @ts-expect-error camera.far undefined
        camera.far = 3.0 * size.length();
        const controls = (Scene.view as PointCloudView).getControls();
        controls.groundLevel = layer.root.bbox.min.z;
        const position = layer.root.bbox.min.clone().add(
            size.multiply({ x: 1.5, y: 1.5, z: size.x / size.z }),
        );

        // @ts-expect-error camera.position undefined
        camera.position.copy(position);
        // @ts-expect-error camera.lookAt undefined
        camera.lookAt(lookAt);
        // @ts-expect-error camera.updateProjectionMatrix undefined
        camera.updateProjectionMatrix();

        view.notifyChange(camera);
        gui.show();

        debug.PointCloudDebug.initTools(view, layer, gui);
    },
    onExit: async () => {
        gui.reset();
        gui.hide();
    },
};
