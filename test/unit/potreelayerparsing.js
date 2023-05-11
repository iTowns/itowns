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

        const layers = [];
        let source = new PotreeSource({
            file: 'eglise_saint_blaise_arles.js',
            url: 'https://raw.githubusercontent.com/gmaillet/dataset/master/',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            cloud,
        });

        const layer1 = new PotreeLayer('pointsCloud1', { source, crs: view.referenceCrs });
        layers.push(layer1);
        const p1 = layer1.whenReady.then((l) => {
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

        const layer2 = new PotreeLayer('pointsCloud2', { source, crs: view.referenceCrs });
        layers.push(layer2);
        const p2 = layer2.whenReady.then((l) => {
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
        const layer3 = new PotreeLayer('pointsCloud3', { source, crs: view.referenceCrs });

        layers.push(layer3);
        const p3 = layer3.whenReady.then((l) => {
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
        const layer4 = new PotreeLayer('pointsCloud4', { source, crs: view.referenceCrs });

        layers.push(layer4);
        const p4 = layer4.whenReady
            .then((l) => {
                assert.ok(!l.material.defines.NORMAL);
                assert.ok(!l.material.defines.NORMAL_SPHEREMAPPED);
                assert.ok(l.material.defines.NORMAL_OCT16);
            });

        layers.forEach(p => View.prototype.addLayer.call(view, p));

        Promise.all([p1, p2, p3, p4])
            .then(() => done())
            .catch(done);
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
