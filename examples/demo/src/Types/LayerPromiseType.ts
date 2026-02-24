import * as THREE from 'three';
import type LayerType from './LayerType';

type LayerPromiseType = {
    id: string,
    layerPromise: Promise<LayerType> | undefined,
    cachedLayer: LayerType | undefined,
    getLayer:
        ((meshCallback?: (mesh: THREE.Mesh) => void) => Promise<LayerType>),
    getPickingInfo?:(feature: unknown) => Record<string, string> | null,
};

export default LayerPromiseType;
