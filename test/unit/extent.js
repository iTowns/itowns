import assert from 'assert';
import { Box3, Vector3 } from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import CRS from 'Core/Geographic/Crs';

describe('Extent', function () {
    const minX = 0;
    const maxX = 10;
    const minY = -1;
    const maxY = 3;
    const zoom = 5;
    const row = 22;
    const col = 10;

    it('should build the expected extent using Coordinates', function () {
        const withCoords = new Extent('EPSG:4326',
            new Coordinates('EPSG:4326', minX, minY),
            new Coordinates('EPSG:4326', maxX, maxY));
        assert.equal(minX, withCoords.west);
        assert.equal(maxX, withCoords.east);
        assert.equal(minY, withCoords.south);
        assert.equal(maxY, withCoords.north);
    });

    it('should build the expected extent using keywords', function () {
        const withKeywords = new Extent('EPSG:4326', {
            south: minY,
            east: maxX,
            north: maxY,
            west: minX,
        });
        assert.equal(minX, withKeywords.west);
        assert.equal(maxX, withKeywords.east);
        assert.equal(minY, withKeywords.south);
        assert.equal(maxY, withKeywords.north);
    });

    it('should build the expected extent using values', function () {
        const withValues = new Extent('EPSG:4326',
            minX,
            maxX,
            minY,
            maxY);
        assert.equal(minX, withValues.west);
        assert.equal(maxX, withValues.east);
        assert.equal(minY, withValues.south);
        assert.equal(maxY, withValues.north);
    });

    it('should build the expected extent using Array', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        assert.equal(minX, withValues.west);
        assert.equal(maxX, withValues.east);
        assert.equal(minY, withValues.south);
        assert.equal(maxY, withValues.north);
    });

    it('should build the expected extent from box3', function () {
        const box = new Box3(
            new Vector3(Math.random(), Math.random()),
            new Vector3(Math.random(), Math.random()));
        const fromBox = Extent.fromBox3('EPSG:4978', box);

        assert.equal(fromBox.west, box.min.x);
        assert.equal(fromBox.east, box.max.x);
        assert.equal(fromBox.north, box.max.y);
        assert.equal(fromBox.south, box.min.y);
    });

    it('should subdivide the extent in four piece', function () {
        const toSubdivide = new Extent('EPSG:4326', -10, 10, -10, 10);
        const subdivided = toSubdivide.subdivision();

        assert.equal(subdivided.length, 4);
        // NE
        assert.strictEqual(subdivided[0].west, 0);
        assert.strictEqual(subdivided[0].east, 10);
        assert.strictEqual(subdivided[0].south, 0);
        assert.strictEqual(subdivided[0].north, 10);
        // SE
        assert.strictEqual(subdivided[1].west, 0);
        assert.strictEqual(subdivided[1].east, 10);
        assert.strictEqual(subdivided[1].south, -10);
        assert.strictEqual(subdivided[1].north, 0);
        // NW
        assert.strictEqual(subdivided[2].west, -10);
        assert.strictEqual(subdivided[2].east, 0);
        assert.strictEqual(subdivided[2].south, 0);
        assert.strictEqual(subdivided[2].north, 10);
        // SW
        assert.strictEqual(subdivided[3].west, -10);
        assert.strictEqual(subdivided[3].east, 0);
        assert.strictEqual(subdivided[3].south, -10);
        assert.strictEqual(subdivided[3].north, 0);
    });

    it('should return the correct dimension of the extent', function () {
        const extent = new Extent('EPSG:4326', -15, 10, -10, 10);
        const dimensions = extent.dimensions();

        // Width
        assert.equal(dimensions.x, 25);
        // Height
        assert.equal(dimensions.y, 20);
    });

    it('should clone extent like expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const clonedExtent = withValues.clone();
        assert.equal(clonedExtent.west, withValues.west);
        assert.equal(clonedExtent.east, withValues.east);
        assert.equal(clonedExtent.south, withValues.south);
        assert.equal(clonedExtent.north, withValues.north);
    });

    it('should clone tiled extent like expected', function () {
        const withValues = new Extent('TMS:4326', zoom, row, col);
        const clonedExtent = withValues.clone();
        assert.equal(clonedExtent.zoom, withValues.zoom);
        assert.equal(clonedExtent.row, withValues.row);
        assert.equal(clonedExtent.col, withValues.col);
    });

    it('should isTms return true if extent is tiled extent', function () {
        const withValues = new Extent('TMS:4326', zoom, row, col);
        assert.ok(CRS.isTms(withValues.crs));
    });

    it('should convert extent TMS:4326 like expected', function () {
        const withValues = new Extent('TMS:4326', 0, 0, 0).as('EPSG:4326');
        assert.equal(-180, withValues.west);
        assert.equal(0, withValues.east);
        assert.equal(-90, withValues.south);
        assert.equal(90, withValues.north);
    });

    it('should convert extent TMS:3857 to EPSG:3857 like expected', function () {
        const withValues = new Extent('TMS:3857', 0, 0, 0).as('EPSG:3857');
        assert.equal(-20037508.342789244, withValues.west);
        assert.equal(20037508.342789244, withValues.east);
        assert.equal(-20037508.342789244, withValues.south);
        assert.equal(20037508.342789244, withValues.north);
    });

    it('should convert extent TMS:3857 to EPSG:4326 like expected', function () {
        const withValues = new Extent('TMS:3857', 0, 0, 0);
        const result = withValues.as('EPSG:4326');
        assert.equal(-180.00000000000003, result.west);
        assert.equal(180.00000000000003, result.east);
        assert.equal(-85.0511287798066, result.south);
        assert.equal(85.0511287798066, result.north);
    });

    it('should convert extent EPSG:4326 like expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]).as('EPSG:3857');
        assert.equal(0, withValues.west);
        assert.equal(1113194.9079327357, withValues.east);
        assert.equal(-111325.14286638597, withValues.south);
        assert.equal(334111.1714019597, withValues.north);
    });

    it('should return center of extent expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const center = withValues.center();
        assert.equal(5, center.longitude);
        assert.equal(1, center.latitude);
    });
    it('should return dimensions of extent expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const dimensions = withValues.dimensions();
        assert.equal(10, dimensions.x);
        assert.equal(4, dimensions.y);
    });

    it('should return true is point is inside extent expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const coord = new Coordinates('EPSG:4326', minX + 1, minY + 2);
        assert.ok(withValues.isPointInside(coord));
    });

    it('should return true is extent is inside extent expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const inside = new Extent('EPSG:4326', [minX + 1, maxX - 1, minY + 1, maxY - 1]);
        assert.ok(withValues.isInside(inside, 1));
    });

    it('should return expected offset', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const inside = new Extent('EPSG:4326', [minX + 1, maxX - 1, minY + 1, maxY - 1]);
        const offset = withValues.offsetToParent(inside);
        assert.equal(offset.x, -0.125);
        assert.equal(offset.y, -0.5);
        assert.equal(offset.z, 1.25);
        assert.equal(offset.w, 2);
    });

    it('should return expected offset using tiled extent', function () {
        const withValues = new Extent('TMS:4326', zoom, row, col);
        const parent = new Extent('TMS:4326', zoom - 2, row, col);
        const offset = withValues.offsetToParent(parent);
        assert.equal(offset.x, 0.5);
        assert.equal(offset.y, 0.5);
        assert.equal(offset.z, 0.25);
        assert.equal(offset.w, 0.25);
    });

    it('should return expected tiled extent parent', function () {
        const withValues = new Extent('TMS:4326', zoom, row, col);
        const parent = withValues.tiledExtentParent(zoom - 2);
        assert.equal(parent.zoom, 3);
        assert.equal(parent.row, 5);
        assert.equal(parent.col, 2);
    });

    it('should return true if intersect other extent', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const inter = new Extent('EPSG:4326', [minX + 1, maxX - 1, maxY - 1, maxY + 2]);
        assert.ok(withValues.intersectsExtent(inter));
    });

    it('should intersect like expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const extent = new Extent('EPSG:4326', [minX + 1, maxX - 1, maxY - 1, maxY + 2]);
        const inter = withValues.intersect(extent);
        assert.equal(1, inter.west);
        assert.equal(9, inter.east);
        assert.equal(2, inter.south);
        assert.equal(3, inter.north);
    });

    it('should set values', function () {
        const withValues = new Extent('EPSG:4326', [0, 0, 0, 0]);
        withValues.set(minX, maxX, minY, maxY);
        assert.equal(minX, withValues.west);
        assert.equal(maxX, withValues.east);
        assert.equal(minY, withValues.south);
        assert.equal(maxY, withValues.north);
    });

    it('should copy extent', function () {
        const toCopy = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const withValues = new Extent('EPSG:4326', [0, 0, 0, 0]);
        withValues.copy(toCopy);
        assert.equal(minX, withValues.west);
        assert.equal(maxX, withValues.east);
        assert.equal(minY, withValues.south);
        assert.equal(maxY, withValues.north);
    });

    it('should union like expected', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const extent = new Extent('EPSG:4326', [minX + 1, maxX - 1, maxY - 1, maxY + 2]);
        withValues.union(extent);
        assert.equal(0, withValues.west);
        assert.equal(10, withValues.east);
        assert.equal(-1, withValues.south);
        assert.equal(5, withValues.north);
    });

    it('should expand by point', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const coord = new Coordinates('EPSG:4326', maxX + 1, maxY + 2);
        withValues.expandByCoordinates(coord);
        assert.equal(0, withValues.west);
        assert.equal(11, withValues.east);
        assert.equal(-1, withValues.south);
        assert.equal(5, withValues.north);
    });

    it('should convert EPSG extent values to string', function () {
        const withValues = new Extent('EPSG:4326', [minX, maxX, minY, maxY]);
        const tostring = withValues.toString(',');
        const toValues = tostring.split(',').map(s => Number(s));
        assert.equal(toValues[0], withValues.east);
        assert.equal(toValues[1], withValues.north);
        assert.equal(toValues[2], withValues.west);
        assert.equal(toValues[3], withValues.south);
    });

    it('should convert TMS extent values to string', function () {
        const withValues = new Extent('TMS:4326', 0, 1, 2);
        const tostring = withValues.toString(',');
        const toValues = tostring.split(',').map(s => Number(s));
        assert.equal(toValues[0], withValues.zoom);
        assert.equal(toValues[1], withValues.row);
        assert.equal(toValues[2], withValues.col);
    });

    it('should copy and transform extent', function () {
        const withValues = new Extent('EPSG:4326', [0, 0, 0, 0]);
        const extent = new Extent('EPSG:4326', [minX + 1, maxX - 1, maxY - 1, maxY + 2]);
        withValues.transformedCopy({ x: 1, y: 2 }, { x: 2, y: -2 }, extent);
        assert.equal(4, withValues.west);
        assert.equal(20, withValues.east);
        assert.equal(-14, withValues.south);
        assert.equal(-8, withValues.north);
    });

    it('should get the right center for extrem cases', function () {
        const extent = new Extent('EPSG:4326', 160, 200, -10, 10);
        let center = extent.center();
        assert.equal(180, center.x);
        assert.equal(0, center.y);
        assert.equal(0, center.z);

        extent.set(-10, 10, 80, 100);
        center = extent.center();
        assert.equal(0, center.x);
        assert.equal(90, center.y);
        assert.equal(0, center.z);
    });
});
