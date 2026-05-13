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
                typeName: 'BDCARTO_V5:zone_d_habitation',
                crs: 'EPSG:2154',
                ipr: 'IGN',
                format: 'application/json',
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
