import { LazPerf } from 'laz-perf';
import * as copc from 'copc';

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

class LAZLoader {
    constructor() {
        this._wasmPath = 'https://unpkg.com/laz-perf@0.0.6/lib/';
        this._wasmPromise = null;
    }

    _initDecoder() {
        if (this._wasmPromise) {
            return this._wasmPromise;
        }

        this._wasmPromise = LazPerf.create({
            locateFile: file => `${this._wasmPath}/${file}`,
        });

        return this._wasmPromise;
    }

    _parseView(view, options) {
        const colorDepth = options.colorDepth ?? 16;

        const getPosition = ['X', 'Y', 'Z'].map(view.getter);
        const getIntensity = view.getter('Intensity');
        const getReturnNumber = view.getter('ReturnNumber');
        const getNumberOfReturns = view.getter('NumberOfReturns');
        const getClassification = view.getter('Classification');
        const getPointSourceID = view.getter('PointSourceId');
        const getColor = view.dimensions.Red ?
            ['Red', 'Green', 'Blue'].map(view.getter) : undefined;

        const positions = new Float32Array(view.pointCount * 3);
        const intensities = new Uint16Array(view.pointCount);
        const returnNumbers = new Uint8Array(view.pointCount);
        const numberOfReturns = new Uint8Array(view.pointCount);
        const classifications = new Uint8Array(view.pointCount);
        const pointSourceIDs = new Uint16Array(view.pointCount);
        const colors = getColor ? new Uint8Array(view.pointCount * 4) : undefined;

        for (let i = 0; i < view.pointCount; i++) {
            // `getPosition` apply scale and offset transform to the X, Y, Z
            // values. See https://github.com/connormanning/copc.js/blob/master/src/las/extractor.ts.
            const [x, y, z] = getPosition.map(f => f(i));
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            intensities[i] = getIntensity(i);
            returnNumbers[i] = getReturnNumber(i);
            numberOfReturns[i] = getNumberOfReturns(i);

            if (getColor) {
                // Note that we do not infer color depth as it is expensive
                // (i.e. traverse the whole view to check if there exists a red,
                // green or blue value > 255).
                let [r, g, b] = getColor.map(f => f(i));

                if (colorDepth === 16) {
                    r /= 256;
                    g /= 256;
                    b /= 256;
                }

                colors[i * 4] = r;
                colors[i * 4 + 1] = g;
                colors[i * 4 + 2] = b;
                colors[i * 4 + 3] = 255;
            }

            classifications[i] = getClassification(i);
            pointSourceIDs[i] = getPointSourceID(i);
        }

        return {
            position: positions,
            intensity: intensities,
            returnNumber: returnNumbers,
            numberOfReturns,
            classification: classifications,
            pointSourceID: pointSourceIDs,
            color: colors,
        };
    }

    /**
     * Set LazPerf decoder path.
     * @param {string} path - path to `laz-perf.wasm` folder.
     */
    set lazPerf(path) {
        this._wasmPath = path;
        this._wasmPromise = null;
    }

    /**
     * Parse a LAZ chunk. Note that this function is **CPU-bound** and shall be
     * parallelised in a dedicated worker.
     * @param {Uint8Array} data - Chunk data.
     * @param {Object} options - Parsing options.
     * @property {Header} options.header - Partial LAS header.
     * @property {number} options.pointCount - Number of points in this data
     * chunk.
     * @property {copc.Las.ExtraBytes[]} [options.eb] - Extra bytes LAS VLRs
     * headers.
     * @property {8 | 16} [options.colorDepth=16] - Color depth (in bits).
     * Either 8 or 16 bits.
     */
    async parseChunk(data, options) {
        const { header, eb, pointCount } = options;
        const { pointDataRecordFormat, pointDataRecordLength } = header;

        const bytes = new Uint8Array(data);
        const pointData = await copc.Las.PointData.decompressChunk(bytes, {
            pointCount,
            pointDataRecordFormat,
            pointDataRecordLength,
        }, this._initDecoder());

        const view = copc.Las.View.create(pointData, header, eb);
        return this._parseView(view, options);
    }
}

export default LAZLoader;
