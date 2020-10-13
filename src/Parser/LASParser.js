import * as THREE from 'three';
import { LASLoader } from '@loaders.gl/las';

// See this document for LAS format specification
// https://www.asprs.org/wp-content/uploads/2010/12/LAS_1_4_r13.pdf
// http://www.cs.unc.edu/~isenburg/lastools/download/laszip.pdf

/**
 * The LASParser module provides a [parse]{@link module:LASParser.parse} method
 * that takes a LAS file or a LAZ (LASZip) file in, and gives a
 * `THREE.BufferGeometry` containing all the necessary attributes to be
 * displayed in iTowns. It uses the
 * [LASLoader](https://loaders.gl/modules/las/docs/api-reference/las-loader)
 * from `loaders.gl`.
 *
 * @module LASParser
 */
export default {
    /**
     * Parses a LAS file or a LAZ (LASZip) file and return the corresponding
     * `THREE.BufferGeometry`.
     *
     * @param {ArrayBuffer} data - The file content to parse.
     * @param {Object} [options] - Options to give to the parser.
     * @param {number|string} [options.in.colorDepth='auto'] - Does the color
     * encoding is known ? Is it `8` or `16` bits ? By default it is to
     * `'auto'`, but it will be more performant if a specific value is set.
     * @param {number} [options.out.skip=1] - Read one point from every `skip`
     * points.
     *
     * @return {Promise} A promise resolving with a `THREE.BufferGeometry`. The
     * header of the file is contained in `userData`.
     */
    parse(data, options = {}) {
        options.in = options.in || {};
        options.out = options.out || {};
        return LASLoader.parse(data, {
            las: {
                colorDepth: options.in.colorDepth || 'auto',
                skip: options.out.skip || 1,
            },
        }).then((parsedData) => {
            const geometry = new THREE.BufferGeometry();
            geometry.userData = parsedData.loaderData.header;

            const positionBuffer = new THREE.BufferAttribute(parsedData.attributes.POSITION.value, 3, false);
            geometry.setAttribute('position', positionBuffer);

            const intensityBuffer = new THREE.BufferAttribute(parsedData.attributes.intensity.value, 1, true);
            geometry.setAttribute('intensity', intensityBuffer);

            const classificationBuffer = new THREE.BufferAttribute(parsedData.attributes.classification.value, 1, true);
            geometry.setAttribute('classification', classificationBuffer);

            if (parsedData.attributes.COLOR_0) {
                const colorBuffer = new THREE.BufferAttribute(parsedData.attributes.COLOR_0.value, 4, true);
                geometry.setAttribute('color', colorBuffer);
            }

            geometry.computeBoundingBox();

            return geometry;
        });
    },
};
