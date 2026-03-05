import * as itowns from 'itowns';
import * as THREE from 'three';
import type { LayerPromiseTypeNoParams } from '../Types';
import { TreesSource } from '../Sources';

export const TreesLayer: LayerPromiseTypeNoParams = {
    id: 'Trees3D',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (TreesLayer.cachedLayer) {
            return Promise.resolve(TreesLayer.cachedLayer);
        }
        if (!TreesLayer.layerPromise) {
            // Load a glTF resource
            const gltfLoader = new itowns.iGLTFLoader();

            TreesLayer.layerPromise = new Promise((resolve) => {
                gltfLoader.load(
                // resource URL
                    'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/models/tree/tree.glb',

                    // called when the resource is loaded
                    async (gltf: { scene: THREE.Scene }) => {
                        const model = gltf.scene;

                        model.rotateX(Math.PI / 2.0);
                        gltf.scene.position.z = 165;
                        model.scale.set(2, 2, 2);

                        const styleModel3D = {
                            point: {
                                model: {
                                    object: model,
                                },
                            },
                        };

                        TreesLayer.cachedLayer = new itowns.FeatureGeometryLayer(
                            TreesLayer.id,
                            {
                            // @ts-expect-error source property undefined
                                source: await TreesSource.getSource(),
                                style: styleModel3D,
                                zoom: { min: 7, max: 21 },
                            },
                        );

                        resolve(TreesLayer.cachedLayer);
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
        return TreesLayer.layerPromise;
    },
};
