import * as itowns from 'itowns';
import * as THREE from 'three';
import type { LayerPromiseType } from '../Types/LayerPromiseType';
import { getSource } from '../Sources/BuildingsSource';

export const BuildingsLayer3D: LayerPromiseType = {
    id: 'VTBuilding3D',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: (meshCallback?: (mesh: THREE.Mesh) => void) => {
        if (BuildingsLayer3D.cachedLayer) {
            return Promise.resolve(BuildingsLayer3D.cachedLayer);
        }
        if (!BuildingsLayer3D.layerPromise) {
            BuildingsLayer3D.layerPromise = (async () => {
                BuildingsLayer3D.cachedLayer = new itowns.FeatureGeometryLayer(
                    BuildingsLayer3D.id, {
                        // @ts-expect-error source property undefined
                        source: await getSource(),
                        zoom: { min: 15 },
                        onMeshCreated: meshCallback,
                        accurate: false,
                        style: {
                            fill: {
                                base_altitude: (p: { alti_sol: number }) => p.alti_sol || 0,
                                extrusion_height: (p: { hauteur: number }) => p.hauteur || 0,
                            },
                        },
                    });
                return BuildingsLayer3D.cachedLayer;
            })();
        }
        return BuildingsLayer3D.layerPromise;
    },
};
