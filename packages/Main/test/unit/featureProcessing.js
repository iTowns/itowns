import assert from 'assert';
import FeatureProcessing from 'Process/FeatureProcessing';
import LayerUpdateState from 'Layer/LayerUpdateState';
import Style from 'Core/Style';
import Feature2Mesh from 'Converter/Feature2Mesh';
import GeoJsonParser from 'Parser/GeoJsonParser';

import geojson from '../data/geojson/map.geojson';

describe('FeatureProcessing', function () {
    const parsed = GeoJsonParser.parse(geojson, {
        in: { crs: 'EPSG:4326' },
        out: { crs: 'EPSG:4326', buildExtent: true, mergeFeatures: false, structure: '3d' },
    });

    it('should update style for child meshes when layer style changes', function (done) {
        parsed.then((collection) => {
            const style = new Style({ fill: { color: 'red' } });
            const layer = {
                id: 'test-layer',
                object3d: { add: () => {} },
                style,
                convert: Feature2Mesh.convert(),
            };

            // Convert the collection to create feature meshes
            const featureNode = layer.convert.call(layer, collection);

            // Create mock node (tile) with feature attached
            const node = {
                parent: { id: 'parent' },
                visible: true,
                layerUpdateState: {},
                link: {},
            };
            node.layerUpdateState[layer.id] = new LayerUpdateState();
            node.layerUpdateState[layer.id].canTryUpdate = () => false;
            node.link[layer.id] = [{
                collection: featureNode.collection,
                meshes: featureNode.meshes,
                layer: { object3d: { add: () => {} } },
            }];

            const context = { view: {} };

            // Get the child mesh and store initial version
            const childMesh1 = featureNode.meshes.children[0];
            const colorAttr1 = childMesh1.geometry.getAttribute('color');
            const initialColorVersion1 = colorAttr1.version;

            style.fill.color = 'blue';
            FeatureProcessing.update(context, layer, node);

            // Verify color attributes were updated (version incremented)
            assert.ok(colorAttr1.version > initialColorVersion1);

            assert.strictEqual(colorAttr1.array[0], 0);
            assert.strictEqual(colorAttr1.array[1], 0);
            assert.strictEqual(colorAttr1.array[2], 255);
            done();
        }).catch(done);
    });
});
