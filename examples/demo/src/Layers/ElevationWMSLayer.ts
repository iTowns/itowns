import * as itowns from 'itowns';
import type { LayerPromiseTypeExtent } from '../Types';
import { ElevationWMSSource } from '../Sources';

export const ElevationWMSLayer: LayerPromiseTypeExtent = {
    id: 'ElevationWMS',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: (extent: itowns.Extent) => {
        if (ElevationWMSLayer.cachedLayer) {
            return Promise.resolve(ElevationWMSLayer.cachedLayer);
        }
        if (!ElevationWMSLayer.layerPromise) {
            ElevationWMSLayer.layerPromise = (async () => {
                ElevationWMSLayer.cachedLayer = new itowns.ElevationLayer(ElevationWMSLayer.id, {
                    // @ts-expect-error source undefined
                    source: await ElevationWMSSource.getSource(extent),
                });

                return ElevationWMSLayer.cachedLayer;
            })();
        }
        return ElevationWMSLayer.layerPromise;
    },
};
