import * as itowns from 'itowns';
import { getSource } from '../Sources/BuildingsSource';

let layerPromise: Promise<itowns.ColorLayer>;
let cachedLayer: itowns.ColorLayer | undefined;

export async function getLayer() {
    if (cachedLayer) {
        return Promise.resolve(cachedLayer);
    }
    if (!layerPromise) {
        layerPromise = (async () => {
            const source = await getSource();
            cachedLayer = new itowns.ColorLayer('VTBuilding2D', {
                source,
                // @ts-expect-error style property undefined
                style: {
                    fill: {
                        opacity: 0.3,
                    },
                },
            });
            return cachedLayer;
        })();
    }
    return layerPromise;
}
