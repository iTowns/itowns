import * as itowns from 'itowns';

let sourcePromise: Promise<itowns.WFSSource>;
let cachedSource: itowns.WFSSource | undefined;

export async function getSource() {
    if (cachedSource) {
        return Promise.resolve(cachedSource);
    }
    if (!sourcePromise) {
        sourcePromise = (async () => {
            cachedSource = new itowns.WFSSource({
                url: 'https://data.geopf.fr/wfs/ows?',
                version: '2.0.0',
                typeName: 'BDTOPO_V3:batiment',
                crs: 'EPSG:4326',
                ipr: 'IGN',
                format: 'application/json',
                extent: {
                    west: 2.334,
                    east: 2.335,
                    south: 48.849,
                    north: 48.851,
                },
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
