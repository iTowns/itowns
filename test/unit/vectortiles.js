import fs from 'fs';
import assert from 'assert';
import VectorTileParser from 'Parser/VectorTileParser';
import Extent from 'Core/Geographic/Extent';

// this PBF file comes from https://github.com/mapbox/vector-tile-js
// it contains two square polygons
const multipolygon = fs.readFileSync('test/data/pbf/multipolygon.pbf');

function parse(pbf) {
    pbf.coords = new Extent('TMS', 1, 1, 1);
    return VectorTileParser.parse(pbf, { crsIn: 'EPSG:4326', crsOut: 'EPSG:3857' });
}

describe('Vector tiles', function () {
    it('should return two squares', () =>
        parse(multipolygon).then((collection) => {
            const size = collection.features[0].size;
            // two squares (4 + 1 closing vertices)
            assert.ok(collection.features[0].vertices.length / size == 10);

            const square1 = collection.features[0].vertices.slice(0, 5 * size);
            const square2 = collection.features[0].vertices.slice(5 * size);

            // first and last points are the same
            assert.ok(square1[0] == square1[4 * size]);
            assert.ok(square1[1] == square1[4 * size + 1]);
            assert.ok(square2[0] == square2[4 * size]);
            assert.ok(square2[1] == square2[4 * size + 1]);
        }));
});
