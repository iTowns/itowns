import * as itowns from 'itowns';
import * as THREE from 'three';

let layerPromise: Promise<itowns.FeatureGeometryLayer>;
let cachedLayer: itowns.FeatureGeometryLayer | undefined;

export async function getLayer() {
    if (cachedLayer) {
        return Promise.resolve(cachedLayer);
    }
    if (!layerPromise) {
        const treesSource = new itowns.FileSource({
            url: 'https://data.grandlyon.com/fr/geoserv/ogc/features/v1/collections/metropole-de-lyon:abr_arbres_alignement.abrarbre/items?&f=application/geo%2Bjson&crs=EPSG:4326&startIndex=0&sortby=gid&limit=20000',
            crs: 'EPSG:4326',
            fetcher: itowns.Fetcher.json,
            parser: itowns.GeoJsonParser.parse,
        });

        // Load a glTF resource
        const gltfLoader = new itowns.iGLTFLoader();

        layerPromise = new Promise((resolve) => {
            gltfLoader.load(
                // resource URL
                './assets/tree.glb',

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

                    cachedLayer = new itowns.FeatureGeometryLayer(
                        'Trees3D',
                        {
                            // @ts-expect-error source property undefined
                            source: treesSource,
                            style: styleModel3D,
                            zoom: { min: 7, max: 21 },
                        },
                    );

                    resolve(cachedLayer);
                },

                // called while loading is progressing
                () => {
                },

                (error: Error) => {
                    console.error('An error happened while loading the 3D model of tree.', error);
                },
            );
        });
    }
    return layerPromise;
}
