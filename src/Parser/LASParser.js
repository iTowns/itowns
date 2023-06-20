import * as THREE from 'three';
import LASLoader from 'Parser/LASLoader';

const lasLoader = new LASLoader();

/** The LASParser module provides a [parse]{@link
 * module:LASParser.parse} method that takes a LAS or LAZ (LASZip) file in, and
 * gives a `THREE.BufferGeometry` containing all the necessary attributes to be
 * displayed in iTowns. It uses the
 * [copc.js](https://github.com/connormanning/copc.js/) library.
 *
 * @module LASParser
 */
export default {
    /*
     * Set the laz-perf decoder path.
     * @param {string} path - path to `laz-perf.wasm` folder.
     */
    enableLazPerf(path) {
        if (!path) {
            throw new Error('Path to laz-perf is mandatory');
        }
        lasLoader.lazPerf = path;
    },
    /**
     * Parses a LAS file or a LAZ (LASZip) file and return the corresponding
     * `THREE.BufferGeometry`.
     *
     * @param {ArrayBuffer} data - The file content to parse.
     * @param {Object} [options]
     * @param {Object} [options.in] - Options to give to the parser.
     * @param { 8 | 16 } [options.in.colorDepth] - Color depth (in bits).
     * Defaults to 8 bits for LAS 1.2 and 16 bits for later versions
     * (as mandatory by the specification)
     *
     * @return {Promise} A promise resolving with a `THREE.BufferGeometry`. The
     * header of the file is contained in `userData`.
     */
    parse(data, options = {}) {
        if (options.out?.skip) {
            console.warn("Warning: options 'skip' not supported anymore");
        }
        return lasLoader.parseFile(data, {
            colorDepth: options.in?.colorDepth,
        }).then((parsedData) => {
            const geometry = new THREE.BufferGeometry();
            const attributes = parsedData.attributes;
            geometry.userData = parsedData.header;

            const positionBuffer = new THREE.BufferAttribute(attributes.position, 3);
            geometry.setAttribute('position', positionBuffer);

            const intensityBuffer = new THREE.BufferAttribute(attributes.intensity, 1, true);
            geometry.setAttribute('intensity', intensityBuffer);

            const returnNumber = new THREE.BufferAttribute(attributes.returnNumber, 1);
            geometry.setAttribute('returnNumber', returnNumber);

            const numberOfReturns = new THREE.BufferAttribute(attributes.numberOfReturns, 1);
            geometry.setAttribute('numberOfReturns', numberOfReturns);

            const classBuffer = new THREE.BufferAttribute(attributes.classification, 1, true);
            geometry.setAttribute('classification', classBuffer);

            const pointSourceID = new THREE.BufferAttribute(attributes.pointSourceID, 1);
            geometry.setAttribute('pointSourceID', pointSourceID);

            if (attributes.color) {
                const colorBuffer = new THREE.BufferAttribute(attributes.color, 4, true);
                geometry.setAttribute('color', colorBuffer);
            }

            geometry.computeBoundingBox();
            return geometry;
        });
    },
};
