import assert from 'assert';
import HttpsProxyAgent from 'https-proxy-agent';
import View from 'Core/View';
import CopcSource from 'Source/CopcSource';
import CopcLayer from 'Layer/CopcLayer';
import Renderer from './bootstrap';

describe('Cloud Optimized Point Cloud', function () {
    let view;
    let source;
    let layer;
    let context;

    describe('Source', async function () {
        before(async function () {
            source = new CopcSource({
                url: 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz',
                networkOptions: process.env.HTTPS_PROXY ?
                    { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } :
                    {},
                _lazPerfBaseUrl: './node_modules/laz-perf/lib/',
            });
        });

        it('loads the COPC metadata', async function () {
            await source.whenReady;
        }).timeout(10000);

        it('correctly loads LAS header block', async function () {
            const header = {
                fileSignature: 'LASF',
                fileSourceId: 0,
                globalEncoding: 16,
                projectId: '00000000-0000-0000-0000000000000000',
                majorVersion: 1,
                minorVersion: 4,
                systemIdentifier: '',
                generatingSoftware: '',
                fileCreationDayOfYear: 1,
                fileCreationYear: 1,
                headerLength: 375,
                pointDataOffset: 1736,
                vlrCount: 3,
                pointDataRecordFormat: 7,
                pointDataRecordLength: 36,
                pointCount: 10653336,
                pointCountByReturn: [
                    9100899, 1238442, 283980,
                    30015,         0,      0,
                    0,             0,      0,
                    0,             0,      0,
                    0,             0,      0,
                ],
                scale: [0.01, 0.01, 0.01],
                offset: [637290.75, 851209.9, 510.7],
                min: [635577.79, 848882.15, 406.14],
                max: [639003.73, 853537.66, 615.26],
                waveformDataOffset: 0,
                evlrOffset: 81114086,
                evlrCount: 1,
            };

            assert.deepStrictEqual(source.header, header);
        });

        it('correctly loads COPC info VLR', async function () {
            const info = {
                cube: [
                    635577.79,
                    848882.15,
                    406.1400000000003,
                    640233.3,
                    853537.66,
                    5061.65000000001,
                ],
                spacing: 36.37117187500007,
                rootHierarchyPage: { pageOffset: 81114146, pageLength: 8896 },
                gpsTimeRange: [245369.89656857715, 245369.89656857715],
            };

            assert.deepStrictEqual(source.info, info);
        });

        it('correctly loads EVLR', async function () {
            const eb = [];

            assert.deepStrictEqual(source.eb, eb);
        });
    });

    describe('Layer', async function () {
        before(async function () {
            const renderer = new Renderer();
            view = new View('EPSG:4978', renderer.domElement, {
                renderer,
            });

            layer = new CopcLayer('copc', { source });

            context = {
                camera: view.camera,
                engine: view.mainLoop.gfxEngine,
                scheduler: view.mainLoop.scheduler,
                geometryLayer: layer,
                view,
            };
        });

        it('is correctly added to the view', async function () {
            view.addLayer(layer);
            await layer.whenReady;
        });

        it('pre updates and returns the root', async function () {
            const element = layer.preUpdate(context, new Set([layer]));
            assert.strictEqual(element.length, 1);
            assert.deepStrictEqual(element[0], layer.root);
        });

        it('updates on the root and fails', async function () {
            layer.update(context, layer, layer.root);
            assert.strictEqual(layer.root.promise, undefined);
        });

        it('post updates', async function () {
            layer.postUpdate(context, layer);
        });
    });
});
