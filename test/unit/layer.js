import assert from 'assert';
import Layer, { ImageryLayers } from 'Layer/Layer';
import ColorLayer from 'Layer/ColorLayer';
import GlobeView from 'Core/Prefab/GlobeView';
import FileSource from 'Source/FileSource';
import Coordinates from 'Core/Geographic/Coordinates';
import HttpsProxyAgent from 'https-proxy-agent';
import Renderer from './bootstrap';

describe('Layer', function () {
    it('should emit an event on property changed', function () {
        const layer = new Layer('testId', { source: false });
        layer.defineLayerProperty('test', 0);
        layer.addEventListener('test-property-changed', (e) => {
            assert.equal(e.type, 'test-property-changed');
            assert.equal(e.previous.test, 0);
            assert.equal(e.new.test, 1);
        });
        layer.test = 1;
    });
});

describe('ImageryLayers', function () {
    const layers = [
        new ColorLayer('l0', { source: false }),
        new ColorLayer('l1', { source: false }),
        new ColorLayer('l2', { source: false }),
        new ColorLayer('l3', { source: false }),
    ];

    layers[0].sequence = 0;
    layers[1].sequence = 1;
    layers[2].sequence = 2;
    layers[3].sequence = 3;

    it('should return all layers id in order', function () {
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l0');
        assert.equal(res[1], 'l1');
        assert.equal(res[2], 'l2');
        assert.equal(res[3], 'l3');
    });

    it('should move the layer l3 to the first index', function () {
        ImageryLayers.moveLayerToIndex(layers[3], 0, layers);
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l3');
        assert.equal(res[1], 'l0');
        assert.equal(res[2], 'l1');
        assert.equal(res[3], 'l2');
    });

    it('should move the layer l1 to the second index', function () {
        ImageryLayers.moveLayerDown(layers[1], layers);
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l3');
        assert.equal(res[1], 'l1');
        assert.equal(res[2], 'l0');
        assert.equal(res[3], 'l2');
    });

    it('should move the layer l0 to the last index', function () {
        ImageryLayers.moveLayerUp(layers[0], layers);
        const res = ImageryLayers.getColorLayersIdOrderedBySequence(layers);
        assert.equal(res[0], 'l3');
        assert.equal(res[1], 'l1');
        assert.equal(res[2], 'l2');
        assert.equal(res[3], 'l0');
    });

    it('throws error when instance layer without Source', function () {
        assert.throws(() => new ColorLayer('id'), /^Error: Layer id needs Source$/);
    });
});

describe('ColorLayer', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    const source = new FileSource({
        url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson',
        crs: 'EPSG:4326',
        format: 'application/json',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    });

    const ariege = new ColorLayer('ariege', {
        transparent: true,
        style: {
            fill: { color: 'blue', opacity: 0.8 },
            stroke: { color: 'black', width: 1.0 },
        },
        source,
        zoom: { min: 11 },
    });
    viewer.addLayer(ariege);

    it('invalidate cache', function () {
        ariege.invalidateCache();
        assert.equal(ariege.parent.level0Nodes[0].redraw, true);
        assert.equal(ariege.parent.level0Nodes[0].layerUpdateState[ariege.id], undefined);
    });
});
