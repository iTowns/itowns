import * as itowns from 'itowns';
import type { LayerPromiseType, FetcherConfigType } from '../Types';

export const WorldDTMLayer: LayerPromiseType = {
    id: 'WORLD_DTM',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (WorldDTMLayer.cachedLayer) {
            return Promise.resolve(WorldDTMLayer.cachedLayer);
        }
        if (!WorldDTMLayer.layerPromise) {
            WorldDTMLayer.layerPromise =
            (itowns.Fetcher.json(
                `../layers/JSONLayers/${WorldDTMLayer.id}.json`) as Promise<FetcherConfigType>)
                .then((config) => {
                    config.source = new itowns.WMTSSource(config.source);
                    WorldDTMLayer.cachedLayer = new itowns.ElevationLayer(config.id, config);
                    return WorldDTMLayer.cachedLayer;
                });
        }
        return WorldDTMLayer.layerPromise;
    },
};
