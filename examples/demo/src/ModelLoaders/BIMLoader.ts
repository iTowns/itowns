import * as itowns from 'itowns';
import * as THREE from 'three';
import type ModelLoaderPromiseType from '../Types/ModelLoaderPromiseType';

export const BIMLoader: ModelLoaderPromiseType = {
    modelPromise: undefined,
    cachedModel: undefined,
    getModel: () => {
        if (BIMLoader.cachedModel) {
            return Promise.resolve(BIMLoader.cachedModel);
        }
        if (!BIMLoader.modelPromise) {
            // Load a glTF resource
            const gltfLoader = new itowns.iGLTFLoader();

            BIMLoader.modelPromise = new Promise((resolve) => {
                gltfLoader.load(
                    // resource URL
                    'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/models/wellness_center/wellness_center.glb',

                    // called when the resource is loaded
                    async (gltf: { scene: THREE.Scene }) => {
                        BIMLoader.cachedModel = gltf.scene;
                        resolve(BIMLoader.cachedModel);
                    },

                    // called while loading is progressing
                    () => {},

                    (error: Error) => {
                        console.error(
                            'An error happened while loading the 3D model of wellness center.',
                            error,
                        );
                    },
                );
            });
        }
        return BIMLoader.modelPromise;
    },
};
