import proj4 from 'proj4';
import assert from 'assert';
import OrientedImageLayer from 'Layer/OrientedImageLayer';
import OrientedImageSource from 'Source/OrientedImageSource';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import Renderer from './bootstrap';

import panoData from '../data/OrientedImage/panoramicsMetaDataParis.geojson';
import camCalibration from '../data/OrientedImage/cameraCalibration.json';

const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/immersive';
const orientationsUrl = `${baseurl}/exampleParis1/panoramicsMetaDataParis.geojson`;
const calibrationUrl = `${baseurl}/exampleParis1/cameraCalibration.json`;

const resources = {
    [orientationsUrl]: panoData,
    [calibrationUrl]: camCalibration,
};

describe('Oriented Image Layer', function () {
    let orImgLayer;
    let context;
    let stubFetcherJson;

    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(url => Promise.resolve(JSON.parse(resources[url])));
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
            // Url to a GEOJSON file describing feature points. It describes position and orientation of each panoramic.
            orientationsUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/' +
                'immersive/exampleParis1/panoramicsMetaDataParis.geojson',
            // Url of a a JSON file with calibration for all cameras. see [CameraCalibrationParser]{@link module:CameraCalibrationParser.parse}
            // in this example, we have the ladybug, it's a set of 6 cameras
            calibrationUrl: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/' +
                'immersive/exampleParis1/cameraCalibration.json',
        });

        // Create oriented image layer
        orImgLayer = new OrientedImageLayer('demo_orientedImage', {
            // Radius in meter of the sphere used as a background.
            backgroundDistance: 1200,
            source: orientedImageSource,
            crs: viewer.referenceCrs,
            useMask: false,
        });

        viewer.addLayer(orImgLayer, viewer.tileLayer);

        context = {
            camera: viewer.camera,
            engine: viewer.mainLoop.gfxEngine,
            scheduler: viewer.mainLoop.scheduler,
            view: viewer,
        };
    });

    after(function () {
        stubFetcherJson.restore();
    });

    it('Add oriented image layer', function (done) {
        orImgLayer.whenReady
            .then(() => {
                assert.equal(orImgLayer.cameras.length, 1);
                assert.equal(orImgLayer.cameras[0].name, 300);
                assert.equal(orImgLayer.material.cameras[0].name, 300);
                done();
            }).catch(done);
    });

    it('PreUpdate oriented image layer', function (done) {
        orImgLayer.whenReady
            .then(() => {
                assert.equal(orImgLayer.currentPano, undefined);
                orImgLayer.preUpdate(context);
                assert.equal(orImgLayer.currentPano.id, 482);
                done();
            }).catch(done);
    });
});
