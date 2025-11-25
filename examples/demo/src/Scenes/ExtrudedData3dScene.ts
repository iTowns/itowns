import * as itowns from 'itowns';
import * as THREE from 'three';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

export const ExtrudedData3dScene: SceneType = {
    title: 'Extruded Data 3D',
    description: 'Scene demonstrating extruded 3D data with animated growth effect.',
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
        if (ExtrudedData3dScene.meshes!.length) {
            for (let i = 0; i < ExtrudedData3dScene.meshes!.length; i++) {
                const mesh = ExtrudedData3dScene.meshes![i];
                if (mesh && mesh.scale.z < 1) {
                    mesh.scale.z = Math.min(1.0, mesh.scale.z + 0.005);
                    mesh.updateMatrixWorld(true);
                }
            }
            ExtrudedData3dScene.meshes = ExtrudedData3dScene.meshes!.filter(m => m.scale.z < 1);
            ExtrudedData3dScene.view.getView()
                .notifyChange(ExtrudedData3dScene.view.getView().camera3D, true);
        }
    },
    onCreate: async () => {
        ExtrudedData3dScene.view = new View3D();

        function scaleZ(mesh: THREE.Mesh) {
            for (let i = 0; i < mesh.children.length; i++) {
                const c = mesh.children[i];
                c.scale.z = 0.01;
                ExtrudedData3dScene.meshes!.push(c);
            }
        }

        ExtrudedData3dScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        ExtrudedData3dScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        ExtrudedData3dScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());
        ExtrudedData3dScene.layers.push(await LayerRepository.flatBuildingsLayer.getLayer());
        ExtrudedData3dScene.layers.push(await LayerRepository.parksLayer.getLayer());
        ExtrudedData3dScene.layers.push(await LayerRepository.buildingsLayer3D.getLayer(scaleZ));

        await ExtrudedData3dScene.view.addLayers(ExtrudedData3dScene.layers);

        ExtrudedData3dScene.ready = true;
    },
    onEnter: () => {
        ExtrudedData3dScene.view.getView().addFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, ExtrudedData3dScene.event);
    },
    onExit: () => {
        ExtrudedData3dScene.view.getView().removeFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, ExtrudedData3dScene.event);
    },
};
