import * as itowns from 'itowns';
import type { LayerPromiseTypeExtent } from '../Types';
import { OrthoImageWMSSource } from '../Sources';

export const OrthoImageWMSLayer: LayerPromiseTypeExtent = {
    id: 'OrthoImageryWMS',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: (extent: itowns.Extent) => {
        if (OrthoImageWMSLayer.cachedLayer) {
            return Promise.resolve(OrthoImageWMSLayer.cachedLayer);
        }
        if (!OrthoImageWMSLayer.layerPromise) {
            OrthoImageWMSLayer.layerPromise = (async () => {
                OrthoImageWMSLayer.cachedLayer = new itowns.ColorLayer(OrthoImageWMSLayer.id, {
                    // @ts-expect-error updateStrategy undefined
                    updateStrategy: {
                        type: itowns.STRATEGY_DICHOTOMY,
                        options: {},
                    },
                    source: await OrthoImageWMSSource.getSource(extent),
                });

                return OrthoImageWMSLayer.cachedLayer;
            })();
        }
        return OrthoImageWMSLayer.layerPromise;
    },
};
