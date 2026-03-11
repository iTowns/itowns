import * as itowns from 'itowns';

let sourcePromise: Promise<itowns.CopcSource>;
let cachedSource: itowns.CopcSource | undefined;

export async function getSource(crs: string) {
    if (cachedSource && cachedSource.crs === crs) {
        return Promise.resolve(cachedSource);
    }
    if (!sourcePromise) {
        sourcePromise = (async () => {
            cachedSource = new itowns.CopcSource({
                url: 'https://data.geopf.fr/telechargement/download/LiDARHD-NUALID/NUALHD_1-0__LAZ_LAMB93_OL_2025-02-20/LHD_FXX_0844_6520_PTS_LAMB93_IGN69.copc.laz',
                crs,
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
