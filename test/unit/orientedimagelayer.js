import proj4 from 'proj4';
import assert from 'assert';
import OrientedImageLayer from 'Layer/OrientedImageLayer';
import OrientedImageSource from 'Source/OrientedImageSource';
import HttpsProxyAgent from 'https-proxy-agent';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import Renderer from './bootstrap';

describe('Oriented Image Layer', function () {
    proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
    const renderer = new Renderer();

    const p = {
        coord: new Coordinates('EPSG:4326', 2.33481381, 48.85060296),
        range: 25,
    };
    const viewer = new GlobeView(renderer.domElement, p,
        { renderer,
            noControls: true,
            handleCollision: false,
            sseSubdivisionThreshold: 10,
        });

    // Prepare oriented image source
    const orientedImageSource = new OrientedImageSource({
        url: 'http://www.itowns-project.org/itowns-sample-data-small/images/140616/Paris-140616_0740-{cameraId}-00001_0000{panoId}.jpg',
        // Url to a GEOJSON file describing feature points. It describre position and orientation of each panoramic.
        orientationsUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/panoramicsMetaDataParis.geojson',
        // Url of a a JSON file with calibration for all cameras. see [CameraCalibrationParser]{@link module:CameraCalibrationParser.parse}
        // in this example, we have the ladybug, it's a set of 6 cameras
        calibrationUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive/exampleParis1/cameraCalibration.json',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    });

    // Create oriented image layer
    const olayer = new OrientedImageLayer('demo_orientedImage', {
        // Radius in meter of the sphere used as a background.
        backgroundDistance: 1200,
        source: orientedImageSource,
        crs: viewer.referenceCrs,
        useMask: false,
    });

    viewer.addLayer(olayer, viewer.tileLayer);

    const context = {
        camera: viewer.camera,
        engine: viewer.mainLoop.gfxEngine,
        scheduler: viewer.mainLoop.scheduler,
        view: viewer,
    };

    it('Add oriented image layer', function (done) {
        olayer.whenReady.then(() => {
            assert.equal(olayer.cameras.length, 5);
            done();
        });
    });

    it('PreUpdate oriented image layer', function (done) {
        olayer.whenReady.then(() => {
            assert.equal(olayer.currentPano, undefined);
            olayer.preUpdate(context);
            assert.equal(olayer.currentPano.id, 482);
            done();
        });
    });
});
