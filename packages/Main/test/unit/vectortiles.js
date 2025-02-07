import fs from 'fs';
import assert from 'assert';
import VectorTileParser from 'Parser/VectorTileParser';
import VectorTilesSource from 'Source/VectorTilesSource';
import Tile from 'Core/Tile/Tile';
import urlParser from 'Parser/MapBoxUrlParser';
import Fetcher from 'Provider/Fetcher';
import sinon from 'sinon';

import style from '../data/vectortiles/style.json';
import tilejson from '../data/vectortiles/tilejson.json';
import sprite from '../data/vectortiles/sprite.json';
import mapboxStyle from '../data/mapboxMulti.json';

const resources = {
    'https://test/data/vectortiles/style.json': style,
    'https://test/tilejson.json': tilejson,
    'https://test/sprite.json': sprite,
    'https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v7.json': mapboxStyle,
};

describe('Vector tiles', function () {
    // this PBF file comes from https://github.com/mapbox/vector-tile-js
    // it contains two square polygons
    const multipolygon = fs.readFileSync('test/data/pbf/multipolygon.pbf');
    const tile = new Tile('TMS', 1, 1, 1);

    function parse(pbf, layers) {
        return VectorTileParser.parse(pbf, {
            in: {
                layers,
                styles: [[]],
            },
            out: {
                crs: 'EPSG:3857',
            },
            extent: tile,
        });
    }

    it('returns two squares', (done) => {
        parse(multipolygon, {
            geojson: [{
                id: 0,
                filterExpression: { filter: () => true },
                zoom: {
                    min: 1,
                    max: 24,
                },
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

            done();
        }).catch(done);
    });

    it('returns an empty collection', (done) => {
        parse(null).then((collection) => {
            assert.ok(collection.isFeatureCollection);
            assert.equal(collection.features.length, 0);
            done();
        }).catch(done);
    });

    it('filters all features out', (done) => {
        parse(multipolygon, {}).then((collection) => {
            assert.ok(collection.isFeatureCollection);
            assert.equal(collection.features.length, 0);
            done();
        }).catch(done);
    });
});

describe('VectorTilesSource', function () {
    let stubFetcherJson;
    let stubFetcherArrayBuf;
    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake((url) => {
                url = url.split('?')[0];
                return Promise.resolve(JSON.parse(resources[url]));
            });
        const multipolygon = fs.readFileSync('test/data/pbf/multipolygon.pbf');
        stubFetcherArrayBuf = sinon.stub(Fetcher, 'arrayBuffer')
            .callsFake(() => Promise.resolve(multipolygon));
    });
    after(function () {
        stubFetcherJson.restore();
        stubFetcherArrayBuf.restore();
    });

    it('throws an error because no style was provided', () => {
        assert.throws(() => new VectorTilesSource({}), {
            name: 'Error',
            message: 'New VectorTilesSource: style is required',
        });
    });

    it('reads tiles URL directly from the style', (done) => {
        const source = new VectorTilesSource({
            style: {
                sources: { sourceTiles: { tiles: ['http://server.geo/{z}/{x}/{y}.pbf'] } },
                layers: [],
            },
        });
        source.whenReady.then(() => {
            assert.equal(source.urls.length, 1);
            // eslint-disable-next-line no-template-curly-in-string
            assert.ok(source.urls.includes('http://server.geo/${z}/${x}/${y}.pbf'));
            done();
        })
            .catch(done);
    });

    it('reads tiles URL from an url', (done) => {
        const source = new VectorTilesSource({
            style: {
                sources: { sourceUrl: { url: 'mapbox://mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v7' } },
                layers: [{
                    id: 'building',
                    source: 'sourceUrl',
                    'source-layer': 'building',
                    type: 'fill',
                    paint: {
                        'fill-color': 'red',
                    },
                }],
            },
            accessToken: 'pk.eyJ1IjoiZnRvcm9tYW5vZmYiLCJhIjoiY2xramhzM2xrMDVibjNpcGNvdGRlZWQ5YyJ9.NibhjJNVTxArsNSH4v_kIA',
        });
        source.whenReady
            .then(() => {
                assert.equal(source.url, '.');
                assert.equal(source.urls.length, 1);
                done();
            })
            .catch(done);
    });

    it('reads the background layer', (done) => {
        const source = new VectorTilesSource({
            url: 'fakeurl',
            style: {
                sources: { tilejson: {} },
                layers: [{ type: 'background' }],
            },
        });
        source.whenReady.then(() => {
            assert.ok(source.backgroundLayer);
            done();
        })
            .catch(done);
    });

    it('creates styles and assigns filters', (done) => {
        const source = new VectorTilesSource({
            url: 'fakeurl',
            style: {
                sources: { tilejson: {} },
                layers: [{
                    id: 'land',
                    type: 'fill',
                    paint: {
                        'fill-color': 'rgb(255, 0, 0)',
                    },
                    'source-layer': 'source_layer',
                }],
            },
        });
        source.whenReady.then(() => {
            assert.ok(source.styles.land);
            assert.equal(source.styles.land.fill.color, 'rgb(255,0,0)');
            done();
        })
            .catch(done);
    });

    it('loads the style from a file', function _it(done) {
        const source = new VectorTilesSource({
            style: 'https://test/data/vectortiles/style.json',
        });
        source.whenReady
            .then(() => {
                assert.equal(source.styles.land.fill.color, 'rgb(255,0,0)');
                assert.equal(source.styles.land.fill.opacity, 1);
                assert.equal(source.styles.land.zoom.min, 5);
                assert.equal(source.styles.land.zoom.max, 13);
                done();
            }).catch(done);
    });

    it('loads the style from a file with ref layer', function _it(done) {
        const source = new VectorTilesSource({
            url: 'fakeurl',
            style: {
                sources: { tilejson: {} },
                layers: [
                    {
                        id: 'land',
                        type: 'fill',
                        paint: {
                            'fill-color': 'rgb(255, 0, 0)',
                        },
                        'source-layer': 'source_layer',
                    },
                    {
                        id: 'land-secondary',
                        paint: {
                            'fill-color': 'rgb(0, 255, 0)',
                        },
                        ref: 'land',
                    },
                ],
            },
        });
        source.whenReady.then(() => {
            assert.ok(source.styles.land);
            assert.equal(source.styles.land.fill.color, 'rgb(255,0,0)');
            assert.ok(source.styles['land-secondary']);
            assert.equal(source.styles['land-secondary'].fill.color, 'rgb(0,255,0)');
            done();
        })
            .catch(done);
    });

    it('sets the correct Style#zoom.min', (done) => {
        const source = new VectorTilesSource({
            url: 'fakeurl',
            style: {
                sources: { tilejson: {} },
                layers: [{
                    // minzoom is 0 (default value)
                    id: 'first',
                    type: 'fill',
                    paint: {
                        'fill-color': 'rgb(255, 0, 0)',
                    },
                    'source-layer': 'source_layer',
                }, {
                    // minzoom is 5 (specified)
                    id: 'second',
                    type: 'fill',
                    paint: {
                        'fill-color': 'rgb(255, 0, 0)',
                    },
                    minzoom: 5,
                    'source-layer': 'source_layer',
                }, {
                    // minzoom is 4 (first stop)
                    // If a style have `stops` expression, should it be used to determine the min zoom?
                    id: 'third',
                    type: 'fill',
                    paint: {
                        'fill-color': 'rgb(255, 0, 0)',
                        'fill-opacity': { stops: [[4, 1], [7, 0.5]] },
                    },
                    'source-layer': 'source_layer',
                }, {
                    // minzoom is 1 (first stop and no specified minzoom)
                    id: 'fourth',
                    type: 'fill',
                    paint: {
                        'fill-color': 'rgb(255, 0, 0)',
                        'fill-opacity': { stops: [[1, 1], [7, 0.5]] },
                    },
                    'source-layer': 'source_layer',
                }, {
                    // minzoom is 4 (first stop is higher than specified)
                    id: 'fifth',
                    type: 'fill',
                    paint: {
                        'fill-color': 'rgb(255, 0, 0)',
                        'fill-opacity': { stops: [[4, 1], [7, 0.5]] },
                    },
                    minzoom: 3,
                    'source-layer': 'source_layer',
                }],
            },
        });

        source.whenReady.then(() => {
            assert.equal(source.styles.first.zoom.min, 0);
            assert.equal(source.styles.second.zoom.min, 5);
            assert.equal(source.styles.third.zoom.min, 0);
            assert.equal(source.styles.fourth.zoom.min, 0);
            assert.equal(source.styles.fifth.zoom.min, 3);
            done();
        })
            .catch(done);
    });

    it('Vector tile source mapbox url', () => {
        const accessToken = 'pk.xxxxx';
        const baseurl = 'mapbox://styles/mapbox/outdoors-v11';

        const styleUrl = urlParser.normalizeStyleURL(baseurl, accessToken);
        assert.ok(styleUrl.startsWith('https://api.mapbox.com'));
        assert.ok(styleUrl.endsWith(accessToken));

        const spriteUrl = urlParser.normalizeSpriteURL(baseurl, '', '.json', accessToken);
        assert.ok(spriteUrl.startsWith('https'));
        assert.ok(spriteUrl.endsWith(accessToken));
        assert.ok(spriteUrl.includes('sprite.json'));

        const imgUrl = urlParser.normalizeSpriteURL(baseurl, '', '.png', accessToken);
        assert.ok(imgUrl.includes('sprite.png'));

        const url = 'mapbox://mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2';
        const urlSource = urlParser.normalizeSourceURL(url, accessToken);
        assert.ok(urlSource.startsWith('https'));
        assert.ok(urlSource.endsWith(accessToken));
        assert.ok(urlSource.includes('.json'));
    });

    describe('multisource', function () {
        it('2 sources with different url tiles', (done) => {
            const source = new VectorTilesSource({
                style: {
                    sources: {
                        source1: {
                            type: 'vector',
                            tiles: ['http://server.geo/{z}/{x}/{y}.pbf'],
                        },
                        source2: {
                            type: 'vector',
                            tiles: ['http://server2.geo/{z}/{x}/{y}.pbf'],
                        },
                    },
                    layers: [],
                },
            });
            source.whenReady
                .then(() => {
                    assert.equal(source.urls.length, 2);
                    // eslint-disable-next-line no-template-curly-in-string
                    assert.ok(source.urls.includes('http://server.geo/${z}/${x}/${y}.pbf'));
                    // eslint-disable-next-line no-template-curly-in-string
                    assert.ok(source.urls.includes('http://server2.geo/${z}/${x}/${y}.pbf'));
                    done();
                })
                .catch(done);
        });
        it('2 sources with same url tiles', (done) => {
            const source = new VectorTilesSource({
                style: {
                    sources: {
                        source1: {
                            type: 'vector',
                            tiles: ['http://server.geo/{z}/{x}/{y}.pbf'],
                        },
                        source2: {
                            type: 'vector',
                            tiles: ['http://server.geo/{z}/{x}/{y}.pbf'],
                        },
                    },
                    layers: [],
                },
            });
            source.whenReady
                .then(() => {
                    assert.equal(source.urls.length, 1);
                    // eslint-disable-next-line no-template-curly-in-string
                    assert.ok(source.urls.includes('http://server.geo/${z}/${x}/${y}.pbf'));
                    done();
                })
                .catch(done);
        });
    });

    describe('loadData', function () {
        it('with multisource', (done) => {
            const source = new VectorTilesSource({
                style: {
                    sources: {
                        source1: {
                            type: 'vector',
                            tiles: ['http://server.geo/{z}/{x}/{y}.pbf'],
                        },
                        source2: {
                            type: 'vector',
                            tiles: ['http://server2.geo/{z}/{x}/{y}.pbf'],
                        },
                    },
                    layers: [{
                        id: 'geojson',
                        source: 'source1',
                        'source-layer': 'geojson',
                        type: 'fill',
                        paint: {
                            'fill-color': 'red',
                        },
                    }],
                },
            });

            source.whenReady
                .then(() => {
                    source.onLayerAdded({ out: { crs: 'EPSG:4326' } });
                    const tile = new Tile('TMS', 1, 1, 1);
                    source.loadData(tile, { crs: 'EPSG:4326' })
                        .then((featureCollection) => {
                            assert.equal(featureCollection.features[0].vertices.length, 20);
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        });
                })
                .catch(done);
        });
    });
});
