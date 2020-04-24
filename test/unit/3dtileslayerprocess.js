import assert from 'assert';
import C3DTilesLayer from 'Layer/C3DTilesLayer';
import C3DTilesSource from 'Source/C3DTilesSource';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Coordinates from 'Core/Geographic/Coordinates';
import Renderer from './bootstrap';

describe('3Dtiles layer', function () {
    const renderer = new Renderer();

    const p = { coord: new Coordinates('EPSG:4326', -75.6114, 40.03428, 0), heading: 180, range: 4000, tilt: 22 };

    const viewer = new GlobeView(renderer.domElement, p, { renderer, noControls: true });

    const threedTilesLayer = new C3DTilesLayer('3d-tiles-discrete-lod', {
        source: new C3DTilesSource({
            url: 'https://raw.githubusercontent.com/AnalyticalGraphicsInc/3d-tiles-samples/master/tilesets/TilesetWithDiscreteLOD/tileset.json',
            networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
        }),
        sseThreshold: 0.05,
    }, viewer);

    const context = {
        camera: viewer.camera,
        engine: viewer.mainLoop.gfxEngine,
        scheduler: viewer.mainLoop.scheduler,
        geometryLayer: threedTilesLayer,
        view: viewer,
    };

    it('Add 3dtiles layer', function (done) {
        View.prototype.addLayer.call(viewer, threedTilesLayer).then((layer) => {
            assert.equal(layer.root.children.length, 1);
            done();
        });
    });
    it('preUpdate 3dtiles layer', function () {
        const elements = threedTilesLayer.preUpdate(context, new Set([threedTilesLayer]));
        assert.equal(elements.length, 1);
    });
    it('update 3dtiles layer', function () {
        const node = threedTilesLayer.root;
        viewer.camera.camera3D.updateMatrixWorld();
        threedTilesLayer.update(context, threedTilesLayer, node);
        assert.ok(node.pendingSubdivision);
    });
});
