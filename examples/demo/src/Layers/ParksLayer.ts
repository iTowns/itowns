import * as itowns from 'itowns';
import type { LayerPromiseType } from '../Types/LayerPromiseType';

export const ParksLayer: LayerPromiseType = {
    id: 'parks',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (ParksLayer.cachedLayer) {
            return Promise.resolve(ParksLayer.cachedLayer);
        }
        if (!ParksLayer.layerPromise) {
            const parksSource = new itowns.FileSource({
                url: 'https://data.grandlyon.com/fr/geoserv/ogc/features/v1/collections/metropole-de-lyon:com_donnees_communales.comparcjardin_1_0_0/items?&f=application/geo%2Bjson&crs=EPSG:4326&startIndex=0&sortby=gid',
                crs: 'EPSG:4326',
                format: 'application/json',
            });

            ParksLayer.layerPromise = (async () => {
                ParksLayer.cachedLayer = new itowns.ColorLayer(ParksLayer.id, {
                    source: parksSource,
                    // @ts-expect-error style property undefined
                    style: {
                        fill: {
                            color: '#00FF00',
                            opacity: 0.5,
                        },
                    },
                });

                return ParksLayer.cachedLayer;
            })();
        }
        return ParksLayer.layerPromise;
    },
};
