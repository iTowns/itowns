import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Object3D } from 'three';
import PotreeLayer from 'Layer/PotreeLayer';
import PotreeSource from 'Source/PotreeSource';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates } from '@itowns/geographic';
import PotreeNode from 'Core/PotreeNode';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import Renderer from './bootstrap';

const resources = new Map();
const object3d = new Object3D();

// potree 1.7
const baseurl = 'https://raw.githubusercontent.com/potree/potree/develop/pointclouds/lion_takanawa';
const fileName = 'cloud.js';

describe('Potree', function () {
    let metadataJson;
    let potreeRRhrc;
    let potreeRRbin;
    let potreeRR0bin;
    let dataFetched;
    it('fetch test data from https://github.com/potree', async function () {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        metadataJson = await Fetcher.json(`${baseurl}/${fileName}`, networkOptions);
        potreeRRbin = await Fetcher.arrayBuffer(`${baseurl}/data/r/r.bin`, networkOptions);
        potreeRRhrc = await Fetcher.arrayBuffer(`${baseurl}/data/r/r.hrc`, networkOptions);
        potreeRR0bin = await Fetcher.arrayBuffer(`${baseurl}/data/r/r0.bin`, networkOptions);

        resources.set(`${baseurl}/data/r/r.hrc`, potreeRRhrc);
        resources.set(`${baseurl}/data/r/r.bin`, potreeRRbin);
        resources.set(`${baseurl}/data/r/r0.bin`, potreeRR0bin);

        dataFetched = true;
    }).timeout(5000);

    describe('unit tests', function () {
        const placement = { coord: new Coordinates('EPSG:4326', 4.631512, 43.675626), range: -250 };
        let renderer;
        let viewer;
        let potreeSource;
        let potreeLayer;
        let context;
        let elt;
        let stubFetcherJson;
        let stubFetcherArrayBuf;

        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(() => Promise.resolve(metadataJson));
            stubFetcherArrayBuf = sinon.stub(Fetcher, 'arrayBuffer')
                .callsFake(url => Promise.resolve(resources.get(url)));

            if (!dataFetched) { this.skip(); }

            renderer = new Renderer();
            viewer = new GlobeView(renderer.domElement, placement, { renderer });

            potreeSource = new PotreeSource({
                file: fileName,
                url: baseurl,
                crs: 'EPSG:4978',
            });

            // Configure Point Cloud layer
            potreeLayer = new PotreeLayer('lion_takanawa', {
                source: potreeSource,
                crs: viewer.referenceCrs,
            });

            context = {
                camera: viewer.camera,
                engine: viewer.mainLoop.gfxEngine,
                scheduler: viewer.mainLoop.scheduler,
                geometryLayer: potreeLayer,
                view: viewer,
            };
        });

        after(function () {
            stubFetcherJson.restore();
            stubFetcherArrayBuf.restore();
        });

        describe('potree Layer', function () {
            it('no crs -> should fail', function () {
                try {
                    // eslint-disable-next-line no-unused-vars
                    const source = new PotreeSource({
                        file: fileName,
                        url: baseurl,
                    });
                } catch (err) {
                    assert.ok(err instanceof Error);
                    assert.equal(err.message, 'New PotreeSource: crs is required');
                }
            });
            it('Add point potree layer', function (done) {
                View.prototype.addLayer.call(viewer, potreeLayer)
                    .then(() => {
                        context.camera.camera3D.updateMatrixWorld();
                        assert.equal(potreeLayer.root.children.length, 6);
                        potreeLayer.bboxes.visible = true;
                        done();
                    }).catch(done);
            });

            it('preupdate potree layer', function () {
                elt = potreeLayer.preUpdate(context, new Set([potreeLayer]));
                assert.equal(elt.length, 1);
            });

            it('update potree layer', function (done) {
                assert.equal(potreeLayer.group.children.length, 0);
                potreeLayer.update(context, potreeLayer, elt[0]);
                elt[0].promise
                    .then(() => {
                        assert.equal(potreeLayer.group.children.length, 1);
                        done();
                    }).catch(done);
            });

            it('postUpdate potree layer', function () {
                potreeLayer.postUpdate(context, potreeLayer);
            });
        });

        describe('potree Node', function () {
            const numPoints = 1000;
            const childrenBitField = 5;
            let root;

            it('instance', function (done) {
                root = new PotreeNode(0, -1, numPoints, childrenBitField, potreeSource);
                assert.equal(root.numPoints, numPoints);
                assert.equal(root.childrenBitField, childrenBitField);
                done();
            });

            it('construct a correct URL', function () {
                const indexChild = 7;
                const indexGChild = 3;
                const extension = 'bin';
                const nodeChild = new PotreeNode(1, indexChild, 0, 0, {
                    baseurl,
                    extension,
                });
                const nodeGChild = new PotreeNode(2, indexGChild, 0, 0, {
                    baseurl,
                    extension,
                });
                object3d.add(root.clampOBB);
                root.add(nodeChild);
                nodeChild.add(nodeGChild);

                assert.equal(nodeGChild.url, `${baseurl}/r${indexChild}${indexGChild}.${extension}`);
            });

            it('load octree', function (done) {
                const root = new PotreeNode(0, -1, numPoints, childrenBitField, potreeSource);
                object3d.add(root.clampOBB);
                root.loadOctree()
                    .then(() => {
                        assert.equal(6, root.children.length);
                        done();
                    }).catch(done);
            });

            it('load child node', function (done) {
                const root = new PotreeNode(0, -1, numPoints, childrenBitField, potreeSource, 'EPSG:4978');
                object3d.add(root.clampOBB);
                root.loadOctree()
                    .then(() => root.children[0].load()
                        .then(() => {
                            assert.equal(8, root.children[0].children.length);
                            done();
                        }),
                    ).catch(done);
            });
        });
    });
});
