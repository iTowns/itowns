import * as itowns from 'itowns';

let sourcePromise: Promise<itowns.EntwinePointTileSource>;
let cachedSource: itowns.EntwinePointTileSource | undefined;

export async function getSource() {
    if (cachedSource) {
        return Promise.resolve(cachedSource);
    }
    if (!sourcePromise) {
        sourcePromise = (async () => {
            cachedSource = new itowns.EntwinePointTileSource({
                url: 'https://download.data.grandlyon.com/files/grandlyon/imagerie/mnt2018/lidar/ept/',
                crs: 'EPSG:3946',
                colorDepth: 8,
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
