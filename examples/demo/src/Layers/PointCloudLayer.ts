import * as itowns from 'itowns';
import type { LayerPromiseTypeCRS } from '../Types';
import { PointCloudSource } from '../Sources';

export const PointCloudLayer: LayerPromiseTypeCRS = {
    id: 'point-cloud',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: (crs: string) => {
        if (PointCloudLayer.cachedLayer) {
            return Promise.resolve(PointCloudLayer.cachedLayer);
        }
        if (!PointCloudLayer.layerPromise) {
            PointCloudLayer.layerPromise = (async () => {
                const options = {
                    mode: 2,
                    opacity: 0.5,
                };
                const config = {
                    source: await PointCloudSource.getSource(),
                    crs,
                    sseThreshold: 4,
                    pointSize: 2,
                    ...options,
                };

                PointCloudLayer.cachedLayer =
                    new itowns.EntwinePointTileLayer(PointCloudLayer.id, config);

                return PointCloudLayer.cachedLayer;
            })();
        }
        return PointCloudLayer.layerPromise;
    },
};
