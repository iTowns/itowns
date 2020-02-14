import assert from 'assert';
import PointCloudLayer from 'Layer/PointCloudLayer';
import PointCloudSource from 'Source/PointCloudSource';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Renderer from './mock';

describe('PointCloudProvider', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };
    const view = new GlobeView(renderer.domElement, placement, { renderer });

    it('should correctly parse normal information in cloud', function (done) {
        // No normals
        const cloud = {
            boundingBox: { lx: 0, ly: 1, ux: 2, uy: 3 },
            scale: 1.0,
            pointAttributes: ['POSITION', 'RGB'],
            octreeDir: 'eglise_saint_blaise_arles',
        };

        const ps = [];
        let source = new PointCloudSource({
            file: 'eglise_saint_blaise_arles.js',
            url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            cloud,
        });
        ps.push(new PointCloudLayer('pointsCloud', { source }, view).whenReady.then((l) => {
            const normalDefined = l.material.defines.NORMAL || l.material.defines.NORMAL_SPHEREMAPPED || l.material.defines.NORMAL_OCT16;
            assert.ok(!normalDefined);
        }));

        // // // normals as vector
        source = new PointCloudSource({
            file: 'eglise_saint_blaise_arles.js',
            url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            cloud: {
                boundingBox: { lx: 0, ly: 1, ux: 2, uy: 3 },
                scale: 1.0,
                pointAttributes: ['POSITION', 'NORMAL', 'CLASSIFICATION'],
                octreeDir: 'eglise_saint_blaise_arles',
            },
        });
        ps.push(new PointCloudLayer('pointsCloud', { source }, view).whenReady.then((l) => {
            assert.ok(l.material.defines.NORMAL);
            assert.ok(!l.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(!l.material.defines.NORMAL_OCT16);
        }));

        // // spheremapped normals
        source = new PointCloudSource({
            file: 'eglise_saint_blaise_arles.js',
            url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            cloud: {
                boundingBox: { lx: 0, ly: 1, ux: 2, uy: 3 },
                scale: 1.0,
                pointAttributes: ['POSITION', 'COLOR_PACKED', 'NORMAL_SPHEREMAPPED'],
                octreeDir: 'eglise_saint_blaise_arles',
            },
        });
        ps.push(new PointCloudLayer('pointsCloud', { source }, view).whenReady.then((l) => {
            assert.ok(!l.material.defines.NORMAL);
            assert.ok(l.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(!l.material.defines.NORMAL_OCT16);
        }));

        // // oct16 normals
        source = new PointCloudSource({
            file: 'eglise_saint_blaise_arles.js',
            url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            cloud: {
                boundingBox: { lx: 0, ly: 1, ux: 2, uy: 3 },
                scale: 1.0,
                pointAttributes: ['POSITION', 'COLOR_PACKED', 'CLASSIFICATION', 'NORMAL_OCT16'],
                octreeDir: 'eglise_saint_blaise_arles',
            },
        });
        ps.push(new PointCloudLayer('pointsCloud', { source }, view).whenReady.then((l) => {
            assert.ok(!l.material.defines.NORMAL);
            assert.ok(!l.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(l.material.defines.NORMAL_OCT16);
        }));

        Promise.all(ps).then(() => done());
    });
});


describe('getObjectToUpdateForAttachedLayers', function () {
    it('should correctly no-parent for the root', function () {
        const meta = {
            obj: 'a',
        };
        assert.equal(PointCloudLayer.prototype.getObjectToUpdateForAttachedLayers(meta).element, 'a');
    });
    it('should correctly return the element and its parent', function () {
        const meta = {
            obj: 'a',
            parent: {
                obj: 'b',
            },
        };
        const result = PointCloudLayer.prototype.getObjectToUpdateForAttachedLayers(meta);
        assert.equal(result.element, 'a');
        assert.equal(result.parent, 'b');
    });
});
