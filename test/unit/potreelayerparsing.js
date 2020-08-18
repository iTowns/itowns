import assert from 'assert';
import PotreeLayer from 'Layer/PotreeLayer';
import PotreeSource from 'Source/PotreeSource';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import View from 'Core/View';
import HttpsProxyAgent from 'https-proxy-agent';
import Renderer from './bootstrap';

describe('Potree Provider', function () {
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
        let source = new PotreeSource({
            file: 'eglise_saint_blaise_arles.js',
            url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            cloud,
        });

        const p1 = new PotreeLayer('pointsCloud1', { source, crs: view.referenceCrs });
        ps.push(p1);
        p1.whenReady.then((l) => {
            const normalDefined = l.material.defines.NORMAL || l.material.defines.NORMAL_SPHEREMAPPED || l.material.defines.NORMAL_OCT16;
            assert.ok(!normalDefined);
        });

        // // // normals as vector
        source = new PotreeSource({
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

        const p2 = new PotreeLayer('pointsCloud2', { source, crs: view.referenceCrs });
        ps.push(p2);
        p2.whenReady.then((l) => {
            assert.ok(l.material.defines.NORMAL);
            assert.ok(!l.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(!l.material.defines.NORMAL_OCT16);
        });

        // // spheremapped normals
        source = new PotreeSource({
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
        const p3 = new PotreeLayer('pointsCloud3', { source, crs: view.referenceCrs });

        ps.push(p3);
        p3.whenReady.then((l) => {
            assert.ok(!l.material.defines.NORMAL);
            assert.ok(l.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(!l.material.defines.NORMAL_OCT16);
        });

        // // oct16 normals
        source = new PotreeSource({
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
        const p4 = new PotreeLayer('pointsCloud4', { source, crs: view.referenceCrs });

        ps.push(p4);
        p4.whenReady.then((l) => {
            assert.ok(!l.material.defines.NORMAL);
            assert.ok(!l.material.defines.NORMAL_SPHEREMAPPED);
            assert.ok(l.material.defines.NORMAL_OCT16);
        });

        ps.forEach(p => View.prototype.addLayer.call(view, p));

        Promise.all(ps.map(p => p.whenReady)).then(() => done());
    });
});


describe('getObjectToUpdateForAttachedLayers', function () {
    it('should correctly no-parent for the root', function () {
        const meta = {
            obj: 'a',
        };
        assert.equal(PotreeLayer.prototype.getObjectToUpdateForAttachedLayers(meta).element, 'a');
    });
    it('should correctly return the element and its parent', function () {
        const meta = {
            obj: 'a',
            parent: {
                obj: 'b',
            },
        };
        const result = PotreeLayer.prototype.getObjectToUpdateForAttachedLayers(meta);
        assert.equal(result.element, 'a');
        assert.equal(result.parent, 'b');
    });
});
