import fs from 'fs';
import assert from 'assert';
import VectorTileParser from 'Parser/VectorTileParser';
import Extent from 'Core/Geographic/Extent';

const paints = [{
    'fill-color': 'rgb(50%, 0%, 0%)',
    'fill-opacity': 0.5,
}, {
    'fill-color': 'rgba(0, 0, 0, 0.5)',
}, {
    'fill-color': 'hsla(0, 10%, 0%, 0.3)',
}, {
    'line-color': 'hsla(0, 0%, 50%, 0.3)',
    'line-width': 3,
    'line-opacity': 0.4,
},
];

// this PBF file comes from https://github.com/mapbox/vector-tile-js
// it contains two square polygons
const multipolygon = fs.readFileSync('test/data/pbf/multipolygon.pbf');
let id = 0;
function parse(pbf, paint, type) {
    pbf.extent = new Extent('TMS', 1, 1, 1);
    return VectorTileParser.parse(pbf, {
        crsIn: 'EPSG:4326',
        crsOut: 'EPSG:3857',
        filter: [{
            'source-layer': 'geojson',
            paint,
            id: id++,
            type,
        }],
    });
}

describe('Vector tiles', function () {
    it('should return two squares', () =>
        parse(multipolygon).then((collection) => {
            const feature = collection.features[0];
            const size = feature.size;
            // two squares (4 + 1 closing vertices)
            assert.ok(feature.vertices.length / size == 10);

            const square1 = feature.vertices.slice(0, 5 * size);
            const square2 = feature.vertices.slice(5 * size);

            // first and last points are the same
            assert.equal(square1[0], square1[4 * size]);
            assert.equal(square1[1], square1[4 * size + 1]);
            assert.equal(square2[0], square2[4 * size]);
            assert.equal(square2[1], square2[4 * size + 1]);
        }));
    it('should parse hsl to style fill color and opacity', () =>
        parse(multipolygon, paints[0], 'fill').then((collection) => {
            const style = collection.features[0].style;
            assert.equal(style.fill.color, paints[0]['fill-color'].replace(/ /g, ''));
            assert.equal(style.fill.opacity, 0.5);
        }));
    it('should parse rgba to style fill opacity', () =>
        parse(multipolygon, paints[1], 'fill').then((collection) => {
            const style = collection.features[0].style;
            assert.equal(style.fill.opacity, 0.5);
        }));
    it('should parse hsla to style fill color and opacity', () =>
        parse(multipolygon, paints[2], 'fill').then((collection) => {
            const style = collection.features[0].style;
            assert.equal(style.fill.opacity, 0.3);
            assert.equal(style.fill.color, 'hsl(0,10%,0%)');
        }));
    it('should parse line to style line', () =>
        parse(multipolygon, paints[3], 'line').then((collection) => {
            const style = collection.features[0].style;
            assert.equal(style.stroke.opacity, 0.4);
            assert.equal(style.stroke.width, 3);
            assert.equal(style.stroke.color, 'hsl(0,0%,50%)');
        }));
});
