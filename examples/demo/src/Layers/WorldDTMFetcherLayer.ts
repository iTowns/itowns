import * as itowns from 'itowns';
import type { LayerPromiseTypeNoParams } from '../Types';
import { WorldDTMFetcherSource } from '../Sources';

export const WorldDTMFetcherLayer: LayerPromiseTypeNoParams = {
    id: 'WORLD_DTM',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (WorldDTMFetcherLayer.cachedLayer) {
            return Promise.resolve(WorldDTMFetcherLayer.cachedLayer);
        }
        if (!WorldDTMFetcherLayer.layerPromise) {
            WorldDTMFetcherLayer.layerPromise = (async () => {
                WorldDTMFetcherLayer.cachedLayer = new itowns.ElevationLayer(
                    WorldDTMFetcherLayer.id,
                    await WorldDTMFetcherSource.getFetcherConfig(),
                );
                return WorldDTMFetcherLayer.cachedLayer;
            })();
        }
        return WorldDTMFetcherLayer.layerPromise;
    },
};


