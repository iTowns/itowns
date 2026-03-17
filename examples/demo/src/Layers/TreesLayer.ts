import * as itowns from 'itowns';
import type { LayerPromiseTypeNoParams } from '../Types';
import { TreesSource } from '../Sources';
import { TreeLoader } from '../ModelLoaders';

export const TreesLayer: LayerPromiseTypeNoParams = {
    id: 'Trees3D',
    layerPromise: undefined,
    cachedLayer: undefined,
    getLayer: async () => {
        if (TreesLayer.cachedLayer) {
            return Promise.resolve(TreesLayer.cachedLayer);
        }
        if (!TreesLayer.layerPromise) {
            TreesLayer.layerPromise = (async () => {
                const model = await TreeLoader.getModel();

                model.rotateX(Math.PI / 2.0);
                model.position.z = 165;
                model.scale.set(2, 2, 2);

                const styleModel3D = {
                    point: {
                        model: {
                            object: model,
                        },
                    },
                };

                TreesLayer.cachedLayer = new itowns.FeatureGeometryLayer(
                    TreesLayer.id,
                    {
                        // @ts-expect-error source property undefined
                        source: await TreesSource.getSource(),
                        style: styleModel3D,
                        zoom: { min: 7, max: 21 },
                    },
                );

                return TreesLayer.cachedLayer as itowns.FeatureGeometryLayer;
            })();
        }
        return TreesLayer.layerPromise;
    },
};
