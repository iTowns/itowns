import assert from 'assert';
import C3DTilesLayer, { $3dTilesExtensions } from 'Layer/C3DTilesLayer';
import BatchTableHierarchyExtensionParser from 'Parser/BatchTableHierarchyExtensionParser';
import C3DTilesSource from 'Source/C3DTilesSource';
import View from 'Core/View';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Coordinates from 'Core/Geographic/Coordinates';
import Renderer from './bootstrap';

describe('3Dtiles batch table', function () {
    const renderer = new Renderer();

    const p = {
        coord: new Coordinates('EPSG:4326', -75.61349, 40.044259),
        range: 200,
        tilt: 10,
        heading: -145,
    };
    const viewer = new GlobeView(renderer.domElement, p, { renderer, noControls: true });


    const threedTilesLayerBTHierarchy = new C3DTilesLayer(
        '3d-tiles-bt-hierarchy', {
            name: 'BTHierarchy',
            source: new C3DTilesSource({
                url: 'https://raw.githubusercontent.com/AnalyticalGraphicsInc/cesium/master/Apps/SampleData/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json',
                networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            }),
        }, viewer);

    $3dTilesExtensions.registerExtension(
        '3DTILES_batch_table_hierarchy',
        BatchTableHierarchyExtensionParser.parse);

    it('Add 3dtiles layer with batch table', function (done) {
        View.prototype.addLayer.call(viewer, threedTilesLayerBTHierarchy).then((layer) => {
            assert.equal(layer.root.children.length, 1);
            const batchLength = viewer.getLayerById('3d-tiles-bt-hierarchy').root.batchTable.batchLength;
            assert.equal(batchLength, 30);
            done();
        });
    });
});
