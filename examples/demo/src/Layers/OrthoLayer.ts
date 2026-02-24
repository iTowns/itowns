import * as itowns from 'itowns';
import type { LayerPromiseType, FetcherConfigType } from '../Types';

export const OrthoLayer: LayerPromiseType = {
    id: 'Ortho',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (OrthoLayer.cachedLayer) {
            return Promise.resolve(OrthoLayer.cachedLayer);
        }
        if (!OrthoLayer.layerPromise) {
            OrthoLayer.layerPromise =
            (itowns.Fetcher.json('../layers/JSONLayers/Ortho.json') as Promise<FetcherConfigType>)
                .then((config) => {
                    config.source = new itowns.WMTSSource(config.source);
                    OrthoLayer.cachedLayer = new itowns.ColorLayer(OrthoLayer.id, config);
                    return OrthoLayer.cachedLayer;
                });
        }
        return OrthoLayer.layerPromise;
    },
};
