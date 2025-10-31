import * as THREE from 'three';
import { spawn, Thread, Transfer } from 'threads';
import proj4 from 'proj4';

let _lazPerf;
let _thread;

function workerInstance() {
    return new Worker(
        /* webpackChunkName: "itowns_lasworker" */
        new URL('../Worker/LASLoaderWorker.js', import.meta.url),
        { type: 'module' },
    );
}

async function loader() {
    if (_thread) { return _thread; }
    _thread = await spawn(workerInstance());
    if (_lazPerf) { _thread.lazPerf(_lazPerf); }
    return _thread;
}

function buildBufferGeometry(attributes) {
    const geometry = new THREE.BufferGeometry();

    const positionBuffer = new THREE.BufferAttribute(attributes.position, 3);
    geometry.setAttribute('position', positionBuffer);

    const intensityBuffer = new THREE.BufferAttribute(attributes.intensity, 1);
    geometry.setAttribute('intensity', intensityBuffer);

    const returnNumber = new THREE.BufferAttribute(attributes.returnNumber, 1);
    geometry.setAttribute('returnNumber', returnNumber);

    const numberOfReturns = new THREE.BufferAttribute(attributes.numberOfReturns, 1);
    geometry.setAttribute('numberOfReturns', numberOfReturns);

    const classBuffer = new THREE.BufferAttribute(attributes.classification, 1);
    geometry.setAttribute('classification', classBuffer);

    const pointSourceID = new THREE.BufferAttribute(attributes.pointSourceID, 1);
    geometry.setAttribute('pointSourceID', pointSourceID);

    if (attributes.color) {
        const colorBuffer = new THREE.BufferAttribute(attributes.color, 4, true);
        geometry.setAttribute('color', colorBuffer);
    }
    const scanAngle = new THREE.BufferAttribute(attributes.scanAngle, 1);
    geometry.setAttribute('scanAngle', scanAngle);

    return geometry;
}

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
        _lazPerf = path;
    },

    /**
     * Terminate all worker instances.
     * @returns {Promise<void>}
     */
    terminate() {
        const currentThread = _thread;
        _thread = undefined;
        return Thread.terminate(currentThread);
    },

    /**
     * Parses a chunk of a LAS or LAZ (LASZip) and returns the corresponding
     * `THREE.BufferGeometry`.
     *
     * @param {ArrayBuffer} data - The file content to parse.
     * @param {Object} options
     * @param {Object} options.in - Options to give to the parser.
     * @param {number} options.in.pointCount - Number of points encoded in this
     * data chunk.
     * @param {Object} options.in.header - Partial LAS file header.
     * @param {number} options.in.header.pointDataRecordFormat - Type of Point
     * Data Record contained in the LAS file.
     * @param {number} options.in.header.pointDataRecordLength - Size (in bytes)
     * of the Point Data Record.
     * @param {Object} [options.eb] - Extra bytes LAS VLRs headers.
     * @param { 8 | 16 } [options.in.colorDepth] - Color depth (in bits).
     * Defaults to 8 bits for LAS 1.2 and 16 bits for later versions
     * (as mandatory by the specification)
     *
     * @return {Promise<THREE.BufferGeometry>} A promise resolving with a
     * `THREE.BufferGeometry`.
     */
    async parseChunk(data, options = {}) {
        const lasLoader = await loader();
        const source = options.in.source;
        const origin = options.in.origin;
        const quaternion = options.in.rotation;
        const parsedData = await lasLoader.parseChunk(Transfer(data), {
            pointCount: options.in.numPoints,
            header: source.header,
            eb: source.eb,
            colorDepth: source.colorDepth,
            in: {
                crs: source.crs,
                projDefs: proj4.defs(source.crs),
            },
            out: {
                crs: options.in.crs,
                projDefs: proj4.defs(options.in.crs),
                origin: origin.toArray(),
                rotation: quaternion.toArray(),
            },
        });

        const geometry = buildBufferGeometry(parsedData.attributes);
        geometry.boundingBox = new THREE.Box3().setFromArray(parsedData.attributes.bbox);
        geometry.userData.origin = origin;
        geometry.userData.rotation = quaternion;
        return geometry;
    },

    /**
     * Parses a LAS file or a LAZ (LASZip) file and return the corresponding
     * `THREE.BufferGeometry`.
     *
     * @param {ArrayBuffer} data - The file content to parse.
     * @param {Object} [options]
     * @param {Object} [options.in] - Options to give to the parser.
     * @param {String} options.in.crs - Crs of the source.
     * @param { 8 | 16 } [options.in.colorDepth] - Color depth (in bits).
     * Defaults to 8 bits for LAS 1.2 and 16 bits for later versions
     * (as mandatory by the specification)
     * @param {String} options.out.crs - Crs of the view.
     * @param {String} options.out.origin - The coordinate of the local origin
     * in the world referentiel.
     * @param {String} options.out.rotation - Rotation to go from the local referetiel
     * to a geocentrique one (in appliable).
     *
     * @return {Promise} A promise resolving with a `THREE.BufferGeometry`. The
     * header of the file is contained in `userData`.
     */
    async parse(data, options = {}) {
        if (options.out?.skip) {
            console.warn("Warning: options 'skip' not supported anymore");
        }

        const lasLoader = await loader();
        const source = options.in.source;
        const origin = options.in.origin;
        const quaternion = options.in.rotation;
        const parsedData = await lasLoader.parseFile(Transfer(data), {
            colorDepth: source.colorDepth,
            in: {
                crs: source.crs,
                projDefs: proj4.defs(source.crs),
            },
            out: {
                crs: options.in.crs,
                projDefs: proj4.defs(options.in.crs),
                origin: origin.toArray(),
                rotation: quaternion.toArray(),
            },
        });

        const geometry = buildBufferGeometry(parsedData.attributes);
        geometry.boundingBox = new THREE.Box3().setFromArray(parsedData.attributes.bbox);
        geometry.userData.origin = origin;
        geometry.userData.rotation = quaternion;
        geometry.userData.header = parsedData.header;

        return geometry;
    },
};
