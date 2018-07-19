import fs from 'fs';
import assert from 'assert';
import VectorTileParser from '../../src/Parser/VectorTileParser';
import Extent from '../../src/Core/Geographic/Extent';

// this PBF file comes from https://github.com/mapbox/vector-tile-js
// it contains two square polygons
const multipolygon = fs.readFileSync('test/data/pbf/multipolygon.pbf');

function parse(pbf) {
    const coords = new Extent('TMS', 1, 1, 1);
    const extent = new Extent(
        'EPSG:3857',
        -20037508.342789244, 20037508.342789244,
        -20037508.342789255, 20037508.342789244);
    return VectorTileParser.parse(pbf, { coords, extent });
}

describe('Vector tiles', function () {
    it('should return two squares', () =>
        parse(multipolygon).then((collection) => {
            // two squares (4 + 1 closing vertices)
            assert.ok(collection.features[0].vertices.length == 10);

            const square1 = collection.features[0].vertices.slice(0, 5);
            const square2 = collection.features[0].vertices.slice(5);

            // first and last points are the same
            assert.ok(square1[0].x() == square1[4].x());
            assert.ok(square1[0].y() == square1[4].y());
            assert.ok(square2[0].x() == square2[4].x());
            assert.ok(square2[0].y() == square2[4].y());
        }));
});
