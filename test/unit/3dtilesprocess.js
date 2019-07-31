/* global process */
import assert from 'assert';
import { Group } from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import CameraUtils from 'Utils/CameraUtils';
import Coordinates from 'Core/Geographic/Coordinates';
import Renderer from './mock';

const renderer = new Renderer();

const coordinatesOnGlobe = new Coordinates('EPSG:4326', -75.6134910, 40.0442592, 0);
const threedTilesLayer = new GeometryLayer('3d-tiles-discrete-lod', new Group());

threedTilesLayer.name = 'DiscreteLOD';
threedTilesLayer.url = 'https://raw.githubusercontent.com/AnalyticalGraphicsInc/3d-tiles-samples/master/tilesets/TilesetWithDiscreteLOD/tileset.json';
threedTilesLayer.protocol = '3d-tiles';
threedTilesLayer.overrideMaterials = true;  // custom cesium shaders are not functional

if (process.env.HTTPS_PROXY) {
    threedTilesLayer.networkOptions = { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) };
}

const viewer = new GlobeView('EPSG:4326', coordinatesOnGlobe, { renderer, noControls: true });

const p = { coord: coordinatesOnGlobe, heading: -145, range: 200, tilt: 10 };
CameraUtils.transformCameraToLookAtTarget(viewer, viewer.camera.camera3D, p);

// viewer.controls.lookAtCoordinate({ range: 200, tilt: 10, heading: -145 }, false);
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
        threedTilesLayer.update(context, threedTilesLayer, node);
        assert.ok(node.pendingSubdivision);
    });
});
