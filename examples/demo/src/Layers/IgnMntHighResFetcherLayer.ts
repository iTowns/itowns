import * as itowns from 'itowns';
import type { LayerPromiseTypeNoParams } from '../Types';
import { IgnMntHighResFetcherSource } from '../Sources';

export const IgnMntHighResFetcherLayer: LayerPromiseTypeNoParams = {
    id: 'IGN_MNT_HIGHRES',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (IgnMntHighResFetcherLayer.cachedLayer) {
            return Promise.resolve(IgnMntHighResFetcherLayer.cachedLayer);
        }
        if (!IgnMntHighResFetcherLayer.layerPromise) {
            IgnMntHighResFetcherLayer.layerPromise = (async () => {
                IgnMntHighResFetcherLayer.cachedLayer = new itowns.ElevationLayer(
                    IgnMntHighResFetcherLayer.id,
                    await IgnMntHighResFetcherSource.getFetcherConfig(),
                );
                return IgnMntHighResFetcherLayer.cachedLayer;
            })();
        }
        return IgnMntHighResFetcherLayer.layerPromise;
    },
};

