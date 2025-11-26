import * as itowns from 'itowns';
import type { LayerPromiseType } from '../Types/LayerPromiseType';
import type { FetcherConfigType } from '../Types/FetcherConfigType';

export const WordDTMLayer: LayerPromiseType = {
    id: 'WORLD_DTM',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (WordDTMLayer.cachedLayer) {
            return Promise.resolve(WordDTMLayer.cachedLayer);
        }
        if (!WordDTMLayer.layerPromise) {
            WordDTMLayer.layerPromise =
            (itowns.Fetcher.json(
                `../layers/JSONLayers/${WordDTMLayer.id}.json`) as Promise<FetcherConfigType>)
                .then((config) => {
                    config.source = new itowns.WMTSSource(config.source);
                    WordDTMLayer.cachedLayer = new itowns.ElevationLayer(config.id, config);
                    return WordDTMLayer.cachedLayer;
                });
        }
        return WordDTMLayer.layerPromise;
    },
};
