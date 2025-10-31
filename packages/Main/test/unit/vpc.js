import assert from 'assert';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates } from '@itowns/geographic';
import { HttpsProxyAgent } from 'https-proxy-agent';
import VpcSource from 'Source/VpcSource';
import CopcLayer from 'Layer/CopcLayer';
import CopcNode from 'Core/CopcNode';
import LASParser from 'Parser/LASParser';
import Renderer from './bootstrap';

const vpcEptUrl = 'https://data.geopf.fr/chunk/telechargement/download/lidarhd_fxx_ept/vpc/index.vpc';
const vpcCopcUrl = 'https://data.geopf.fr/chunk/telechargement/download/LiDARHD-NUALID/VPC/amiens.vpc';

describe('VPC', function () {
    let vpcEptSource;
    let vpcCopcSource;
    // before(function () {
    //     LASParser.enableLazPerf('../../examples/libs/laz-perf');
    // });

    // after(async function () {
    //     await LASParser.terminate();
    // });

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
                        assert.ok(vpcEptSource.minElevation);
                        assert.ok(vpcEptSource.maxElevation);
                        assert.ok(vpcEptSource.sources.length > 0);
                        done();
                    }).catch(done);
            }).timeout(5000);

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
                            assert.ok(vpcCopcSource.minElevation);
                            assert.ok(vpcCopcSource.maxElevation);
                            assert.ok(vpcCopcSource.sources.length > 0);
                            done();
                        }).catch(done);
                }).timeout(5000);
            });
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

    // describe('Layer', function () {
    //     let renderer;
    //     let placement;
    //     let view;
    //     let layer;
    //     let context;

    //     before(function (done) {
    //         renderer = new Renderer();
    //         placement = { coord: new Coordinates('EPSG:4326', 0, 0), range: 250 };
    //         view = new GlobeView(renderer.domElement, placement, { renderer });
    //         layer = new CopcLayer('test', { source }, view);

    //         context = {
    //             camera: view.camera,
    //             engine: view.mainLoop.gfxEngine,
    //             scheduler: view.mainLoop.scheduler,
    //             geometryLayer: layer,
    //             view,
    //         };

    //         View.prototype.addLayer.call(view, layer)
    //             .then(() => {
    //                 done();
    //             }).catch(done);
    //     });

    //     it('pre updates and finds the root', () => {
    //         const element = layer.preUpdate(context, new Set([layer]));
    //         assert.strictEqual(element.length, 1);
    //         assert.deepStrictEqual(element[0], layer.root);
    //     });

    //     it('tries to update on the root and fails', function () {
    //         layer.update(context, layer, layer.root);
    //         assert.strictEqual(layer.root.promise, undefined);
    //     });

    //     it('tries to update on the root and succeeds', function (done) {
    //         view.controls.lookAtCoordinate({
    //             range: -250,
    //         }, false)
    //             .then(() => {
    //                 layer.update(context, layer, layer.root);
    //                 layer.root.promise
    //                     .then(() => {
    //                         done();
    //                     });
    //             }).catch(done);
    //     });

    //     it('post updates', function () {
    //         layer.postUpdate(context, layer);
    //     });
    // });

    // describe('Node', function () {
    //     let root;
    //     before(function () {
    //         const layer = { source: { url: 'http://server.geo', extension: 'laz' } };
    //         root = new CopcNode(0, 0, 0, 0, layer, 4000);
    //         root.bbox.setFromArray([1000, 1000, 1000, 0, 0, 0]);

    //         root.add(new CopcNode(1, 0, 0, 0, layer, 3000));
    //         root.add(new CopcNode(1, 0, 0, 1, layer, 3000));
    //         root.add(new CopcNode(1, 0, 1, 1, layer, 3000));

    //         root.children[0].add(new CopcNode(2, 0, 0, 0, layer, 2000));
    //         root.children[0].add(new CopcNode(2, 0, 1, 0, layer, 2000));
    //         root.children[1].add(new CopcNode(2, 0, 1, 3, layer, 2000));
    //         root.children[2].add(new CopcNode(2, 0, 2, 2, layer, 2000));
    //         root.children[2].add(new CopcNode(2, 0, 3, 3, layer, 2000));

    //         root.children[0].children[0].add(new CopcNode(3, 0, 0, 0, layer, 1000));
    //         root.children[0].children[0].add(new CopcNode(3, 0, 1, 0, layer, 1000));
    //         root.children[1].children[0].add(new CopcNode(3, 0, 2, 7, layer, 1000));
    //         root.children[2].children[0].add(new CopcNode(3, 0, 5, 4, layer, 1000));
    //         root.children[2].children[1].add(new CopcNode(3, 1, 6, 7, layer));
    //     });

    //     describe('finds the common ancestor of two nodes', () => {
    //         let ancestor;
    //         it('cousins => grand parent', () => {
    //             ancestor = root.children[2].children[1].children[0].findCommonAncestor(root.children[2].children[0].children[0]);
    //             assert.deepStrictEqual(ancestor, root.children[2]);
    //         });

    //         it('brothers => parent', () => {
    //             ancestor = root.children[0].children[0].children[0].findCommonAncestor(root.children[0].children[0].children[1]);
    //             assert.deepStrictEqual(ancestor, root.children[0].children[0]);
    //         });

    //         it('grand child and grand grand child => root', () => {
    //             ancestor = root.children[0].children[1].findCommonAncestor(root.children[2].children[1].children[0]);
    //             assert.deepStrictEqual(ancestor, root);
    //         });

    //         it('parent and child => parent', () => {
    //             ancestor = root.children[1].findCommonAncestor(root.children[1].children[0].children[0]);
    //             assert.deepStrictEqual(ancestor, root.children[1]);
    //         });

    //         it('child and parent => parent', () => {
    //             ancestor = root.children[2].children[0].findCommonAncestor(root.children[2]);
    //             assert.deepStrictEqual(ancestor, root.children[2]);
    //         });
    //     });
    // });
});
