import * as THREE from 'three';
import type { LayerType } from './LayerType';

export type LayerPromiseType = {
    id: string,
    layerPromise: Promise<LayerType> | undefined,
    cachedLayer: LayerType | undefined,
    getLayer:
        ((meshCallback?: (mesh: THREE.Mesh) => void) => Promise<LayerType>),
};
