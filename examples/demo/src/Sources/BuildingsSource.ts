import * as itowns from 'itowns';

let sourcePromise: Promise<itowns.VectorTilesSource>;
let cachedSource: itowns.VectorTilesSource | undefined;

export async function getSource() {
    if (cachedSource) {
        return Promise.resolve(cachedSource);
    }
    if (!sourcePromise) {
        sourcePromise = (async () => {
            cachedSource = new itowns.VectorTilesSource({
                style: 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json',
                // @ts-expect-error filter property undefined
                filter: (layer: {
                    'source-layer': string,
                    paint: { 'fill-color': unknown },
                }) => layer['source-layer'].includes('bati_surf')
                        && layer.paint['fill-color'],
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
