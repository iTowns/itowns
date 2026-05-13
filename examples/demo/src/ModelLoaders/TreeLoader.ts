import * as itowns from 'itowns';
import * as THREE from 'three';
import type ModelLoaderPromiseType from '../Types/ModelLoaderPromiseType';

export const TreeLoader: ModelLoaderPromiseType = {
    modelPromise: undefined,
    cachedModel: undefined,
    getModel: () => {
        if (TreeLoader.cachedModel) {
            return Promise.resolve(TreeLoader.cachedModel);
        }
        if (!TreeLoader.modelPromise) {
            // Load a glTF resource
            const gltfLoader = new itowns.iGLTFLoader();

            TreeLoader.modelPromise = new Promise((resolve) => {
                gltfLoader.load(
                // resource URL
                    'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/models/tree/tree.glb',

                    // called when the resource is loaded
                    async (gltf: { scene: THREE.Scene }) => {
                        TreeLoader.cachedModel = gltf.scene;
                        resolve(TreeLoader.cachedModel);
                    },

                    // called while loading is progressing
                    () => {
                    },

                    (error: Error) => {
                        console.error(
                            'An error happened while loading the 3D model of tree.', error);
                    },
                );
            });
        }
        return TreeLoader.modelPromise;
    },
};
