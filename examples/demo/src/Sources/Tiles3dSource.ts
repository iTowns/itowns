import * as itowns from 'itowns';

let sourcePromise: Promise<itowns.OGC3DTilesSource>;
let cachedSource: itowns.OGC3DTilesSource | undefined;

export async function getSource() {
    if (cachedSource) {
        return Promise.resolve(cachedSource);
    }
    if (!sourcePromise) {
        sourcePromise = (async () => {
            cachedSource = new itowns.OGC3DTilesSource({
                url: 'https://webimaging.lillemetropole.fr/externe/maillage/2020_mel_5cm/tileset.json',
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
