import * as itowns from 'itowns';

let layerPromise = null;
let cachedLayer = null;

export function getLayer() {
    if (cachedLayer) {
        return Promise.resolve(cachedLayer);
    }
    if (!layerPromise) {
        layerPromise = itowns.Fetcher.json('../layers/JSONLayers/IGN_MNT_HIGHRES.json').then((config) => {
            config.source = new itowns.WMTSSource(config.source);
            cachedLayer = new itowns.ElevationLayer(config.id, config);
            return cachedLayer;
        });
    }
    return layerPromise;
}
