import * as itowns from 'itowns';
import * as THREE from 'three';
import type { LayerPromiseType } from '../Types/LayerPromiseType';

export const TreesLayer: LayerPromiseType = {
    id: 'Trees3D',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (TreesLayer.cachedLayer) {
            return Promise.resolve(TreesLayer.cachedLayer);
        }
        if (!TreesLayer.layerPromise) {
            const treesSource = new itowns.FileSource({
                url: 'https://data.grandlyon.com/fr/geoserv/ogc/features/v1/collections/metropole-de-lyon:abr_arbres_alignement.abrarbre/items?&f=application/geo%2Bjson&crs=EPSG:4326&startIndex=0&sortby=gid&limit=15000',
                crs: 'EPSG:4326',
                fetcher: itowns.Fetcher.json,
                parser: itowns.GeoJsonParser.parse,
            });

            // Load a glTF resource
            const gltfLoader = new itowns.iGLTFLoader();

            TreesLayer.layerPromise = new Promise((resolve) => {
                gltfLoader.load(
                // resource URL
                    'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/models/tree/tree.glb',

                    // called when the resource is loaded
                    (gltf: { scene: THREE.Scene }) => {
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
                                source: treesSource,
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
