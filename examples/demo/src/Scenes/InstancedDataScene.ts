import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as Layers from '../Layers';
import { View3D } from '../Views';
import type { SceneType } from '../Types';

export const InstancedDataScene: SceneType = {
    title: 'Populate Your City Model',
    description: 'Add thousands of 3D objects efficiently using instancing. '
    + 'Perfect for trees, street furniture, or any repeating elements.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.828, 45.7254),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: undefined,
    meshes: [],
    ready: false,
    getView: () => {
        if (!InstancedDataScene.view) {
            throw new Error('Instanced Data Scene view is not initialized');
        }
        return InstancedDataScene.view;
    },
    getItownsView: () => InstancedDataScene.getView().getItownsView(),
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
            InstancedDataScene.getItownsView()
                .notifyChange(InstancedDataScene.getItownsView().camera3D, true);
        }
    },
    onCreate: async () => {
        if (InstancedDataScene.ready) {
            return;
        }
        InstancedDataScene.view = new View3D();

        const itownsView = InstancedDataScene.getItownsView();

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(itownsView.renderer);
        itownsView.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        function scaleZ(mesh: THREE.Mesh) {
            mesh.children.forEach((c) => {
                c.scale.z = 0.01;
                InstancedDataScene.meshes!.push(c);
            });
        }

        InstancedDataScene.layers.push(await Layers.OrthoFetcherLayer.getLayer());
        InstancedDataScene.layers.push(await Layers.WorldDTMFetcherLayer.getLayer());
        InstancedDataScene.layers.push(await Layers.IgnMntHighResFetcherLayer.getLayer());
        InstancedDataScene.layers.push(await Layers.FlatBuildingsLayer.getLayer());
        InstancedDataScene.layers.push(await Layers.ParksLayer.getLayer());
        InstancedDataScene.layers.push(await Layers.Buildings3dLayer.getLayer(scaleZ));
        InstancedDataScene.layers.push(await Layers.TreesLayer.getLayer());

        await InstancedDataScene.view.addLayers(InstancedDataScene.layers);

        InstancedDataScene.ready = true;
    },
    onEnter: async () => {
        InstancedDataScene.getItownsView().addFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, InstancedDataScene.event);
    },
    onExit: async () => {
        InstancedDataScene.getItownsView().removeFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, InstancedDataScene.event);
    },
};
