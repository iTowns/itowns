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
                url: 'https://data.grandlyon.com/fr/geoserv/ogc/features/v1/collections/metropole-de-lyon:com_donnees_communales.comparcjardin_1_0_0/items?&f=application/geo%2Bjson&crs=EPSG:4326&startIndex=0&sortby=gid',
                crs: 'EPSG:4326',
                format: 'application/json',
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
