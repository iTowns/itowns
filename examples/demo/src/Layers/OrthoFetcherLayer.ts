import * as itowns from 'itowns';
import type { LayerPromiseTypeNoParams } from '../Types';
import { OrthoFetcherSource } from '../Sources';

export const OrthoFetcherLayer: LayerPromiseTypeNoParams = {
    id: 'OrthoFetcher',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (OrthoFetcherLayer.cachedLayer) {
            return Promise.resolve(OrthoFetcherLayer.cachedLayer);
        }
        if (!OrthoFetcherLayer.layerPromise) {
            OrthoFetcherLayer.layerPromise = (async () => {
                OrthoFetcherLayer.cachedLayer = new itowns.ColorLayer(
                    OrthoFetcherLayer.id,
                    await OrthoFetcherSource.getFetcherConfig(),
                );
                return OrthoFetcherLayer.cachedLayer;
            })();
        }
        return OrthoFetcherLayer.layerPromise;
    },
};
