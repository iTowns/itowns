import * as THREE from 'three';
import GeoidGrid from 'Core/Geographic/GeoidGrid';
import Extent from 'Core/Geographic/Extent';
import { getHeaderAttribute } from 'Parser/GDFParser';
import { BYTES_PER_DOUBLE } from 'Parser/GTXParser';


/**
 * The `ISGParser` module provides a `[parse]{@link module:ISGParser.parse}` method. This method takes the content of a
 * ISG file in, and returns a `{@link GeoidGrid}`. the `{@link GeoidGrid}` contains all the necessary attributes and
 * methods to access the ISG data in iTowns.
 *
 * @module ISGParser
 */
export default {
    /**
     * Parses an ISG file content and returns a corresponding {@link GeoidGrid}.
     *
     * @param   {string}    isg                             The content of the ISG file to parse.
     * @param   {Object}    options                         An object gathering the optional parameters to pass to
                                                            * the parser.
     * @param   {Object}    [options.in={}]                 Information on the ISG data.
     * @param   {string}    [options.in.crs='EPSG:4326']    The Coordinates Reference System (CRS) of the ISG data.
                                                            * It must be a geographic CRS, and must be given as an EPSG
                                                            * code.
     *
     * @returns {Promise<GeoidGrid>}    A promise resolving with a {@link GeoidGrid}, which contains all the necessary
                                        * attributes and methods to access ISG file data.
     */
    parse(isg, options = { in: {} }) {
        const rows = isg.split('\n');
        const firstMeasureLine = rows.indexOf(rows.find(row => row.includes('end_of_head'))) + 1;
        const rawHeaderData = rows.slice(0, firstMeasureLine);

        // ---------- GET METADATA FROM THE FILE : ----------

        const metadata = {
            minX: getHeaderAttribute(rawHeaderData, 'lon min'),
            maxX: getHeaderAttribute(rawHeaderData, 'lon max'),
            minY: getHeaderAttribute(rawHeaderData, 'lat min'),
            maxY: getHeaderAttribute(rawHeaderData, 'lat max'),
            stepX: getHeaderAttribute(rawHeaderData, 'delta lon'),
            stepY: getHeaderAttribute(rawHeaderData, 'delta lat'),
            nRows: getHeaderAttribute(rawHeaderData, 'nrows'),
            nColumns: getHeaderAttribute(rawHeaderData, 'ncols'),
        };

        // ---------- BUILD A DATA VIEWER FROM THE TEXT DATA : ----------

        const data = new DataView(
            new ArrayBuffer(BYTES_PER_DOUBLE * metadata.nRows * metadata.nColumns),
        );

        let index = 0;
        for (let row of rows.slice(firstMeasureLine, rows.length)) {
            row = row.split(' ').filter(value => value !== '');

            if (!row.length) { continue; }

            for (const value of row) {
                data.setFloat64(index * BYTES_PER_DOUBLE, parseFloat(value));
                index++;
            }
        }

        // ---------- CREATE A GeoidGrid FOR THE GIVEN FILE DATA : ----------

        const dataExtent = new Extent(
            options.in.crs || 'EPSG:4326',
            metadata.minX + metadata.stepX / 2, metadata.maxX - metadata.stepX / 2,
            metadata.minY + metadata.stepY / 2, metadata.maxY - metadata.stepY / 2,
        );

        const dataStep = new THREE.Vector2(metadata.stepX, metadata.stepY);

        const getData = (verticalIndex, horizontalIndex) =>
            data.getFloat64((metadata.nColumns * verticalIndex + horizontalIndex) * BYTES_PER_DOUBLE);

        return Promise.resolve(new GeoidGrid(dataExtent, dataStep, getData));
    },
};
