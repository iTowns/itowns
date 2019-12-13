import assert from 'assert';
import { Group } from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Coordinates from 'Core/Geographic/Coordinates';
import Renderer from './mock';

const renderer = new Renderer();
const threedTilesLayer = new GeometryLayer('3d-tiles-discrete-lod', new Group());

threedTilesLayer.name = 'DiscreteLOD';
threedTilesLayer.url = 'https://raw.githubusercontent.com/AnalyticalGraphicsInc/3d-tiles-samples/master/tilesets/TilesetWithDiscreteLOD/tileset.json';
threedTilesLayer.protocol = '3d-tiles';
threedTilesLayer.overrideMaterials = true;  // custom cesium shaders are not functional

if (process.env.HTTPS_PROXY) {
    threedTilesLayer.networkOptions = { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) };
}

const p = { coord: new Coordinates('EPSG:4326', -75.6114, 40.03428, 0), heading: 180, range: 4000, tilt: 22 };
const viewer = new GlobeView(renderer.domElement, p, { renderer, noControls: true });

const context = {
    camera: viewer.camera,
    engine: viewer.mainLoop.gfxEngine,
    scheduler: viewer.mainLoop.scheduler,
    geometryLayer: threedTilesLayer,
    view: viewer,
};

describe('3Dtiles layer', function () {
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
