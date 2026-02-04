import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Object3D } from 'three';
import CopcSource from 'Source/CopcSource';
import CopcLayer from 'Layer/CopcLayer';
import CopcNode from 'Core/CopcNode';

const copcUrl = 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz';

describe('COPC', function () {
    let source;
    describe('Copc Source', function () {
        describe('retrieving crs from wkt information', function () {
            it('wkt.srs.type is COMPD_CS', function (done) {
                const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
                source = new CopcSource({
                    url: copcUrl,
                    networkOptions,
                });
                source.whenReady
                    .then((headers) => {
                        assert.ok(headers.header.pointCount);
                        assert.ok(headers.info.spacing);
                        assert.ok(Array.isArray(headers.eb));
                        assert.equal(source.crs, 'EPSG:2992');
                        done();
                    }).catch(done);
            }).timeout(5000);
        });
    });

    describe('Copc Layer', function () {
        it('instanciates a layer', (done) => {
            const layer = new CopcLayer('copc', { source, crs: 'EPSG:4978' });
            layer.startup()
                .then(() => {
                    assert.equal(source.zmin, source.header.min[2]);
                    assert.ok(layer.root.isCopcNode);
                    assert.ok(layer.root.children.length > 0);
                    done();
                }).catch(done);
        });
    });

    describe('COPC Node', function () {
        let root;
        const crs = 'EPSG:4978';
        before('create octree', function () {
            const object3d = new Object3D();
            const source = {
                url: 'http://server.geo',
                extension: 'laz',
                crs,
            };
            root = new CopcNode(0, 0, 0, 0, 0, 1000, source, 4000, crs);
            object3d.add(root.clampOBB);
            root.voxelOBB.box3D.setFromArray([1000, 1000, 1000, 0, 0, 0]);

            root.add(new CopcNode(1, 0, 0, 0, 0, 1000, source, 3000, crs));
            root.add(new CopcNode(1, 0, 0, 1, 0, 1000, source, 3000, crs));
            root.add(new CopcNode(1, 0, 1, 1, 0, 1000, source, 3000, crs));

            root.children[0].add(new CopcNode(2, 0, 0, 0, 0, 1000, source, 2000, crs));
            root.children[0].add(new CopcNode(2, 0, 1, 0, 0, 1000, source, 2000, crs));
            root.children[1].add(new CopcNode(2, 0, 1, 3, 0, 1000, source, 2000, crs));
            root.children[2].add(new CopcNode(2, 0, 2, 2, 0, 1000, source, 2000, crs));
            root.children[2].add(new CopcNode(2, 0, 3, 3, 0, 1000, source, 2000, crs));

            root.children[0].children[0].add(new CopcNode(3, 0, 0, 0, 0, 1000, source, 1000, crs));
            root.children[0].children[0].add(new CopcNode(3, 0, 1, 0, 0, 1000, source, 1000, crs));
            root.children[1].children[0].add(new CopcNode(3, 0, 2, 7, 0, 1000, source, 1000, crs));
            root.children[2].children[0].add(new CopcNode(3, 0, 5, 4, 0, 1000, source, 1000, crs));
            root.children[2].children[1].add(new CopcNode(3, 1, 6, 7, 0, 1000, source, 10, crs));
        });

        describe('finds the common ancestor of two nodes', () => {
            let ancestor;
            it('cousins => grand parent', () => {
                ancestor = root.children[2].children[1].children[0].findCommonAncestor(root.children[2].children[0].children[0]);
                assert.deepStrictEqual(ancestor, root.children[2]);
            });

            it('brothers => parent', () => {
                ancestor = root.children[0].children[0].children[0].findCommonAncestor(root.children[0].children[0].children[1]);
                assert.deepStrictEqual(ancestor, root.children[0].children[0]);
            });

            it('grand child and grand grand child => root', () => {
                ancestor = root.children[0].children[1].findCommonAncestor(root.children[2].children[1].children[0]);
                assert.deepStrictEqual(ancestor, root);
            });

            it('parent and child => parent', () => {
                ancestor = root.children[1].findCommonAncestor(root.children[1].children[0].children[0]);
                assert.deepStrictEqual(ancestor, root.children[1]);
            });

            it('child and parent => parent', () => {
                ancestor = root.children[2].children[0].findCommonAncestor(root.children[2]);
                assert.deepStrictEqual(ancestor, root.children[2]);
            });
        });
    });
});
