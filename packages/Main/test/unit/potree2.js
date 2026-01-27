import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { Vector3, Object3D } from 'three';
import View from 'Core/View';
import Potree2Layer from 'Layer/Potree2Layer';
import Potree2Source from 'Source/Potree2Source';
import Potree2BinParser from 'Parser/Potree2BinParser';
import Potree2Node from 'Core/Potree2Node';
import Renderer from './bootstrap';

const object3d = new Object3D();

describe('Potree2', function () {
    let renderer;
    let viewer;
    let potree2Source;
    let potree2Layer;
    let context;
    let elt;

    before(function () {
        renderer = new Renderer();
        viewer = new View('EPSG:4978', renderer.domElement, { renderer });
        viewer.camera.camera3D.position.copy(new Vector3(0, 0, 10));

        // Configure Point Cloud layer
        potree2Source = new Potree2Source({
            file: 'metadata.json',
            url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/potree2.0/lion',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            crs: viewer.referenceCrs,
        });
        potree2Layer = new Potree2Layer('lion', {
            source: potree2Source,
        });

        context = {
            camera: viewer.camera,
            engine: viewer.mainLoop.gfxEngine,
            scheduler: viewer.mainLoop.scheduler,
            geometryLayer: potree2Layer,
            view: viewer,
        };
    });

    it('no crs -> should fail', function () {
        try {
            // eslint-disable-next-line no-unused-vars
            const source = new Potree2Source({
                file: 'metadata.json',
                url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/potree2.0/lion',
                networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            });
        } catch (err) {
            assert.ok(err instanceof Error);
            assert.equal(err.message, 'New PotreeSource: crs is required');
        }
    });

    it('Add point potree2 layer', function (done) {
        View.prototype.addLayer.call(viewer, potree2Layer)
            .then(() => {
                context.camera.camera3D.updateMatrixWorld();
                // loadOctree() is now called during the load
                // assert.equal(potree2Layer.root.children.length, 6);
                assert.ok(potree2Layer.root instanceof Potree2Node);
                assert.ok(potree2Layer.object3d.children.indexOf(potree2Layer.root.clampOBB) >= 0);
                done();
            }).catch(done);
    });

    it('preupdate potree2 layer', function () {
        elt = potree2Layer.preUpdate(context, new Set([potree2Layer]));
        assert.equal(elt.length, 1);
    });

    it('update potree2 layer', function (done) {
        assert.equal(potree2Layer.group.children.length, 0);
        potree2Layer.update(context, potree2Layer, elt[0]);
        elt[0].promise
            .then(() => {
                assert.equal(potree2Layer.group.children.length, 1);
                done();
            }).catch(done);
    }).timeout(10000);

    it('postUpdate potree2 layer', function () {
        potree2Layer.postUpdate(context, potree2Layer);
    });

    describe('potree2 Node', function () {
        const numPoints = 1000;
        const childrenBitField = 5;

        it('instance', function (done) {
            const root = new Potree2Node(0, -1, numPoints, childrenBitField, potree2Source);
            assert.equal(root.numPoints, numPoints);
            assert.equal(root.childrenBitField, childrenBitField);
            done();
        });

        it('load octree', function (done) {
            const root = new Potree2Node(0, -1, numPoints, childrenBitField, potree2Source);
            object3d.add(root.clampOBB);
            root.byteOffset = 0n;
            root.byteSize = 12650n;
            root.loadOctree()
                .then(() => {
                    assert.equal(root.children.length, 6);
                    done();
                }).catch(done);
        });

        it('load child node', function (done) {
            const root = new Potree2Node(0, -1, numPoints, childrenBitField, potree2Source, 'EPSG:4978');
            object3d.add(root.clampOBB);
            root.byteOffset = 0n;
            root.byteSize = 12650n;
            root.loadOctree()
                .then(() => root.children[0].load()
                    .then(() => {
                        assert.equal(root.children[0].children.length, 8);
                        done();
                    }),
                ).catch(done);
        });
    });

    after(async function () {
        await Potree2BinParser.terminate();
    });
});
