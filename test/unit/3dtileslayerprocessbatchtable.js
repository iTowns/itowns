import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import C3DTilesLayer from 'Layer/C3DTilesLayer';
import C3DTBatchTableHierarchyExtension from 'Core/3DTiles/C3DTBatchTableHierarchyExtension';
import C3DTilesSource from 'Source/C3DTilesSource';
import C3DTExtensions from 'Core/3DTiles/C3DTExtensions';
import { C3DTilesTypes } from 'Core/3DTiles/C3DTilesEnums';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import Fetcher from 'Provider/Fetcher';
import sinon from 'sinon';
import Renderer from './bootstrap';

const url = 'https://raw.githubusercontent.com/AnalyticalGraphicsInc/cesium/master/Apps/SampleData/Cesium3DTiles/Hierarchy/BatchTableHierarchy';
const b3dmUrl = `${url}/tile.b3dm`;
const tilesetUrl = `${url}/tileset.json`;

describe('3Dtiles batch table', function () {
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
        let viewer;
        let ogc3DTilesLayerBTHierarchy;

        before(function () {
            stubFetcherJson = sinon.stub(Fetcher, 'json')
                .callsFake(() => Promise.resolve(tileset));

            stubFetcherArrayBuf = sinon.stub(Fetcher, 'arrayBuffer')
                .callsFake(() => Promise.resolve(b3dm));

            if (!dataFetched) { this.skip(); }

            const renderer = new Renderer();
            const p = {
                coord: new Coordinates('EPSG:4326', -75.61349, 40.044259),
                range: 200,
                tilt: 10,
                heading: -145,
            };
            viewer = new GlobeView(renderer.domElement, p, { renderer, noControls: true });

            // Map the extension name to its manager
            const extensions = new C3DTExtensions();
            extensions.registerExtension('3DTILES_batch_table_hierarchy',
                { [C3DTilesTypes.batchtable]:
            C3DTBatchTableHierarchyExtension });

            const source = new C3DTilesSource({
                url: 'https://raw.githubusercontent.com/AnalyticalGraphicsInc/cesium/master/Apps/SampleData/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json',
            });
            ogc3DTilesLayerBTHierarchy = new C3DTilesLayer('3d-tiles-bt-hierarchy', {
                name: 'BTHierarchy',
                source,
                registeredExtensions: extensions,
            }, viewer);
        });

        after(() => {
            stubFetcherJson.restore();
            stubFetcherArrayBuf.restore();
        });

        it('Add 3dtiles layer with batch table', function (done) {
            View.prototype.addLayer.call(viewer, ogc3DTilesLayerBTHierarchy)
                .then((layer) => {
                    assert.equal(layer.root.children.length, 1);
                    const batchLength = viewer.getLayerById('3d-tiles-bt-hierarchy').root.batchTable.batchLength;
                    assert.equal(batchLength, 30);
                    done();
                }).catch(done);
        });
    });
});
