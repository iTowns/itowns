import assert from 'assert';
import HttpsProxyAgent from 'https-proxy-agent';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import EntwinePointTileSource from 'Source/EntwinePointTileSource';
import EntwinePointTileLayer from 'Layer/EntwinePointTileLayer';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import Renderer from './bootstrap';

describe('Entwine Point Tile', function () {
    const source = new EntwinePointTileSource({
        url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/entwine',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    });

    it('loads the EPT structure', (done) => {
        source.whenReady.then(() => {
            done();
        });
    });

    describe('Layer', function () {
        let renderer;
        let placement;
        let view;
        let layer;
        let context;

        before(function (done) {
            renderer = new Renderer();
            placement = { coord: new Coordinates('EPSG:4326', 0, 0), range: 250 };
            view = new GlobeView(renderer.domElement, placement, { renderer });
            layer = new EntwinePointTileLayer('test', { source }, view);

            context = {
                camera: view.camera,
                engine: view.mainLoop.gfxEngine,
                scheduler: view.mainLoop.scheduler,
                geometryLayer: layer,
                view,
            };

            View.prototype.addLayer.call(view, layer).then(() => {
                done();
            });
        });

        it('pre updates and finds the root', () => {
            const element = layer.preUpdate(context, new Set([layer]));
            assert.strictEqual(element.length, 1);
            assert.deepStrictEqual(element[0], layer.root);
        });

        it('tries to update on the root and fails', function () {
            layer.update(context, layer, layer.root);
            assert.strictEqual(layer.root.promise, undefined);
        });

        it('tries to update on the root and succeeds', function (done) {
            view.controls.lookAtCoordinate({
                coord: source.center,
                range: 250,
            }, false).then(() => {
                layer.update(context, layer, layer.root);
                layer.root.promise.then(() => {
                    done();
                });
            });
        });

        it('post updates', function () {
            layer.postUpdate(context, layer);
        });
    });

    describe('Node', function () {
        const layer = { source: { url: 'http://server.geo', extension: 'laz' } };
        const root = new EntwinePointTileNode(0, 0, 0, 0, layer, 4000);
        root.bbox.setFromArray([1000, 1000, 1000, 0, 0, 0]);

        root.add(new EntwinePointTileNode(1, 0, 0, 0, layer, 3000));
        root.add(new EntwinePointTileNode(1, 0, 0, 1, layer, 3000));
        root.add(new EntwinePointTileNode(1, 0, 1, 1, layer, 3000));

        root.children[0].add(new EntwinePointTileNode(2, 0, 0, 0, layer, 2000));
        root.children[0].add(new EntwinePointTileNode(2, 0, 1, 0, layer, 2000));
        root.children[1].add(new EntwinePointTileNode(2, 0, 1, 3, layer, 2000));
        root.children[2].add(new EntwinePointTileNode(2, 0, 2, 2, layer, 2000));
        root.children[2].add(new EntwinePointTileNode(2, 0, 3, 3, layer, 2000));

        root.children[0].children[0].add(new EntwinePointTileNode(3, 0, 0, 0, layer, 1000));
        root.children[0].children[0].add(new EntwinePointTileNode(3, 0, 1, 0, layer, 1000));
        root.children[1].children[0].add(new EntwinePointTileNode(3, 0, 2, 7, layer, 1000));
        root.children[2].children[0].add(new EntwinePointTileNode(3, 0, 5, 4, layer, 1000));
        root.children[2].children[1].add(new EntwinePointTileNode(3, 1, 6, 7, layer));

        it('finds the common ancestor of two nodes', () => {
            let ancestor = root.children[2].children[1].children[0].findCommonAncestor(root.children[2].children[0].children[0]);
            assert.deepStrictEqual(ancestor, root.children[2]);

            ancestor = root.children[0].children[0].children[0].findCommonAncestor(root.children[0].children[0].children[1]);
            assert.deepStrictEqual(ancestor, root.children[0].children[0]);

            ancestor = root.children[0].children[1].findCommonAncestor(root.children[2].children[1].children[0]);
            assert.deepStrictEqual(ancestor, root);

            ancestor = root.children[1].findCommonAncestor(root.children[1].children[0].children[0]);
            assert.deepStrictEqual(ancestor, root.children[1]);

            ancestor = root.children[2].children[0].findCommonAncestor(root.children[2]);
            assert.deepStrictEqual(ancestor, root.children[2]);
        });
    });
});
