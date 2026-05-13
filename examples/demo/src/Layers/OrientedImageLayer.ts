import * as itowns from 'itowns';
import * as THREE from 'three';
import type { LayerPromiseTypeCRSPanoChangeCallback } from '../Types';
import { OrientedImageSource } from '../Sources';

export const OrientedImageLayer: LayerPromiseTypeCRSPanoChangeCallback = {
    id: 'OrientedImageLayer',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: (crs: string, onPanoChanged: (e: {
                    previousPanoPosition: THREE.Vector3,
                    currentPanoPosition: THREE.Vector3,
                    nextPanoPosition: THREE.Vector3,
                }) => void) => {
        if (OrientedImageLayer.cachedLayer) {
            return Promise.resolve(OrientedImageLayer.cachedLayer);
        }
        if (!OrientedImageLayer.layerPromise) {
            OrientedImageLayer.layerPromise = (async () => {
                OrientedImageLayer.cachedLayer = new itowns.OrientedImageLayer(
                    OrientedImageLayer.id, {
                        source: await OrientedImageSource.getSource(),
                        crs,
                        onPanoChanged,
                        backgroundDistance: 1200,
                        // @ts-expect-error useMask property used
                        // but not defined in OrientedImageLayerOptions
                        useMask: false,
                    });
                return OrientedImageLayer.cachedLayer;
            })();
        }
        return OrientedImageLayer.layerPromise;
    },
};
