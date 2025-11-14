import * as itowns from 'itowns';

let layerPromise: Promise<itowns.ColorLayer>;
let cachedLayer: itowns.ColorLayer;

type Config = {
    id: string;
    source: itowns.WMTSSource;
    noDataValue?: number | undefined;
    clampValues?: {
        min?: number | undefined;
        max?: number | undefined;
    } | undefined;
};

export function getLayer() {
    if (cachedLayer) {
        return Promise.resolve(cachedLayer);
    }
    if (!layerPromise) {
        layerPromise =
        (itowns.Fetcher.json('../layers/JSONLayers/Ortho.json') as Promise<Config>)
            .then((config) => {
                config.source = new itowns.WMTSSource(config.source);
                cachedLayer = new itowns.ColorLayer('Ortho', config);
                return cachedLayer;
            });
    }
    return layerPromise;
}
