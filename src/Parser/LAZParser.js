import * as THREE from 'three';
import LAZLoader from 'Parser/LAZLoader';

/** @type {LazLoader?} */
let loader = null;

async function parseChunk(pointData, options) {
    const lazLoader = loader ?? (loader = new LAZLoader());
    return lazLoader.parseChunk(pointData, options.in);
}

/** The LAZParser module provides a [parseChunk]{@link
 * module:LASParser.parseChunk} method that takes a LAZ (LASZip) chunk in, and
 * gives a `THREE.BufferGeometry` containing all the necessary attributes to be
 * displayed in iTowns. It uses the
 * [copc.js](https://github.com/connormanning/copc.js/) library.
 *
 * @module LAZParser
 */
export default {
    /**
     * @typedef {Object} Header - Partial LAS header.
     * @property {number} header.pointDataRecordFormat - Type of point data
     * records contained by the buffer.
     * @property {number} header.pointDataRecordLength - Size (in bytes) of the
     * point data records. If the specified size is larger than implied by the
     * point data record format (see above) the remaining bytes are user-specfic
     * "extra bytes". Those are described by an Extra Bytes VLR.
     * @property {number[]} header.scale - Scale factors (an array `[xScale,
     * yScale, zScale]`) multiplied to the X, Y, Z point record values.
     * @property {number[]} header.offset - Offsets (an array `[xOffset,
     * xOffset, zOffset]`) added to the scaled X, Y, Z point record values.
     */

    /**
     * @typedef {Object} ParsingOptions - Options of the parser.
     * @property {Object} in - Options from the source input.
     * @property {number} in.pointCount - Number of points in this data
     * chunk.
     * @property {8 | 16} [in.colorDepth=16] - Color depth (in bits). Either 8
     * or 16 bits.
     * @property {Header} in.header - Partial LAS header.
     * @property {copc.Las.ExtraBytes[]} [in.eb] - Extra bytes LAS VLRs headers.
     */

    /*
     * Set then laz-perf decoder path.
     * @param {string} path - path to `laz-perf.wasm` folder.
     */
    setLazPerf(path) {
        const lazLoader = loader ?? (loader = new LAZLoader());
        lazLoader.lazPerf = path;
    },

    /**
     * Parse a LAZ chunk.
     * @param {Uint8Array} data - Chunk data.
     * @param {ParsingOptions} options - Parsing options.
     * @returns {BufferGeometry} - The corresponding geometry.
     */
    async parseChunk(data, options) {
        const attrs = await parseChunk(data, options);

        const geometry = new THREE.BufferGeometry();
        geometry.userData = options.in.header;
        geometry.userData.vertexCount = options.in.pointCount;

        const positionBuffer = new THREE.BufferAttribute(attrs.position, 3);
        geometry.setAttribute('position', positionBuffer);

        const intensityBuffer = new THREE.BufferAttribute(attrs.intensity, 1, true);
        geometry.setAttribute('intensity', intensityBuffer);

        const returnNumber = new THREE.BufferAttribute(attrs.returnNumber, 1);
        geometry.setAttribute('returnNumber', returnNumber);

        const numberOfReturns = new THREE.BufferAttribute(attrs.numberOfReturns, 1);
        geometry.setAttribute('numberOfReturns', numberOfReturns);

        const classBuffer = new THREE.BufferAttribute(attrs.classification, 1, true);
        geometry.setAttribute('classification', classBuffer);

        const pointSourceID = new THREE.BufferAttribute(attrs.pointSourceID, 1);
        geometry.setAttribute('pointSourceID', pointSourceID);

        if (attrs.color) {
            const colorBuffer = new THREE.BufferAttribute(attrs.color, 4, true);
            geometry.setAttribute('color', colorBuffer);
        }

        geometry.computeBoundingBox();
        return geometry;
    },
};
