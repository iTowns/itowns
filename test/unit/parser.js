import assert from 'assert';
import fs from 'fs';

import GpxParser from 'Parser/GpxParser';
import KMLParser from 'Parser/KMLParser';

describe('Parsers', function () {
    let gpxDom;
    let kmlDom;
    before(() => {
        const domParser = new window.DOMParser();

        const gpxData = fs.readFileSync('test/data/simple.gpx', 'utf8');
        gpxDom = domParser.parseFromString(gpxData, 'text/xml');

        const kmlData = fs.readFileSync('test/data/simple.kml', 'utf8');
        kmlDom = domParser.parseFromString(kmlData, 'text/xml');
    });

    it('parses GPX', () =>
        GpxParser.parse(gpxDom, {
            crsOut: 'EPSG:4978',
        }).then((collection) => {
            assert.equal(collection.features.length, 2);
            // line, 5 points
            assert.equal(collection.features[0].geometries.length, 1);
            assert.equal(collection.features[0].geometries[0].indices[0].count, 5);
            // 5 points
            assert.equal(collection.features[1].geometries.length, 5);
        }));

    it('parses KML', () =>
        KMLParser.parse(kmlDom, {
            crsOut: 'EPSG:4978',
        }).then((collection) => {
            assert.equal(collection.features.length, 3);
            // 3 points
            assert.equal(collection.features[0].geometries.length, 3);
            // line, 6 points
            assert.equal(collection.features[1].geometries.length, 1);
            assert.equal(collection.features[1].geometries[0].indices[0].count, 6);
            // polygon, 5 points
            assert.equal(collection.features[2].geometries.length, 1);
            assert.equal(collection.features[2].geometries[0].indices[0].count, 5);
        }));
});
