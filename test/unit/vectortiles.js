import fs from 'fs';
import assert from 'assert';
import HttpsProxyAgent from 'https-proxy-agent';
import VectorTileParser from 'Parser/VectorTileParser';
import VectorTilesSource from 'Source/VectorTilesSource';
import Extent from 'Core/Geographic/Extent';

describe('Vector tiles', function () {
    // this PBF file comes from https://github.com/mapbox/vector-tile-js
    // it contains two square polygons
    const multipolygon = fs.readFileSync('test/data/pbf/multipolygon.pbf');
    multipolygon.extent = new Extent('TMS', 1, 1, 1);

    function parse(pbf, layers) {
        return VectorTileParser.parse(pbf, {
            crsIn: 'EPSG:4326',
            crsOut: 'EPSG:3857',
            layers,
        });
    }

    it('returns two squares', () => {
        parse(multipolygon, {
            geojson: [{
                id: 0,
                filterExpression: { filter: () => true },
                minzoom: 1,
                maxzoom: 24,
            }],
        }).then((collection) => {
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
        });
    });

    it('returns nothing', () => {
        parse(null).then((collection) => {
            assert.equal(collection, undefined);
        });
    });

    it('filters all features out', () => {
        parse(multipolygon, {}).then((collection) => {
            assert.equal(collection.features.length, 0);
        });
    });

    describe('VectorTilesSource', function () {
        it('throws an error because no style was provided', () => {
            assert.throws(() => new VectorTilesSource({}), {
                name: 'Error',
                message: 'New VectorTilesSource: style is required',
            });
        });

        it('reads tiles URL from the style', (done) => {
            const source = new VectorTilesSource({
                style: {
                    sources: { geojson: { tiles: ['http://server.geo/{z}/{x}/{y}.pbf'] } },
                    layers: [],
                },
            });
            source.whenReady.then(() => {
                // eslint-disable-next-line no-template-curly-in-string
                assert.equal(source.url, 'http://server.geo/${z}/${x}/${y}.pbf');
                done();
            });
        });

        it('reads the background layer', (done) => {
            const source = new VectorTilesSource({
                url: 'fakeurl',
                style: {
                    sources: { geojson: {} },
                    layers: [{ type: 'background' }],
                },
            });
            source.whenReady.then(() => {
                assert.ok(source.backgroundLayer);
                done();
            });
        });

        it('creates styles and assigns filters', (done) => {
            const source = new VectorTilesSource({
                url: 'fakeurl',
                style: {
                    sources: { geojson: {} },
                    layers: [{
                        id: 'land',
                        type: 'fill',
                        paint: {
                            'fill-color': 'rgb(255, 0, 0)',
                        },
                    }],
                },
            });
            source.whenReady.then(() => {
                assert.ok(source.styles.land);
                assert.equal(source.styles.land[0].fill.color, 'rgb(255,0,0)');
                done();
            });
        });

        it('creates styles following stops in it', (done) => {
            const source = new VectorTilesSource({
                url: 'fakeurl',
                style: {
                    sources: { geojson: {} },
                    layers: [{
                        id: 'land',
                        type: 'fill',
                        paint: {
                            'fill-color': 'rgb(255, 0, 0)',
                            'fill-opacity': { stops: [[2, 1], [5, 0.5]] },
                        },
                    }],
                },
            });
            source.whenReady.then(() => {
                assert.equal(source.styles.land.length, 2);
                assert.deepEqual(source.getStyleFromIdZoom('land', 3), source.styles.land[0]);
                assert.deepEqual(source.getStyleFromIdZoom('land', 5), source.styles.land[1]);
                assert.deepEqual(source.getStyleFromIdZoom('land', 8), source.styles.land[1]);
                done();
            });
        });

        it('loads the style from a file', (done) => {
            const source = new VectorTilesSource({
                style: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/vectortiles/style.json',
                networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
            });
            source.whenReady.then(() => {
                assert.equal(source.styles.land.length, 1);
                assert.equal(source.styles.land[0].minzoom, 5);
                assert.equal(source.styles.land[0].maxzoom, 13);
                done();
            });
        });
    });
});
