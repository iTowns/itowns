import * as itowns from 'itowns';
import * as THREE from 'three';
// @ts-expect-error FeatureToolTip imported from import-map
// eslint-disable-next-line import/no-unresolved
import * as debug from 'debug';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as ParksLayer from '../Layers/ParksLayer';
import * as FlatBuildingsLayer from '../Layers/FlatBuildingsLayer';
import * as BuildingsLayer3D from '../Layers/BuildingsLayer3D';
import * as TreesLayer from '../Layers/TreesLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

const ambLight = new THREE.AmbientLight(0xffffff, 0.3);

export const Scene: SceneType = {
    title: 'Extruded Data 3D with Trees',
    description: 'Scene demonstrating extruded 3D data with animated growth effect and 3D trees.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.828, 45.7254),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    meshes: [],
    ready: false,
    event: function update(/* dt */) {
        if (Scene.meshes!.length) {
            for (let i = 0; i < Scene.meshes!.length; i++) {
                const mesh = Scene.meshes![i];
                if (mesh && mesh.scale.z < 1) {
                    mesh.scale.z = Math.min(1.0, mesh.scale.z + 0.005);
                    mesh.updateMatrixWorld(true);
                }
            }
            Scene.meshes = Scene.meshes!.filter(m => m.scale.z < 1);
            Scene.view.getView().notifyChange(Scene.view.getView().camera3D, true);
        }
    },
    onCreate: async () => {
        function scaleZ(mesh: THREE.Mesh) {
            mesh.children.forEach((c) => {
                c.scale.z = 0.01;
                Scene.meshes!.push(c);
            });
        }

        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());
        Scene.layers.push(await FlatBuildingsLayer.getLayer());
        Scene.layers.push(await ParksLayer.getLayer());
        Scene.layers.push(await BuildingsLayer3D.getLayer(scaleZ) as unknown as itowns.Layer);
        Scene.layers.push(await TreesLayer.getLayer() as unknown as itowns.Layer);

        await Scene.view.addLayers(Scene.layers);

        Scene.ready = true;
    },
    onEnter: () => {
        const view = Scene.view.getView();
        const gui = Scene.view.getGuiTools().gui;

        view.scene.add(ambLight);

        debug.GeometryDebug.createGeometryDebugUI(
            gui, view, Scene.layers[5]);
        const subfolder = gui.hasFolder(`Layer ${Scene.layers[5].id}`);
        debug.GeometryDebug.addWireFrameCheckbox(
            subfolder || gui,
            view, Scene.layers[5]);

        debug.GeometryDebug.createGeometryDebugUI(
            gui, view, Scene.layers[6]);

        view.addFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, Scene.event);
    },
    onExit: () => {
        const view = Scene.view.getView();

        view.scene.remove(ambLight);

        view.removeFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, Scene.event);
    },
};
