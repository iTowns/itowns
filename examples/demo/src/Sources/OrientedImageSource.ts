import * as itowns from 'itowns';

let sourcePromise: Promise<itowns.OrientedImageSource>;
let cachedSource: itowns.OrientedImageSource | undefined;

export async function getSource() {
    if (cachedSource) {
        return Promise.resolve(cachedSource);
    }
    if (!sourcePromise) {
        sourcePromise = (async () => {
            cachedSource = new itowns.OrientedImageSource({
                url: 'http://www.itowns-project.org/itowns-sample-data-small/images/140616/Paris-140616_0740-{cameraId}-00001_0000{panoId}.jpg',
                orientationsUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/panoramicsMetaDataParis.geojson',
                calibrationUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/cameraCalibration.json',
            });
            return cachedSource;
        })();
    }
    return sourcePromise;
}
