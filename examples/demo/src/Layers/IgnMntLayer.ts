import * as itowns from 'itowns';
import type { LayerPromiseType } from '../Types/LayerPromiseType';
import type { FetcherConfigType } from '../Types/FetcherConfigType';

export const IgnMntLayer: LayerPromiseType = {
    id: 'IGN_MNT',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (IgnMntLayer.cachedLayer) {
            return Promise.resolve(IgnMntLayer.cachedLayer);
        }
        if (!IgnMntLayer.layerPromise) {
            IgnMntLayer.layerPromise =
            (itowns.Fetcher.json(
                `../layers/JSONLayers/${IgnMntLayer.id}.json`) as Promise<FetcherConfigType>)
                .then((config) => {
                    config.source = new itowns.WMTSSource(config.source);
                    IgnMntLayer.cachedLayer = new itowns.ElevationLayer(config.id, config);
                    return IgnMntLayer.cachedLayer;
                });
        }
        return IgnMntLayer.layerPromise;
    },
};
