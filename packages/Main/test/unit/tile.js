import assert from 'assert';
import Tile from 'Core/Tile/Tile';
import proj4 from 'proj4';

proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

describe('Tile', function () {
    const zoom = 5;
    const row = 22;
    const col = 10;

    it('should convert tile EPSG:4326 like expected', function () {
        const withValues = new Tile('EPSG:4326', 0, 0, 0).toExtent('EPSG:4326');
        assert.equal(-180, withValues.west);
        assert.equal(0, withValues.east);
        assert.equal(-90, withValues.south);
        assert.equal(90, withValues.north);
    });

    it('should convert EPSG:3857 tile to EPSG:3857 extent like expected', function () {
        const withValues = new Tile('EPSG:3857', 0, 0, 0).toExtent('EPSG:3857');
        assert.equal(-20037508.342789244, withValues.west);
        assert.equal(20037508.342789244, withValues.east);
        assert.equal(-20037508.342789244, withValues.south);
        assert.equal(20037508.342789244, withValues.north);
    });

    it('should convert EPSG:3857 tile to EPSG:4326 extent like expected', function () {
        const withValues = new Tile('EPSG:3857', 0, 0, 0);
        const result = withValues.toExtent('EPSG:4326');
        assert.equal(-180.00000000000003, result.west);
        assert.equal(180.00000000000003, result.east);
        assert.equal(-85.0511287798066, result.south);
        assert.equal(85.0511287798066, result.north);
    });

    it('should return expected offset using tiled extent', function () {
        const withValues = new Tile('EPSG:4326', zoom, row, col);
        const parent = new Tile('EPSG:4326', zoom - 2, row, col);
        const offset = withValues.offsetToParent(parent);
        assert.equal(offset.x, 0.5);
        assert.equal(offset.y, 0.5);
        assert.equal(offset.z, 0.25);
        assert.equal(offset.w, 0.25);
    });

    it('should return expected tiled extent parent', function () {
        const withValues = new Tile('EPSG:4326', zoom, row, col);
        const parent = withValues.tiledExtentParent(zoom - 2);
        assert.equal(parent.zoom, 3);
        assert.equal(parent.row, 5);
        assert.equal(parent.col, 2);
    });

    it('should convert TMS extent values to string', function () {
        const withValues = new Tile('EPSG:4326', 0, 1, 2);
        const tostring = withValues.toString(',');
        const toValues = tostring.split(',').map(s => Number(s));
        assert.equal(toValues[0], withValues.zoom);
        assert.equal(toValues[1], withValues.row);
        assert.equal(toValues[2], withValues.col);
    });
});
