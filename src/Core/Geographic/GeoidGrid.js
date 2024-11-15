import * as THREE from 'three';
import * as CRS from 'Core/Geographic/Crs';
import Coordinates from 'Core/Geographic/Coordinates';


const coord = new Coordinates('EPSG:4326');
const indexes = new THREE.Vector2();


function biLinearInterpolation(indexes, getData) {
    const j = Math.floor(indexes.x);
    const i = Math.floor(indexes.y);

    const u = indexes.x - j;
    const v = indexes.y - i;

    return (1 - u) * (
        (1 - v) * getData(i, j) + v * getData(i + 1, j)
    ) + u * (
        (1 - v) * getData(i, j + 1) + v * (getData(i + 1, j + 1))
    );
}


/**
 * An instance of `GeoidGrid` allows accessing some geoid height grid data from geographic instances (like some
 * {@link Coordinates}). The geoid height grid data must contain geoid height values for a set of geographic points
 * regularly dispatched on a planar surface.
 *
 * @property    {Extent}        extent      The geographic extent of the geoid height grid data.
 * @property    {THREE.Vector2} step        The distance between two consecutive points of the geoid height grid. The
 * `x` value stands for the distance along the West-East direction, and the
 * `y` value stands for the distance along the South-North direction.
 * @property    {THREE.Vector2} dimensions  The planar dimensions of the geoid height grid data extent.
 * @property    {THREE.Vector2} dataSize    The number of values in the gridded data along the West-East direction (`x`
                                            * axis) and the South-North direction (`y` axis).
 *
 * @example
 * // Create a set of gridded data.
 * const data = [
 *     [1, 2, 3],
 *     [2, 3, 4],
 *     [3, 4, 5],
 * ];
 * // This set of data presents the following spatial distribution of geoid heights values :
 * //
 * //    Latitudes  ^
 * //               |
 * //         41.0  |   3  4  5
 * //         40.5  |   2  3  4
 * //         40.0  |   1  2  3
 * //               |------------->
 * //                   1  2  3     Longitudes
 *
 * // Create a GeoidGrid allowing to access the gridded data.
 * const geoidGrid = new GeoidGrid(
 *     new Extent('EPSG:4326', 1, 3, 40, 41),
 *     new THREE.Vector2(1, 0.5),
 *     (verticalIndex, horizontalIndex) => data[verticalIndex][horizontalIndex],
 * );
 *
 * // Access a value of geoid height at some geographic coordinates.
 * // The value is interpolated from the gridded data.
 * const value = geoidGrid.getHeightAtCoordinates(
 *     new Coordinates('EPSG:4326', 1.5, 40.25)
 * );
 * // This should return 2.0, which is the result from the bi-linear
 * // interpolation at the center of the `[[1, 2], [2, 3]]` subsection
 * // of the grid data.
 */
class GeoidGrid {
    /**
     * @param   {Extent}        extent      The geographic extent of the geoid height grid data.
     * @param   {THREE.Vector2} step        The distance between two consecutive points of the geoid height grid. The
     * `x` value stands for the distance along the West-East direction, and the
     * `y` value stands for the distance along the South-North direction.
     * @param   {function}      getData     A method that allows reading a value in the geoid height grid from its
     * vertical and horizontal indexes. The lower an index, the lower the
     * coordinate on the corresponding axis - 0 being the index of the minimal
     * coordinate of the gridded data on a given axis. In other words :
     * - `getData(0, 0)` must return the geoid height value at the SOUTH-WEST
     *   corner of your data extent.
     * - `getData(0, j)` must return a geoid height on the southern limit of your
     *   data extent.
     * - `getData(i, 0)` must return a geoid height on the western limit of your
     *   data extent.
     * - if your gridded data has dimensions (rowNumber, colNumber),
     *   `getData(rowNumber - 1, colNumber - 1)` must return the geoid height at
     *   the NORTH-EAST corner of your data extent.
     */
    constructor(
        extent,
        step,
        getData,
    ) {
        CRS.isGeographic(extent.crs);

        this.extent = extent;
        this.step = new THREE.Vector2(step.x, step.y || step.x);

        this.dimensions = this.extent.planarDimensions();
        this.dataSize = new THREE.Vector2().addVectors(this.step, this.dimensions).divide(this.step).round();

        this.getData = getData;
    }

    /**
     * Get the value of the geoid height at given geographic {@link Coordinates}. The geoid height value is
     * bi-linearly interpolated from the gridded data accessed by the `GeoidGrid` instance.
     *
     * @param   {Coordinates}   coordinates     Geographic coordinates to get the geoid height value at.
     *
     * @returns {number}    The geoid height value at the given {@link Coordinates}, bi-interpolated from the gridded
                            * data accessed by the `GeoidGrid` instance.
     */
    getHeightAtCoordinates(coordinates) {
        coordinates.as(this.extent.crs, coord);

        indexes.set(
            (this.dataSize.x - 1) * (coord.x - this.extent.west) / (this.dimensions.x),
            (this.dataSize.y - 1) * (coord.y - this.extent.south) / (this.dimensions.y),
        );

        // TODO : add management for global GeoidGrid.
        if (
            indexes.x < 0 || indexes.x >= this.dataSize.x - 1
            || indexes.y < 0 || indexes.y >= this.dataSize.y - 1
        ) { return 0; }

        return biLinearInterpolation(indexes, this.getData);
    }
}


export default GeoidGrid;
