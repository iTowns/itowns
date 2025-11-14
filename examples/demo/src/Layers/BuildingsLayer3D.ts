import * as itowns from 'itowns';
import * as THREE from 'three';
import { getSource } from '../Sources/BuildingsSource';

let layerPromise: Promise<itowns.FeatureGeometryLayer>;
let cachedLayer: itowns.FeatureGeometryLayer | undefined;

export async function getLayer(callback?: (mesh: THREE.Mesh) => void) {
    if (cachedLayer) {
        return Promise.resolve(cachedLayer);
    }
    if (!layerPromise) {
        layerPromise = (async () => {
            cachedLayer = new itowns.FeatureGeometryLayer('VTBuilding3D', {
                // @ts-expect-error source property undefined
                source: await getSource(),
                zoom: { min: 15 },
                onMeshCreated: callback,
                accurate: false,
                style: {
                    fill: {
                        base_altitude: (p: { alti_sol: number }) => p.alti_sol || 0,
                        extrusion_height: (p: { hauteur: number }) => p.hauteur || 0,
                    },
                },
            });
            return cachedLayer;
        })();
    }
    return layerPromise;
}
