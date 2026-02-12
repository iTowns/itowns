import * as THREE from 'three';
import { spawn, Thread, Transfer } from 'threads';
import { CRS, OrientationUtils, Coordinates } from '@itowns/geographic';
import { LASAttributes } from 'Loader/LASConstant';

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

async function parse(data, options, type = 'parseFile') {
    const lasLoader = await loader();
    const source = options.in.source;

    const center = new Coordinates(options.in.crs)
        .setFromVector3(options.in.clampOBB.center);
    const centerZ0 = projZ0(center, source.crs, options.in.crs);
    const quaternion = getQuaternion(centerZ0, source.crs, options.in.crs);

    const config = {
        colorDepth: source.colorDepth,
        in: {
            crs: source.crs,
            projDefs: CRS.defs(source.crs),
        },
        out: {
            crs: options.in.crs, // move crs to out ?
            projDefs: CRS.defs(options.in.crs),
            origin: centerZ0,
            rotation: quaternion.toArray(),
        },
    };

    if (type === 'parseChunk') {
        config.pointCount = options.in.numPoints;
        config.header = source.header;
        config.eb = source.eb;
    }

    const parsedData = await lasLoader[type](Transfer(data), config);

    const geometry = buildBufferGeometry(parsedData.attributes);
    geometry.boundingBox = new THREE.Box3().fromJSON(parsedData.box);
    // geometry.userData.header = parsedData.header;
    geometry.userData.position = new Coordinates(options.in.crs).setFromArray(centerZ0);
    geometry.userData.quaternion = quaternion.clone().invert();

    return geometry;
}

function buildBufferGeometry(attributes) {
    const geometry = new THREE.BufferGeometry();

    Object.keys(attributes).forEach((attributeName) => {
        const { bufferName, size, normalized  } = LASAttributes.find(a => a.name === attributeName);
        geometry.setAttribute(bufferName, new THREE.BufferAttribute(attributes[attributeName], size || 1, normalized));
    });

    return geometry;
}

// get the projection of a point at Z=0
function projZ0(center, crsIn, crsOut) {
    const centerCrsIn = CRS.transform(crsOut, crsIn).forward(center);
    const centerZ0 = CRS.transform(crsIn, crsOut).forward([centerCrsIn.x, centerCrsIn.y, 0]);
    return centerZ0;
}

function getQuaternion(origin, crsIn, crsOut) {
    let quaternion = new THREE.Quaternion();
    if (CRS.defs(crsOut).projName === 'geocent') {
        const coord = new Coordinates(crsOut).setFromArray(origin);
        quaternion = OrientationUtils.quaternionFromCRSToCRS(crsOut, crsIn)(coord);
    }
    return quaternion;
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
     * @param {number} options.in.numPoints - Number of points encoded in this
     * data chunk.
     * @param {Object} options.in.source - Source information.
     * @param {Object} options.in.source.header - Partial LAS file header.
     * @param {number} options.in.source.header.pointDataRecordFormat - Type of
     * Point Data Record contained in the LAS file.
     * @param {number} options.in.source.header.pointDataRecordLength - Size
     * (in bytes) of the Point Data Record.
     * @param {Object} [options.in.source.eb] - Extra bytes LAS VLRs headers.
     * @param { 8 | 16 } [options.in.colorDepth] - Color depth (in bits).
     * Defaults to 8 bits for LAS 1.2 and 16 bits for later versions
     * (as mandatory by the specification)
     *
     * @return {Promise<THREE.BufferGeometry>} A promise resolving with a
     * `THREE.BufferGeometry`.
     */
    async parseChunk(data, options = {}) {
        const geometry = await parse(data, options, 'parseChunk');
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

        const geometry = await parse(data, options, 'parseFile');
        return geometry;
    },
};
