import * as itowns from 'itowns';

let sourcePromise: Promise<itowns.FileSource>;
let cachedSource: itowns.FileSource | undefined;

export async function getSource() {
    if (cachedSource) {
        return Promise.resolve(cachedSource);
    }
    if (!sourcePromise) {
        sourcePromise = (async () => {
            cachedSource = new itowns.FileSource({
                url: 'https://data.grandlyon.com/fr/geoserv/ogc/features/v1/collections/metropole-de-lyon:abr_arbres_alignement.abrarbre/items?&f=application/geo%2Bjson&crs=EPSG:4326&startIndex=0&sortby=gid&limit=15000',
                crs: 'EPSG:4326',
                fetcher: itowns.Fetcher.json,
                parser: itowns.GeoJsonParser.parse,
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
