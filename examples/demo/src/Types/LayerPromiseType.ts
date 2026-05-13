import * as itowns from 'itowns';
import * as THREE from 'three';
import type LayerType from './LayerType';

// Base properties shared by all layer promise types
type LayerPromiseTypeBase = {
    id: string;
    layerPromise: Promise<LayerType> | undefined;
    cachedLayer: LayerType | undefined;
    getPickingInfo?: (feature: unknown) => Record<string, string> | null;
};

// Layer that doesn't require any parameters
export type LayerPromiseTypeNoParams = LayerPromiseTypeBase & {
    getLayer: () => Promise<LayerType>;
};

// Layer that requires CRS parameter
export type LayerPromiseTypeCRS = LayerPromiseTypeBase & {
    getLayer: (crs: string) => Promise<LayerType>;
};

// Layer that requires extent parameter
export type LayerPromiseTypeExtent = LayerPromiseTypeBase & {
    getLayer: (extent: itowns.Extent) => Promise<LayerType>;
};

// Layer that requires meshCallback parameter
export type LayerPromiseTypeMeshCallback = LayerPromiseTypeBase & {
    getLayer: (meshCallback: (mesh: THREE.Mesh) => void) => Promise<LayerType>;
};

// Layer that requires panoChangeCallback parameter
export type LayerPromiseTypeCRSPanoChangeCallback = LayerPromiseTypeBase & {
    getLayer: (crs: string, onPanoChanged: (e: {
                    previousPanoPosition: THREE.Vector3,
                    currentPanoPosition: THREE.Vector3,
                    nextPanoPosition: THREE.Vector3,
                }) => void) => Promise<LayerType>;
};

export type LayerPromiseType =
    LayerPromiseTypeNoParams |
    LayerPromiseTypeCRS |
    LayerPromiseTypeExtent |
    LayerPromiseTypeMeshCallback |
    LayerPromiseTypeCRSPanoChangeCallback;
