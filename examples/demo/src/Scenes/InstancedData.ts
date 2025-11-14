import * as itowns from 'itowns';
import * as THREE from 'three';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import * as ParksLayer from '../Layers/ParksLayer';
import * as FlatBuildingsLayer from '../Layers/FlatBuildingsLayer';
import * as BuildingsLayer3D from '../Layers/BuildingsLayer3D';
import * as TreesLayer from '../Layers/TreesLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

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
        const view = Scene.view.getView();
        const ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        view.scene.add(ambLight);

        function scaleZ(mesh: THREE.Mesh) {
            mesh.children.forEach((c) => {
                c.scale.z = 0.01;
                Scene.meshes!.push(c);
            });
        }

        const orthoLayer = await OrthoLayer.getLayer();
        const ignMntLayer = await IgnMntLayer.getLayer();
        const ignMntHighResLayer = await IgnMntHighResLayer.getLayer();
        const parksLayer = await ParksLayer.getLayer();
        const flatBuildingsLayer = await FlatBuildingsLayer.getLayer();
        const buildingsLayer3D = await BuildingsLayer3D.getLayer(scaleZ);
        const treesLayer = await TreesLayer.getLayer();

        Scene.layers.push(orthoLayer);
        Scene.layers.push(ignMntLayer);
        Scene.layers.push(ignMntHighResLayer);
        Scene.layers.push(parksLayer);
        Scene.layers.push(flatBuildingsLayer);
        Scene.layers.push(buildingsLayer3D as unknown as itowns.Layer);
        Scene.layers.push(treesLayer as unknown as itowns.Layer);

        await view.addLayer(orthoLayer);
        await view.addLayer(ignMntLayer);
        await view.addLayer(ignMntHighResLayer);
        await view.addLayer(parksLayer);
        await view.addLayer(flatBuildingsLayer);
        await view.addLayer(buildingsLayer3D);
        await view.addLayer(treesLayer);

        Scene.ready = true;
    },
    onEnter: () => {
        Scene.view.getView().addFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, Scene.event);
    },
    onExit: () => {
        Scene.view.getView().removeFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER, Scene.event);
    },
};
