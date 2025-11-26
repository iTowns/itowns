import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LayerRepository } from '../Repositories/LayerRepository';
import View3D from '../Views/View3D';
import type { SceneType } from '../Types/SceneType';

export const BIMScene: SceneType & { model: THREE.Object3D | null } = {
    title: 'From Building to Territory',
    description: 'Integrate Building Information Models into your geospatial context. '
    + 'Load glTF models to combine architectural and geographic data.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.76633, 45.706118),
        range: 1000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    ready: false,
    model: null,
    onCreate: async () => {
        if (BIMScene.ready) {
            return;
        }
        BIMScene.view = new View3D();

        const view = BIMScene.view.getView();

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(view.renderer);
        view.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        BIMScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        BIMScene.layers.push(await LayerRepository.ignMntLayer.getLayer());
        BIMScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());

        await BIMScene.view.addLayers(BIMScene.layers);

        // Load a glTF resource
        const gltfLoader = new itowns.iGLTFLoader();

        const modelLoaderPromise = new Promise<THREE.Object3D>((resolve) => {
            gltfLoader.load(
                // resource URL
                'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/models/wellness_center/wellness_center.glb',

                // called when the resource is loaded
                (gltf: { scene: THREE.Scene }) => {
                    BIMScene.model = gltf.scene;

                    BIMScene.model.scale.set(4, 4, 4);

                    const coord = BIMScene.placement.coord.clone();
                    coord.z = 240; // elevation offset

                    // Position in the view CRS
                    BIMScene.model!.position.copy(coord.as(view.referenceCrs).toVector3());

                    // Align glTF's Y-up to the local ground normal
                    BIMScene.model!.quaternion.setFromUnitVectors(
                        new THREE.Vector3(0, 1, 0),
                        coord.geodesicNormal,
                    );

                    const rotation = [0, 125, 0];
                    const eulerRot = new THREE.Euler(
                        THREE.MathUtils.degToRad(rotation[2]),
                        -THREE.MathUtils.degToRad(rotation[1]),
                        -THREE.MathUtils.degToRad(rotation[0]), 'ZYX',
                    );
                    BIMScene.model!.quaternion.multiply(
                        new THREE.Quaternion().setFromEuler(eulerRot));

                    // Notify that the model has been updated
                    BIMScene.model!.updateMatrixWorld(true);
                    resolve(BIMScene.model!);
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

        BIMScene.ready = true;
    },
    onEnter: async () => {
        const view = BIMScene.view.getView();
        view.scene.add(BIMScene.model!);
    },
    onExit: async () => {
        const view = BIMScene.view.getView();
        view.scene.remove(BIMScene.model!);
    },
};
