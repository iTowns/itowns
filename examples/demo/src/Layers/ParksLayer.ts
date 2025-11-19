import * as itowns from 'itowns';
// @ts-expect-error FeatureToolTip imported from import-map
// eslint-disable-next-line import/no-unresolved
import FeatureToolTip from 'FeatureToolTip';

let layerPromise: Promise<itowns.ColorLayer>;
let cachedLayer: itowns.ColorLayer | undefined;

export async function getLayer() {
    if (cachedLayer) {
        return Promise.resolve(cachedLayer);
    }
    if (!layerPromise) {
        const parksSource = new itowns.FileSource({
            url: 'https://data.grandlyon.com/fr/geoserv/ogc/features/v1/collections/metropole-de-lyon:com_donnees_communales.comparcjardin_1_0_0/items?&f=application/geo%2Bjson&crs=EPSG:4326&startIndex=0&sortby=gid',
            crs: 'EPSG:4326',
            format: 'application/json',
        });

        layerPromise = (async () => {
            cachedLayer = new itowns.ColorLayer('parks', {
                source: parksSource,
                // @ts-expect-error style property undefined
                style: {
                    fill: {
                        color: '#00FF00',
                        opacity: 0.5,
                    },
                },
            });

            FeatureToolTip.addLayer(cachedLayer);
            return cachedLayer;
        })();
    }
    return layerPromise;
}
