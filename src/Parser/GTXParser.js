import * as THREE from 'three';
import GeoidGrid from 'Core/Geographic/GeoidGrid';
import Extent from 'Core/Geographic/Extent';


export const BYTES_PER_DOUBLE = 8;
export const BYTES_PER_FLOAT = 4;


/**
 * The `GTXParser` module provides a `[parse]{@link module:GTXParser.parse}` method. This method takes the content of a
 * GTX file in, and returns a {@link GeoidGrid}. The {@link GeoidGrid} contains all the necessary attributes and
 * methods to access the GTX data in iTowns.
 *
 * @module GTXParser
 */
export default {
    /**
     * Parses a GTX file content and returns a corresponding {@link GeoidGrid}.
     *
     * @param   {ArrayBuffer}   gtx                             The content of the GTX file to parse.
     * @param   {Object}        options                         An object gathering the optional parameters to pass to
                                                                * the parser.
     * @param   {Object}        [options.in={}]                 Information on the GTX data.
     * @param   {string}        [options.in.crs='EPSG:4326']    The Coordinates Reference System (CRS) of the GTX data.
                                                                * It must be a geographic CRS, and must be given as an
                                                                * EPSG code.
     * @param   {string}        [options.in.dataType='float']   The encoding of geoid height data within the GTX file.
                                                                * Must be `'float'` or `'double'`.
     *
     * @returns {Promise<GeoidGrid>}    A promise resolving with a {@link GeoidGrid}, which contains all the necessary
                                        * attributes and methods to access GTX file data.
     */
    parse(gtx, options = { in: {} }) {
        const dataType = options.in.dataType || 'float';
        if (!['float', 'double'].includes(dataType)) {
            throw new Error(
                '`dataType` parameter is incorrect for GTXParser.parse method. ' +
                'This parameter must be either `double` or `float`.',
            );
        }

        // ---------- GET METADATA FROM THE FILE : ----------

        const headerView = new DataView(gtx, 0, 40);
        const metadata = {
            minX: headerView.getFloat64(8),
            minY: headerView.getFloat64(0),
            stepX: headerView.getFloat64(24),
            stepY: headerView.getFloat64(16),
            nColumns: headerView.getInt32(36),
            nRows: headerView.getInt32(32),
        };

        // ---------- BUILD A DATA VIEWER : ----------

        const dataView = new DataView(gtx, 40);

        // ---------- CREATE A GeoidGrid FOR THE GIVEN FILE DATA : ----------

        // formula for the max longitude : maxLongitude = minLongitude + deltaLongitude * (nColumns - 1)
        const maxX = metadata.minX + metadata.stepX * (metadata.nColumns - 1);
        // formula for the max latitude : maxLatitude = minLatitude + deltaLatitude * (nRows - 1)
        const maxY = metadata.minY + metadata.stepY * (metadata.nRows - 1);

        const dataExtent = new Extent(
            options.in.crs || 'EPSG:4326',
            metadata.minX, maxX, metadata.minY, maxY,
        );

        const dataStep = new THREE.Vector2(metadata.stepX, metadata.stepY);

        const getData = (verticalIndex, horizontalIndex) => {
            // formula to get the index of a geoid height from a latitude and longitude indexes is :
            // ``(nColumns * latIndex + lonIndex) * nBytes``, where nBytes stands for the number of bytes geoid
            // height data are encoded on.
            if (dataType === 'float') {
                return dataView.getFloat32(
                    (metadata.nColumns * verticalIndex + horizontalIndex) * BYTES_PER_FLOAT,
                );
            } else if (dataType === 'double') {
                return dataView.getFloat64(
                    (metadata.nColumns * verticalIndex + horizontalIndex) * BYTES_PER_DOUBLE,
                );
            }
        };

        return Promise.resolve(new GeoidGrid(dataExtent, dataStep, getData));
    },
};
