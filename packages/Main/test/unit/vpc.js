import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates, CRS } from '@itowns/geographic';
import VpcSource from 'Source/VpcSource';
import VpcLayer from 'Layer/VpcLayer';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';

import Renderer from './bootstrap';

import eptStac from '../data/vpc/eptStac.json';
import copcStac from '../data/vpc/copcStac.json';

import eptFile from '../data/entwine/ept.json';
import eptHierarchyFile from '../data/entwine/ept-hierarchy/0-0-0-0.json';

import copcBuff from '../data/copc/LHD_FXX_0636_6934_PTS_LAMB93_IGN69.copc.laz.json';

const stacTypes = ['eptStac', 'copcStac'];

// url of the vpc stac
const baseurl = 'https://data.geopf.fr/chunk/telechargement/download';
const vpcUrl = {
    eptStac: `${baseurl}/lidarhd_fxx_ept/vpc/index.vpc`,
    copcStac: `${baseurl}/LiDARHD-NUALID/VPC/amiens.vpc`,
};

const resources = {
    [vpcUrl.eptStac]: JSON.parse(eptStac),
    [vpcUrl.copcStac]: JSON.parse(copcStac),
    [`${baseurl}/lidarhd_fxx_ept/jg/ept.json`]: JSON.parse(eptFile),
    [`${baseurl}/lidarhd_fxx_ept/kg/ept.json`]: JSON.parse(eptFile),
    [`${baseurl}/lidarhd_fxx_ept/kg/ept-hierarchy/0-0-0-0.json`]: JSON.parse(eptHierarchyFile),
};

CRS.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

describe('VPC', function () {
    const vpcSource = {};

    describe('VPC Source', function () {
        let stubFetcherJson;
        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(url => Promise.resolve(resources[url]));
        });

        after(function () {
            stubFetcherJson.restore();
        });

        stacTypes.forEach((stacType) => {
            describe(stacType, function () {
                it('instantiation', function () {
                    vpcSource[stacType] = new VpcSource({
                        url: vpcUrl[stacType],
                    });
                    assert.ok(vpcSource[stacType].isVpcSource);
                });
                it('whenReady', function (done) {
                    vpcSource[stacType].whenReady
                        .then(() => {
                            assert.ok(vpcSource[stacType].zmin);
                            assert.ok(vpcSource[stacType].zmax);
                            assert.ok(vpcSource[stacType].sources.length > 0);
                            done();
                        }).catch(done);
                });
            });
        });
    });

    describe('Sub Stac sources', function () {
        let stubFetcherJson;
        let stubFetcherArrBuff;
        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(url => Promise.resolve(resources[url]));
            stubFetcherArrBuff = sinon.stub(Fetcher, 'arrayBuffer')
                .callsFake((url, options) => {
                    const range = options.headers.range;
                    const buff = JSON.parse(copcBuff)[range].split(',');
                    const blob = new Uint8Array(buff).buffer;
                    return Promise.resolve(blob);
                });
        });

        after(function () {
            stubFetcherJson.restore();
            stubFetcherArrBuff.restore();
        });

        stacTypes.forEach((stacType) => {
            it(`instantiate ${stacType} source`, async function () {
                assert.equal(vpcSource[stacType].sources[0].isSource, undefined, 'source already instantiated');
                vpcSource[stacType].sources[0].instantiate();
                await vpcSource[stacType].sources[0].whenReady;
                const isSourceType = {
                    eptStac: 'isEntwinePointTileSource',
                    copcStac: 'isCopcSource',
                };
                assert.ok(vpcSource[stacType].sources[0][isSourceType[stacType]]);
            });
        });
    });

    describe('Layer', function () {
        let view;
        let vpcSource;
        let vpcLayer;

        const crs = 'EPSG:4978';

        before('set View', function () {
            const renderer = new Renderer();
            const placement = { coord: new Coordinates('EPSG:4326', 0, 0), range: 250 };
            view = new GlobeView(renderer.domElement, placement, { renderer });
        });

        let stubFetcherJson;
        let stubFetcherArrBuff;
        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(url => Promise.resolve(resources[url]));
            stubFetcherArrBuff = sinon.stub(Fetcher, 'arrayBuffer')
                .callsFake((url, options) => {
                    // const copcUrl = `${baseurl}/LiDARHD-NUALID/NUALHD_1-0__LAZ_LAMB93_KC_2025-06-03/LHD_FXX_0636_6934_PTS_LAMB93_IGN69.copc.laz`;
                    const range = options.headers.range;
                    const buff = JSON.parse(copcBuff)[range].split(',');
                    const blob = new Uint8Array(buff).buffer;
                    return Promise.resolve(blob);
                });
        });

        after(function () {
            stubFetcherJson.restore();
            stubFetcherArrBuff.restore();
        });

        stacTypes.forEach((stacType) => {
            describe(stacType, function () {
                it('instantiate', () => {
                    vpcSource = new VpcSource({
                        url: vpcUrl[stacType],
                    });
                    vpcLayer = new VpcLayer('testVpcLayer', { source: vpcSource, crs });
                    assert.ok(vpcLayer.isVpcLayer);
                });

                it('check octree (with MockSubRoot)', async function () {
                    assert.ok(vpcLayer.root);
                    await vpcSource.whenReady;
                    assert.ok(vpcLayer.root.children.length > 0);
                });

                it('check mockSubRoot instantiation (_instantiateSubRoot)', async function () {
                    vpcLayer.root.children[0].source.instantiate();

                    await vpcLayer.root.children[0].source.whenReady;
                    // how to get the new node ?
                    assert.ok(vpcLayer.root.children.length > 0);
                });
            });
        });

        describe('loadData()', function () {
            let context;

            it('on a mockRoot', async function () {
                context = {
                    camera: view.camera,
                    engine: view.mainLoop.gfxEngine,
                    scheduler: view.mainLoop.scheduler,
                    geometryLayer: vpcLayer,
                    view,
                };

                const mock = sinon.mock(context.scheduler);
                mock.expects('execute')
                    .once();

                const sources = vpcLayer.source.sources;
                assert.equal(sources[1].isEntwinePointTileSource, undefined, 'source already instantiated');

                const mockRoot = vpcLayer.root.children[1];
                vpcLayer.loadData(mockRoot, context, vpcLayer, mockRoot.bbox);

                mock.verify();
                mock.restore();
            }).timeout(10000);

            it('on a "commun" node', async function () {
                const node = new EntwinePointTileNode(2, 0, 0, 0, { isSource: true }, 100, 'EPSG:3857');
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
