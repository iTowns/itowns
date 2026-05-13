import * as itowns from 'itowns';
import * as THREE from 'three';
import type { LayerPromiseTypeMeshCallback } from '../Types';
import { BuildingsWFSSource } from '../Sources';

export const BuildingsWFSLayer: LayerPromiseTypeMeshCallback = {
    id: 'BuildingsWFSLayer',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: (meshCallback: (mesh: THREE.Mesh) => void) => {
        if (BuildingsWFSLayer.cachedLayer) {
            return Promise.resolve(BuildingsWFSLayer.cachedLayer);
        }
        if (!BuildingsWFSLayer.layerPromise) {
            BuildingsWFSLayer.layerPromise = (async () => {
                BuildingsWFSLayer.cachedLayer = new itowns.FeatureGeometryLayer(
                    BuildingsWFSLayer.id, {
                        // @ts-expect-error source property undefined
                        source: await BuildingsWFSSource.getSource(),
                        zoom: { min: 15 },
                        onMeshCreated: meshCallback,
                        accurate: false,
                        style: {
                            fill: {
                                base_altitude: (properties: { altitude_minimale_sol: number }) =>
                                    properties.altitude_minimale_sol - 3 || 0,
                                extrusion_height: (properties: { hauteur: number }) =>
                                    properties.hauteur + 3 || 0,
                            },
                        },
                    });
                return BuildingsWFSLayer.cachedLayer;
            })();
        }
        return BuildingsWFSLayer.layerPromise;
    },
};
