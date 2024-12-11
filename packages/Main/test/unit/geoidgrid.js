import assert from 'assert';
import { Coordinates, Extent } from '@itowns/geographic';
import GeoidGrid from 'Core/Geographic/GeoidGrid';

describe('GeoidGrid', function () {
    let geoidGrid;
    const data = [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
        [3, 4, 5, 6, 7],
        [4, 5, 6, 7, 8],
        [5, 6, 7, 8, 9],
    ];

    before(function () {
        geoidGrid = new GeoidGrid(
            new Extent('EPSG:4326', 1, 5, 1, 5),
            { x: 1 },
            (verticalIndex, horizontalIndex) => data[verticalIndex][horizontalIndex],
        );
    });

    it('should return the correct geoid height from coordinates', function () {
        assert.strictEqual(geoidGrid.getHeightAtCoordinates(new Coordinates('EPSG:4326', 1.5, 1.5)), 2);
    });

    it('should return a null geoid height for coordinates outside of data extent', function () {
        assert.strictEqual(geoidGrid.getHeightAtCoordinates(new Coordinates('EPSG:4326', 6, 6)), 0);
    });
});
