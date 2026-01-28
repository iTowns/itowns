// Don’t import Three directly if you want to improve tree shaking.
import { Vector3, Quaternion, Box3 } from 'three';
import { LazPerf } from 'laz-perf';
import { Las } from 'copc';
import proj4 from 'proj4';
// eslint-disable-next-line import/extensions
import { LASAttributes } from './LASConstant.js';

const LASAttributesName = LASAttributes.filter(a => a.size === undefined).map(a => a.name);

const origin = /* @__PURE__ */ new Vector3();
const quaternion = /* @__PURE__ */ new Quaternion();
const box = /* @__PURE__ */ new Box3();
const position = /* @__PURE__ */ new Vector3();
const scalarDepth16 = 1 / 256;

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

function defaultColorEncoding(header) {
    return (header.majorVersion === 1 && header.minorVersion <= 2) ? 8 : 16;
}

/**
 * @classdesc
 * Loader for LAS and LAZ (LASZip) point clouds. It uses the copc.js library and
 * the laz-perf decoder under the hood.
 *
 * The laz-perf web assembly module is lazily fetched at runtime when a parsing
 * request is initiated. Location of laz-perf wasm defaults to the unpkg
 * repository.
 */
class LASLoader {
    constructor() {
        this._wasmPath = 'https://cdn.jsdelivr.net/npm/laz-perf@0.0.6/lib';
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
        const forward = (options.in.crs !== options.out.crs) ?
            proj4(options.in.projDefs, options.out.projDefs).forward :
            (x => x);

        const getPosition = ['X', 'Y', 'Z'].map(view.getter);

        const attributes = {
            positions: new Float32Array(view.pointCount * 3),
        };

        let getColor = () => {};
        if (view.dimensions.Red) {
            let readColor = ['Red', 'Green', 'Blue'].map(view.getter);
            if ((options.colorDepth ?? defaultColorEncoding(options.header)) == 16) {
                readColor = readColor.map(g => c => g(c) * scalarDepth16);
            }
            readColor.push(() => 255);
            attributes.colors = new Uint8Array(view.pointCount * 4);
            getColor = (i) => {
                const c = i * 4;
                readColor.forEach((f, j) => {
                    attributes.colors[c + j] = f(i);
                });
            };
        }

        const getters = {};

        LASAttributesName.forEach((a) => {
            attributes[a] = new Uint16Array(view.pointCount);
            getters[a] = view.getter(a);
        });

        /*
        As described by the LAS spec, Scan Angle is encoded:
        - as signed char in a valid range from -90 to +90 (degrees) prior to the LAS 1.4 Point Data Record Formats (PDRF) 6
        - as a signed short in a valid range from -30 000 to +30 000. Those values represents scan angles from -180 to +180
          degrees with an increment of 0.006 for PDRF >= 6.
        The copc.js library does the degree convertion and stores it as a `Float32`.
        */

        origin.fromArray(options.out.origin);
        quaternion.fromArray(options.out.rotation);
        box.makeEmpty();

        for (let i = 0; i < view.pointCount; i++) {
            // `getPosition` apply scale and offset transform to the X, Y, Z
            // values. See https://github.com/connormanning/copc.js/blob/master/src/las/extractor.ts.
            // we thus apply the projection to get values in the Crs of the view.
            position.fromArray(forward(getPosition.map(f => f(i))));
            position.sub(origin).applyQuaternion(quaternion);
            position.toArray(attributes.positions, i * 3);
            box.expandByPoint(position);
            LASAttributesName.forEach((a) => { attributes[a][i] = getters[a](i); });
            getColor(i);
        }

        return { attributes, box: box.toJSON() };
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
     * Parses a LAS or LAZ (LASZip) chunk. Note that this function is
     * **CPU-bound** and shall be parallelised in a dedicated worker.
     * @param {Uint8Array} data - File chunk data.
     * @param {Object} options - Parsing options.
     * @param {Header} options.header - Partial LAS header.
     * @param {number} options.pointCount - Number of points encoded in this
     * data chunk.
     * @param {Las.ExtraBytes[]} [options.eb] - Extra bytes LAS VLRs
     * headers.
     * @param {8 | 16} [options.colorDepth] - Color depth encoding (in bits).
     * Either 8 or 16 bits. Defaults to 8 bits for LAS 1.2 and 16 bits for later
     * versions (as mandatory by the specification).
     */
    async parseChunk(data, options) {
        const { header, eb, pointCount } = options;
        const { pointDataRecordFormat, pointDataRecordLength } = header;

        const bytes = new Uint8Array(data);
        const pointData = await Las.PointData.decompressChunk(bytes, {
            pointCount,
            pointDataRecordFormat,
            pointDataRecordLength,
        }, this._initDecoder());

        const view = Las.View.create(pointData, header, eb);
        return this._parseView(view, options);
    }

    /**
     * Parses a LAS or LAZ (LASZip) file. Note that this function is
     * **CPU-bound** and shall be parallelised in a dedicated worker.
     * @param {ArrayBuffer} data - Binary data to parse.
     * @param {Object} [options] - Parsing options.
     * @param {8 | 16} [options.colorDepth] - Color depth encoding (in bits).
     * Either 8 or 16 bits. Defaults to 8 bits for LAS 1.2 and 16 bits for later
     * versions (as mandatory by the specification)
     */
    async parseFile(data, options = {}) {
        const bytes = new Uint8Array(data);

        const pointData = await Las.PointData.decompressFile(bytes, this._initDecoder());

        const header = Las.Header.parse(bytes);
        options.header = header;

        const getter = async (begin, end) => bytes.slice(begin, end);
        const vlrs = await Las.Vlr.walk(getter, header);
        const ebVlr = Las.Vlr.find(vlrs, 'LASF_Spec', 4);
        const eb = ebVlr && Las.ExtraBytes.parse(await Las.Vlr.fetch(getter, ebVlr));

        const view = Las.View.create(pointData, header, eb);

        return {
            ...this._parseView(view, options),
            header,
        };
    }
}

export default LASLoader;
