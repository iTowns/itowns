import * as THREE from 'three';
import GeoidGrid from 'Core/Geographic/GeoidGrid';
import Extent from 'Core/Geographic/Extent';
import { BYTES_PER_DOUBLE } from 'Parser/GTXParser';


export function getHeaderAttribute(header, attributeName) {
    const attributeRow = header[header.indexOf(header.find(element => element.includes(attributeName)))].split(' ')
        .filter(value => value !== '');
    return parseFloat(attributeRow[attributeRow.length - 1]);
}


/**
 * The `GDFParser` module provides a `[parse]{@link module:GDFParser.parse}` method. This method takes the content of a
 * GDF file in, and returns a `{@link GeoidGrid}`. the `{@link GeoidGrid}` contains all the necessary attributes and
 * methods to access the GDF data in iTowns.
 *
 * @module GDFParser
 */
export default {
    /**
     * Parses a GDF file content and returns a corresponding {@link GeoidGrid}.
     *
     * @param   {string}    gdf                             The content of the GDF file to parse.
     * @param   {Object}    options                         An object gathering the optional parameters to pass to
                                                            * the parser.
     * @param   {Object}    [options.in={}]                 Information on the GDF data.
     * @param   {string}    [options.in.crs='EPSG:4326']    The Coordinates Reference System (CRS) of the GDF data.
                                                            * It must be a geographic CRS, and must be given as an EPSG
                                                            * code.
     *
     * @returns {Promise<GeoidGrid>}    A promise resolving with a {@link GeoidGrid}, which contains all the necessary
                                        * attributes and methods to access GDF file data.
     */
    parse(gdf, options = { in: {} }) {
        const rows = gdf.split('\n');
        const firstMeasureLine = rows.indexOf(rows.find(row => row.includes('end_of_head'))) + 1;
        const rawHeaderData = rows.slice(0, firstMeasureLine);

        // ---------- GET METADATA FROM THE FILE : ----------

        const metadata = {
            minX: getHeaderAttribute(rawHeaderData, 'longlimit_west'),
            maxX: getHeaderAttribute(rawHeaderData, 'longlimit_east'),
            minY: getHeaderAttribute(rawHeaderData, 'latlimit_south'),
            maxY: getHeaderAttribute(rawHeaderData, 'latlimit_north'),
            stepX: getHeaderAttribute(rawHeaderData, 'gridstep'),
            stepY: getHeaderAttribute(rawHeaderData, 'gridstep'),
            nRows: getHeaderAttribute(rawHeaderData, 'latitude_parallels'),
            nColumns: getHeaderAttribute(rawHeaderData, 'longitude_parallels'),
        };

        // ---------- BUILD A DATA VIEWER FROM THE TEXT DATA : ----------

        const data = new DataView(
            new ArrayBuffer(BYTES_PER_DOUBLE * metadata.nRows * metadata.nColumns),
        );

        let index = 0;
        for (let row of rows.slice(firstMeasureLine, rows.length)) {
            row = row.split(' ').filter(value => value !== '');

            if (!row.length) { continue; }

            data.setFloat64(index * BYTES_PER_DOUBLE, parseFloat(row[2]));
            index++;
        }

        // ---------- CREATE A GeoidGrid FOR THE GIVEN FILE DATA : ----------

        const dataExtent = new Extent(
            options.in.crs || 'EPSG:4326',
            metadata.minX, metadata.maxX, metadata.minY, metadata.maxY,
        );

        const dataStep = new THREE.Vector2(metadata.stepX, metadata.stepY);

        const getData = (verticalIndex, horizontalIndex) =>
            data.getFloat64((
                metadata.nColumns * (metadata.nRows - verticalIndex - 1) + horizontalIndex
            ) * BYTES_PER_DOUBLE);

        return Promise.resolve(new GeoidGrid(dataExtent, dataStep, getData));
    },
};
