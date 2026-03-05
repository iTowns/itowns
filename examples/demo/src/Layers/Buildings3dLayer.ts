import * as itowns from 'itowns';
import * as THREE from 'three';
import type { LayerPromiseTypeMeshCallback } from '../Types';
import { BuildingsSource } from '../Sources';

export const Buildings3dLayer: LayerPromiseTypeMeshCallback = {
    id: 'VTBuilding3D',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: (meshCallback?: (mesh: THREE.Mesh) => void) => {
        if (Buildings3dLayer.cachedLayer) {
            return Promise.resolve(Buildings3dLayer.cachedLayer);
        }
        if (!Buildings3dLayer.layerPromise) {
            Buildings3dLayer.layerPromise = (async () => {
                Buildings3dLayer.cachedLayer = new itowns.FeatureGeometryLayer(
                    Buildings3dLayer.id, {
                        // @ts-expect-error source property undefined
                        source: await BuildingsSource.getSource(),
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
                return Buildings3dLayer.cachedLayer;
            })();
        }
        return Buildings3dLayer.layerPromise;
    },
    getPickingInfo(feature) {
        const properties = feature as {
            object: {
                feature: {
                    id: string,
                    geometries: {
                        properties: {
                            alti_sol: string,
                            hauteur: string,
                            isole: string,
                            niveau: string,
                            symbo: string,
                            territoire: string,
                        }
                    }[]
                }
            }
        };

        return {
            ID: properties.object.feature.id,
            'Ground altitude': properties.object.feature.geometries[0].properties.alti_sol,
            Height: properties.object.feature.geometries[0].properties.hauteur,
            Isolated: properties.object.feature.geometries[0].properties.isole,
            Level: properties.object.feature.geometries[0].properties.niveau,
            Symbol: properties.object.feature.geometries[0].properties.symbo,
            Territory: properties.object.feature.geometries[0].properties.territoire,
        };
    },
};
