/* global describe, it */
import assert from 'assert';
import Coordinates from '../src/Core/Geographic/Coordinates';
import Extent from '../src/Core/Geographic/Extent';

describe('Extent constructors', function () {
    const minX = 0;
    const maxX = 10;
    const minY = -1;
    const maxY = 3;

    it('should build the expected extent using Coordinates', function () {
        const withCoords = new Extent('EPSG:4326',
            new Coordinates('EPSG:4326', minX, minY),
            new Coordinates('EPSG:4326', maxX, maxY));
        assert.equal(minX, withCoords.west());
        assert.equal(maxX, withCoords.east());
        assert.equal(minY, withCoords.south());
        assert.equal(maxY, withCoords.north());
    });

    it('should build the expected extent using keywords', function () {
        const withKeywords = new Extent('EPSG:4326', {
            south: minY,
            east: maxX,
            north: maxY,
            west: minX,
        });
        assert.equal(minX, withKeywords.west());
        assert.equal(maxX, withKeywords.east());
        assert.equal(minY, withKeywords.south());
        assert.equal(maxY, withKeywords.north());
    });

    it('should build the expected extent using values', function () {
        const withValues = new Extent('EPSG:4326',
            minX,
            maxX,
            minY,
            maxY);
        assert.equal(minX, withValues.west());
        assert.equal(maxX, withValues.east());
        assert.equal(minY, withValues.south());
        assert.equal(maxY, withValues.north());
    });
});
