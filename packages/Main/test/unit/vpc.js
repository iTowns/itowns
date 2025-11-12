import assert from 'assert';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates, CRS } from '@itowns/geographic';
import VpcSource from 'Source/VpcSource';
import VpcLayer from 'Layer/VpcLayer';
import Renderer from './bootstrap';

const vpcEptUrl = 'https://data.geopf.fr/chunk/telechargement/download/lidarhd_fxx_ept/vpc/index.vpc';
const vpcCopcUrl = 'https://data.geopf.fr/chunk/telechargement/download/LiDARHD-NUALID/VPC/amiens.vpc';
CRS.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

describe('VPC', function () {
    let vpcEptSource;
    let vpcCopcSource;

    describe('Source', function () {
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
            }).timeout(5000);
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
            }).timeout(5000);
        });

        describe('stack sources', function (done) {
            it('ept stack', function () {
                const eptMockSource = vpcEptSource.sources[0];
                vpcEptSource.instantiate(eptMockSource);

                eptMockSource.whenReady
                    .then(() => {
                        assert.ok(vpcEptSource.sources[0].isEntwinePointTileSource);
                        done();
                    }).catch(done);
            });
            it('copc stack', function () {
                const copcMockSource = vpcCopcSource.sources[0];
                vpcCopcSource.instantiate(copcMockSource);

                copcMockSource.whenReady
                    .then(() => {
                        assert.ok(vpcCopcSource.sources[0].isCopcSource);
                        done();
                    }).catch(done);
            });
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

        let context;
        describe('loadData()', () => {
            let node;

            it('on a mockRoot', async function () {
                context = {
                    camera: view.camera,
                    engine: view.mainLoop.gfxEngine,
                    scheduler: view.mainLoop.scheduler,
                    geometryLayer: vpcLayer,
                    view,
                };

                const mockRoot = vpcLayer.root.children[0];
                assert.equal(vpcEptSource.sources[0].isEntwinePointTileSource, undefined, 'source already instanciated');
                vpcLayer.loadData(mockRoot, context, vpcLayer, mockRoot.bbox);

                await mockRoot.source.whenReady;
                assert.ok(vpcEptSource.sources[0].isEntwinePointTileSource);
                const root = await mockRoot.loadOctree;
                node = root.children[0];
                assert.ok(root.numPoints > 0);
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
