import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import C3DTilesLayer from 'Layer/C3DTilesLayer';
import C3DTilesSource from 'Source/C3DTilesSource';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import Renderer from './bootstrap';

const url = 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/main/1.0/TilesetWithDiscreteLOD';
const tilesetUrl = `${url}/tileset.json`;
const b3dmUrl = `${url}/dragon_low.b3dm`;

describe('3Dtiles layer', function () {
    let tileset;
    let b3dm;
    let dataFetched;
    it('fetch binaries', async function () {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        tileset = await Fetcher.json(tilesetUrl, networkOptions);
        b3dm = await Fetcher.arrayBuffer(b3dmUrl, networkOptions);
        dataFetched = true;
    });

    describe('unit tests', function () {
        let stubFetcherArrayBuf;
        let stubFetcherJson;
        let context;
        let viewer;
        let ogc3DTilesLayer;

        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(() => Promise.resolve(tileset));

            stubFetcherArrayBuf = sinon.stub(Fetcher, 'arrayBuffer')
                .callsFake(() => Promise.resolve(b3dm));

            if (!dataFetched) { this.skip(); }

            const renderer = new Renderer();
            const p = { coord: new Coordinates('EPSG:4326', -75.6114, 40.03428, 0), heading: 180, range: 4000, tilt: 22 };
            viewer = new GlobeView(renderer.domElement, p, { renderer, noControls: true });

            const source = new C3DTilesSource({
                url: 'https://raw.githubusercontent.com/CesiumGS/3d-tiles-samples/master/1.0/TilesetWithDiscreteLOD/tileset.json',
            });
            ogc3DTilesLayer = new C3DTilesLayer('3d-tiles-discrete-lod', {
                source,
                sseThreshold: 0.05,
            }, viewer);

            context = {
                camera: viewer.camera,
                engine: viewer.mainLoop.gfxEngine,
                scheduler: viewer.mainLoop.scheduler,
                geometryLayer: ogc3DTilesLayer,
                view: viewer,
            };
        });

        after(() => {
            stubFetcherArrayBuf.restore();
            stubFetcherJson.restore();
        });

        it('Add 3dtiles layer', function (done) {
            View.prototype.addLayer.call(viewer, ogc3DTilesLayer)
                .then((layer) => {
                    assert.equal(layer.root.children.length, 1);
                    done();
                }).catch(done);
        });

        it('preUpdate 3dtiles layer', function () {
            const elements = ogc3DTilesLayer.preUpdate(context, new Set([ogc3DTilesLayer]));
            assert.equal(elements.length, 1);
        });

        it('update 3dtiles layer', function () {
            const node = ogc3DTilesLayer.root;
            viewer.camera3D.updateMatrixWorld();
            ogc3DTilesLayer.update(context, ogc3DTilesLayer, node);
            assert.ok(node.pendingSubdivision);
        });
    });
});
