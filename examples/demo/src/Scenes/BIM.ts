import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as OrthoLayer from '../Layers/OrthoLayer';
import * as IgnMntLayer from '../Layers/IgnMntLayer';
import * as IgnMntHighResLayer from '../Layers/IgnMntHighResLayer';
import View3D from '../Views/View3D';
import type { Scene as SceneType } from './Scene';

export const Scene: SceneType & { model: THREE.Object3D | null } = {
    title: 'BIM',
    description: 'Scene demonstrating BIM visualization.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.76633, 45.706118),
        range: 1000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    atmosphere: false,
    ready: false,
    model: null,
    onCreate: async () => {
        const view = Scene.view.getView();

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(view.renderer);
        view.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        Scene.layers.push(await OrthoLayer.getLayer());
        Scene.layers.push(await IgnMntLayer.getLayer());
        Scene.layers.push(await IgnMntHighResLayer.getLayer());

        await Scene.view.addLayers(Scene.layers);

        // Load a glTF resource
        const gltfLoader = new itowns.iGLTFLoader();

        const modelLoaderPromise = new Promise<THREE.Object3D>((resolve) => {
            gltfLoader.load(
                // resource URL
                'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/models/wellness_center/wellness_center.glb',

                // called when the resource is loaded
                (gltf: { scene: THREE.Scene }) => {
                    Scene.model = gltf.scene;

                    Scene.model.scale.set(4, 4, 4);

                    const coord = Scene.placement.coord.clone();
                    coord.z = 240; // elevation offset

                    // Position in the view CRS
                    Scene.model!.position.copy(coord.as(view.referenceCrs).toVector3());

                    // Align glTF's Y-up to the local ground normal
                    Scene.model!.quaternion.setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        coord.geodesicNormal,
                    );

                    const rotation = [0, 125, 0];
                    const eulerRot = new THREE.Euler(
                        THREE.MathUtils.degToRad(rotation[2]),
                        -THREE.MathUtils.degToRad(rotation[1]),
                        -THREE.MathUtils.degToRad(rotation[0]), 'ZYX',
                    );
                    Scene.model!.quaternion.multiply(new THREE.Quaternion().setFromEuler(eulerRot));

                    // Notify that the model has been updated
                    Scene.model!.updateMatrixWorld(true);
                    resolve(Scene.model!);
                },

                // called while loading is progressing
                () => {
                },

                (error: Error) => {
                    console.error('An error happened while loading the BIM.', error);
                },
            );
        });

        await modelLoaderPromise;

        Scene.ready = true;
    },
    onEnter: async () => {
        const view = Scene.view.getView();
        view.scene.add(Scene.model!);
    },
    onExit: () => {
        const view = Scene.view.getView();
        view.scene.remove(Scene.model!);
    },
};
