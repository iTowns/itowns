import * as itowns from 'itowns';

let layerPromise = null;
let cachedLayer = null;

export function getLayer() {
    if (cachedLayer) {
        return Promise.resolve(cachedLayer);
    }
    if (!layerPromise) {
        layerPromise = itowns.Fetcher.json('../layers/JSONLayers/Ortho.json').then((config) => {
            config.source = new itowns.WMTSSource(config.source);
            cachedLayer = new itowns.ColorLayer('Ortho', config);
            return cachedLayer;
        });
    }
    return layerPromise;
}
