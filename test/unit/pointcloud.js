import assert from 'assert';
import PointCloudLayer from 'Layer/PointCloudLayer';
import PointCloudSource from 'Source/PointCloudSource';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Coordinates from 'Core/Geographic/Coordinates';
import PointCloudNode from 'Core/PointCloudNode';
import Renderer from './mock';

const renderer = new Renderer();

const placement = { coord: new Coordinates('EPSG:4326', 4.631512, 43.675626), range: 250 };
const viewer = new GlobeView(renderer.domElement, placement, { renderer });

// Configure Point Cloud layer
const pointcloud = new PointCloudLayer('eglise_saint_blaise_arles', {
    source: new PointCloudSource({
        file: 'eglise_saint_blaise_arles.js',
        url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    }),
    onPointsCreated: () => {},
}, viewer);

const context = {
    camera: viewer.camera,
    engine: viewer.mainLoop.gfxEngine,
    scheduler: viewer.mainLoop.scheduler,
    geometryLayer: pointcloud,
    view: viewer,
};

describe('point cloud', function () {
    it('Add point cloud layer', function (done) {
        View.prototype.addLayer.call(viewer, pointcloud).then((layer) => {
            context.camera.camera3D.updateMatrixWorld();
            assert.equal(layer.root.children.length, 7);
            layer.bboxes.visible = true;
            done();
        });
    });

    let elt;
    it('preupdate point cloud layer', function () {
        elt = pointcloud.preUpdate(context, new Set([pointcloud]));
        assert.equal(elt.length, 1);
    });

    it('update point cloud layer', function (done) {
        assert.equal(pointcloud.group.children.length, 0);
        pointcloud.update(context, pointcloud, elt[0]);
        elt[0].promise.then(() => {
            assert.equal(pointcloud.group.children.length, 1);
            done();
        });
    });

    it('postUpdate point cloud layer', function () {
        pointcloud.postUpdate(context, pointcloud);
    });
});

const numPoints = 1000;
const childrenBitField = 5;

describe('point cloud node', function () {
    it('instance', function (done) {
        const root = new PointCloudNode(numPoints, childrenBitField, pointcloud);
        assert.equal(root.numPoints, numPoints);
        assert.equal(root.childrenBitField, childrenBitField);
        done();
    });

    it('load octree', function (done) {
        const root = new PointCloudNode(numPoints, childrenBitField, pointcloud);
        root.loadOctree().then(() => {
            assert.equal(7, root.children.length);
            done();
        });
    });

    it('load child node', function (done) {
        const root = new PointCloudNode(numPoints, childrenBitField, pointcloud);
        root.loadOctree().then(() => {
            root.children[0].loadNode().then(() => {
                assert.equal(2, root.children[0].children.length);
                done();
            });
        });
    });
});

