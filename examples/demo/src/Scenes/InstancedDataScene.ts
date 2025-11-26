import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

export const InstancedDataScene: SceneType = {
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
        if (InstancedDataScene.meshes!.length) {
            for (let i = 0; i < InstancedDataScene.meshes!.length; i++) {
                const mesh = InstancedDataScene.meshes![i];
                if (mesh && mesh.scale.z < 1) {
                    mesh.scale.z = Math.min(1.0, mesh.scale.z + 0.005);
                    mesh.updateMatrixWorld(true);
                }
            }
            InstancedDataScene.meshes = InstancedDataScene.meshes!.filter(m => m.scale.z < 1);
            InstancedDataScene.view.getView()
                .notifyChange(InstancedDataScene.view.getView().camera3D, true);
        }
    },
    onCreate: async () => {
        if (InstancedDataScene.ready) {
            return;
        }
        InstancedDataScene.view = new View3D();

        const view = InstancedDataScene.view.getView();

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(view.renderer);
        view.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        function scaleZ(mesh: THREE.Mesh) {
            mesh.children.forEach((c) => {
                c.scale.z = 0.01;
                InstancedDataScene.meshes!.push(c);
            });
        }

        InstancedDataScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        InstancedDataScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        InstancedDataScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());
        InstancedDataScene.layers.push(await LayerRepository.flatBuildingsLayer.getLayer());
        InstancedDataScene.layers.push(await LayerRepository.parksLayer.getLayer());
        InstancedDataScene.layers.push(await LayerRepository.buildingsLayer3D.getLayer(scaleZ));
        InstancedDataScene.layers.push(await LayerRepository.treesLayer.getLayer());

        await InstancedDataScene.view.addLayers(InstancedDataScene.layers);

        InstancedDataScene.ready = true;
    },
    onEnter: async () => {
        InstancedDataScene.view.getView().addFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, InstancedDataScene.event);
    },
    onExit: async () => {
        InstancedDataScene.view.getView().removeFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, InstancedDataScene.event);
    },
};
