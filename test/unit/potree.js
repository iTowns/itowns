import assert from 'assert';
import PotreeLayer from 'Layer/PotreeLayer';
import PotreeSource from 'Source/PotreeSource';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Coordinates from 'Core/Geographic/Coordinates';
import PotreeNode from 'Core/PotreeNode';
import PointsMaterial from 'Renderer/PointsMaterial';
import OrientedImageMaterial from 'Renderer/OrientedImageMaterial';
import Renderer from './bootstrap';

describe('Potree', function () {
    const placement = { coord: new Coordinates('EPSG:4326', 4.631512, 43.675626), range: 250 };
    let renderer;
    let viewer;
    let potreeLayer;
    let context;
    let elt;

    before(function () {
        renderer = new Renderer();
        viewer = new GlobeView(renderer.domElement, placement, { renderer });

        // Configure Point Cloud layer
        potreeLayer = new PotreeLayer('eglise_saint_blaise_arles', {
            source: new PotreeSource({
                file: 'eglise_saint_blaise_arles.js',
                url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
                networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            }),
            onPointsCreated: () => {},
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

    it('Add point potree layer', function (done) {
        View.prototype.addLayer.call(viewer, potreeLayer).then((layer) => {
            context.camera.camera3D.updateMatrixWorld();
            assert.equal(layer.root.children.length, 7);
            layer.bboxes.visible = true;
            done();
        });
    });

    it('preupdate potree layer', function () {
        elt = potreeLayer.preUpdate(context, new Set([potreeLayer]));
        assert.equal(elt.length, 1);
    });

    it('update potree layer', function (done) {
        assert.equal(potreeLayer.group.children.length, 0);
        potreeLayer.update(context, potreeLayer, elt[0]);
        elt[0].promise.then(() => {
            assert.equal(potreeLayer.group.children.length, 1);
            done();
        });
    });

    it('postUpdate potree layer', function () {
        potreeLayer.postUpdate(context, potreeLayer);
    });

    describe('potree Node', function () {
        const numPoints = 1000;
        const childrenBitField = 5;

        it('instance', function (done) {
            const root = new PotreeNode(numPoints, childrenBitField, potreeLayer);
            assert.equal(root.numPoints, numPoints);
            assert.equal(root.childrenBitField, childrenBitField);
            done();
        });

        it('load octree', function (done) {
            const root = new PotreeNode(numPoints, childrenBitField, potreeLayer);
            root.loadOctree().then(() => {
                assert.equal(7, root.children.length);
                done();
            });
        });

        it('load child node', function (done) {
            const root = new PotreeNode(numPoints, childrenBitField, potreeLayer);
            root.loadOctree().then(() => {
                root.children[0].load().then(() => {
                    assert.equal(2, root.children[0].children.length);
                    done();
                });
            });
        });
    });

    describe('Point Material and oriented images', () => {
        const orientedImageMaterial = new OrientedImageMaterial([]);
        const pMaterial = new PointsMaterial({ orientedImageMaterial });
        const pMaterial2 = new PointsMaterial();
        it('instance', () => {
            assert.ok(pMaterial);
        });
        it('Define isWebGL2 on before compile', () => {
            const shader = {};
            pMaterial.onBeforeCompile(shader, renderer);
            assert.equal(shader.glslVersion, '300 es');
        });
        it('copy', () => {
            pMaterial2.copy(pMaterial);
            assert.equal(pMaterial2.uniforms.projectiveTextureAlphaBorder.value, 20);
        });
        it('update', () => {
            pMaterial.visible = false;
            pMaterial2.update(pMaterial);
            assert.equal(pMaterial2.visible, false);
        });
    });
});
