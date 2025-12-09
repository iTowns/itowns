import * as itowns from 'itowns';
import type { LayerPromiseType, FetcherConfigType } from '../Types';

export const IgnMntHighResLayer: LayerPromiseType = {
    id: 'IGN_MNT_HIGHRES',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (IgnMntHighResLayer.cachedLayer) {
            return Promise.resolve(IgnMntHighResLayer.cachedLayer);
        }
        if (!IgnMntHighResLayer.layerPromise) {
            IgnMntHighResLayer.layerPromise =
            (itowns.Fetcher.json(`../layers/JSONLayers/${IgnMntHighResLayer.id}.json`) as
            Promise<FetcherConfigType>)
                .then((config) => {
                    config.source = new itowns.WMTSSource(config.source);
                    IgnMntHighResLayer.cachedLayer = new itowns.ElevationLayer(config.id, config);
                    return IgnMntHighResLayer.cachedLayer;
                });
        }
        return IgnMntHighResLayer.layerPromise;
    },
};
