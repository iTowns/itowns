import * as itowns from 'itowns';
import type { LayerPromiseTypeNoParams } from '../Types';
import { Tiles3dSource } from '../Sources';

export const Tiles3dLayer: LayerPromiseTypeNoParams = {
    id: '3DTiles',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: () => {
        if (Tiles3dLayer.cachedLayer) {
            return Promise.resolve(Tiles3dLayer.cachedLayer);
        }
        if (!Tiles3dLayer.layerPromise) {
            Tiles3dLayer.layerPromise = (async () => {
                Tiles3dLayer.cachedLayer = new itowns.OGC3DTilesLayer('3DTiles', {
                    source: await Tiles3dSource.getSource(),
                    // @ts-expect-error PNTS_SIZE_MODE interpreted as number
                    // assigned to string
                    pntsSizeMode: itowns.PNTS_SIZE_MODE.ATTENUATED,
                });

                return Tiles3dLayer.cachedLayer;
            })();
        }
        return Tiles3dLayer.layerPromise;
    },
};
