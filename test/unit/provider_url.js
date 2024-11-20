/* eslint-disable no-template-curly-in-string */
import assert from 'assert';
import URLBuilder from 'Provider/URLBuilder';
import Extent from 'Core/Geographic/Extent';
import Tile from 'Core/Tile/Tile';

describe('URL creations', function () {
    const layer = { tileMatrixCallback: (zoomLevel => zoomLevel) };

    it('should correctly replace ${x}, ${y} and ${z} by 359, 512 and 10', function () {
        const coords = new Tile('EPSG:4857', 10, 512, 359);
        layer.url = 'http://server.geo/tms/${z}/${y}/${x}.jpg';
        const result = URLBuilder.xyz(coords, layer);
        assert.equal(result, 'http://server.geo/tms/10/512/359.jpg');
    });

    it('should correctly replace %COL, %ROW, %TILEMATRIX by 2072, 1410 and 12', function () {
        const coords = new Tile('EPSG:4326', 12, 1410, 2072);
        layer.url = 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=%TILEMATRIX&TILEROW=%ROW&TILECOL=%COL';
        const result = URLBuilder.xyz(coords, layer);
        assert.equal(result, 'http://server.geo/wmts/SERVICE=WMTS&TILEMATRIX=12&TILEROW=1410&TILECOL=2072');
    });

    it('should correctly replace %bbox by 12,14,35,46', function () {
        const extent = new Extent('EPSG:4326', 12, 14, 35, 46);
        layer.crs = 'EPSG:4326';
        layer.axisOrder = 'wesn';
        layer.url = 'http://server.geo/wms/BBOX=%bbox&FORMAT=jpg&SERVICE=WMS';
        const result = URLBuilder.bbox(extent, layer);
        assert.equal(result, 'http://server.geo/wms/BBOX=12.000000000,14.000000000,35.000000000,46.000000000&FORMAT=jpg&SERVICE=WMS');
    });

    it('should correctly replace %bbox by 12.1235,14.9876,35.4589,46.9877', function () {
        const extent = new Extent('EPSG:4326', 12.123466, 14.98764, 35.45898, 46.987674);
        layer.crs = 'EPSG:4326';
        layer.axisOrder = 'wesn';
        layer.url = 'http://server.geo/wms/BBOX=%bbox&FORMAT=jpg&SERVICE=WMS';
        layer.bboxDigits = 4;
        const result = URLBuilder.bbox(extent, layer);
        assert.equal(result, 'http://server.geo/wms/BBOX=12.1235,14.9876,35.4590,46.9877&FORMAT=jpg&SERVICE=WMS');
    });

    it('shouldn\'t use the scientific notation', function () {
        const extent = new Extent('EPSG:4326', 1 / 9999999999, 14, 35, 46);
        layer.crs = 'EPSG:4326';
        layer.axisOrder = 'wesn';
        layer.url = 'http://bla/wms/BBOX=%bbox&FORMAT=jpg&SERVICE=WMS';
        const result = URLBuilder.bbox(extent, layer);
        assert.ok(result.indexOf('1e'), -1);
    });

    it('should correctly replace sub-domains pattern', function () {
        layer.url = 'https://${u:xyz.org|yzx.org|zxy.org}/img.png';
        assert.equal(URLBuilder.subDomains(layer.url), 'https://xyz.org/img.png');
        assert.equal(URLBuilder.subDomains(layer.url), 'https://yzx.org/img.png');
        assert.equal(URLBuilder.subDomains(layer.url), 'https://zxy.org/img.png');

        layer.url = 'https://${u:a|b|c}.tile.openstreetmap.org/img.png';
        assert.equal(URLBuilder.subDomains(layer.url), 'https://a.tile.openstreetmap.org/img.png');
        assert.equal(URLBuilder.subDomains(layer.url), 'https://b.tile.openstreetmap.org/img.png');
        assert.equal(URLBuilder.subDomains(layer.url), 'https://c.tile.openstreetmap.org/img.png');
    });
});
