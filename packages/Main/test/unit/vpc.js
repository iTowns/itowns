import assert from 'assert';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates, CRS } from '@itowns/geographic';
import VpcSource from 'Source/VpcSource';
import VpcLayer from 'Layer/VpcLayer';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import Renderer from './bootstrap';

import eptStack from '../data/vpc/eptStack.json';
import copcStack from '../data/vpc/copcStack.json';

import eptFile from '../data/entwine/ept.json';
import eptHierarchyFile from '../data/entwine/ept-hierarchy/0-0-0-0.json';

// url of the vpc stack
const baseurl = 'https://data.geopf.fr/chunk/telechargement/download';
const vpcEptUrl = `${baseurl}/lidarhd_fxx_ept/vpc/index.vpc`;
const vpcCopcUrl = `${baseurl}/LiDARHD-NUALID/VPC/amiens.vpc`;

const resources = {
    [vpcEptUrl]: JSON.parse(eptStack),
    [vpcCopcUrl]: JSON.parse(copcStack),
    [`${baseurl}/lidarhd_fxx_ept/kg/ept.json`]: JSON.parse(eptFile),
    [`${baseurl}/lidarhd_fxx_ept/kg/ept-hierarchy/0-0-0-0.json`]: JSON.parse(eptHierarchyFile),
};

CRS.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

describe('VPC', function () {
    let vpcEptSource;
    let vpcCopcSource;

    describe('VPC Source', function () {
        let stubFetcherJson;
        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(url => Promise.resolve(resources[url]));
        });

        after(function () {
            stubFetcherJson.restore();
        });

        describe('ept stack', function () {
            it('instantiation', function () {
                vpcEptSource = new VpcSource({
                    url: vpcEptUrl,
                });
                assert.ok(vpcEptSource.isVpcSource);
            });
            it('whenReady', function (done) {
                vpcEptSource.whenReady
                    .then(() => {
                        assert.ok(vpcEptSource.zmin);
                        assert.ok(vpcEptSource.zmax);
                        assert.ok(vpcEptSource.sources.length > 0);
                        done();
                    }).catch(done);
            });
        });

        describe('copc stack', function () {
            it('instantiation', function () {
                vpcCopcSource = new VpcSource({
                    url: vpcCopcUrl,
                });
                assert.ok(vpcCopcSource.isVpcSource);
            });
            it('whenReady', function (done) {
                vpcCopcSource.whenReady
                    .then(() => {
                        assert.ok(vpcCopcSource.zmin);
                        assert.ok(vpcCopcSource.zmax);
                        assert.ok(vpcCopcSource.sources.length > 0);
                        done();
                    }).catch(done);
            });
        });
    });

    describe('Stacked sources', function () {
        it('instantiate ept stacked source', function (done) {
            const eptMockSource = vpcEptSource.sources[0];
            const eptSource = eptMockSource.instantiate();

            eptSource.whenReady
                .then(() => {
                    assert.ok(vpcEptSource.sources[0].isEntwinePointTileSource);
                    done();
                }).catch(done);
        });

        it('instanciated copc stacked source', function (done) {
            const copcMockSource = vpcCopcSource.sources[0];
            const copcSource = copcMockSource.instantiate();

            copcSource.whenReady
                .then(() => {
                    assert.ok(vpcCopcSource.sources[0].isCopcSource);
                    done();
                }).catch(done);
        });
    });

    describe('Layer', function () {
        let view;
        let vpcLayer;

        before(function () {
            const renderer = new Renderer();
            const placement = { coord: new Coordinates('EPSG:4326', 0, 0), range: 250 };
            view = new GlobeView(renderer.domElement, placement, { renderer });
        });

        it('instantiate', () => {
            vpcLayer = new VpcLayer('testVpcLayer', { source: vpcEptSource, crs: view.referenceCrs });
            assert.ok(vpcLayer.isVpcLayer);
        });

        it('add to the view', (done) => {
            View.prototype.addLayer.call(view, vpcLayer)
                .then(() => {
                    done();
                }).catch(done);
        });

        describe('loadData()', () => {
            let node;
            let context;

            let stubFetcherJson;
            before(function () {
                stubFetcherJson = sinon.stub(Fetcher, 'json')
                    .callsFake(url => Promise.resolve(resources[url]));
            });

            after(function () {
                stubFetcherJson.restore();
            });

            it('on a mockRoot', async function () {
                context = {
                    camera: view.camera,
                    engine: view.mainLoop.gfxEngine,
                    scheduler: view.mainLoop.scheduler,
                    geometryLayer: vpcLayer,
                    view,
                };

                const sources = vpcLayer.source.sources;
                assert.equal(sources[1].isEntwinePointTileSource, undefined, 'source already instantiated');
                const mockRoot = vpcLayer.root.children[1];
                vpcLayer.loadData(mockRoot, context, vpcLayer, mockRoot.bbox);

                await mockRoot.source.whenReady;
                assert.ok(sources[1].isEntwinePointTileSource);

                await mockRoot.loadOctree;
                const eptRoot = vpcLayer.root.children[1];
                assert.ok(eptRoot.isEntwinePointTileNode);
                assert.ok(eptRoot.numPoints > 0);

                node = eptRoot.children[0];
                assert.ok(node.numPoints > 0);
            });

            it('on a "commun" node', async function () {
                vpcLayer.loadData(node, context, vpcLayer, node.bbox);
                if (node.obj) {
                    assert.ok(node.promise === null);
                } else if (node.promise) {
                    await node.promise;
                    assert.ok(node.promise === null);
                }
            });
        });
    });
});
