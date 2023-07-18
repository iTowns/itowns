import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import Potree2BinParser from 'Parser/Potree2BinParser';

/**
 * @classdesc
 * Potree2Source are object containing informations on how to fetch potree 2.0 points cloud resources.
 *
 *
 */

class Potree2Source extends Source {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * Potree2Source
     * @param {string} source.url - folder url.
     * @param {string} source.file - metadata file name.
     *
     * This `metadata` file stores information about the potree cloud 2.0 in JSON format. the structure is :
     *
     * * __`version`__ - The metadata.json format may change over time. The version number is
     * necessary so that parsers know how to interpret the data.
     * * __`boundingBox`__ - Contains the minimum and maximum of the axis aligned bounding box. This bounding box is cubic and aligned to fit to the octree root.
     * * __`tightBoundingBox`__ - This bounding box thightly fits the point data (optional).
     * * __`spacing`__ - The minimum distance between points at root level.
     * ```
     * {
     *     version: '2.0',
     *     name: "sample",
     *     description: "",
     *     points: 534909153,
     *     projection: "",
     *     hierarchy: {
     *         firstChunkSize: 1276,
     *         stepSize: 4,
     *         depth: 16
     *     },
     *     offset: {
     *         0: 1339072.07,
     *         1: 7238866.339,
     *         2: 85.281
     *     },
     *     scale: {
     *         0: 0.001,
     *         1: 0.001,
     *         2: 0.002
     *     },
     *     spacing: 24.476062500005355,
     *     boundingBox: {
     *         min: {
     *             0: 1339072.07,
     *             1: 7238866.339,
     *             2: 85.281
     *         },
     *         max: {
     *             0: 1342205.0060000008,
     *             1: 7241999.275,
     *             2: 3218.2170000006854
     *         }
     *     },
     *     tightBoundingBox: {
     *         min: {
     *             0: 1339072.07,
     *             1: 7238866.339,
     *             2: 85.281
     *         },
     *         max: {
     *             0: 1342205.0060000008,
     *             1: 7241999.275,
     *             2: 3218.2170000006854
     *         }
     *     },
     *     encoding: "BROTLI",
     *     attributes: [
     *         0: {
     *             name: "position",
     *             ...
     *         },
     *         1: {
     *             name: "intensity",
     *             ...
     *         },
     *         2: {
     *             name: "classification",
     *             ...
     *         },
     *         3: {
     *             name: "user data",
     *             ...
     *         },
     *         4: {
     *             name: "rgb",
     *             ...
     *         },
     *         ...
     *     ]
     * }
     * ```
     *
     * @extends Source
     *
     * @constructor
     */
    constructor(source) {
        if (!source.file) {
            throw new Error('New Potree2Source: file is required');
        }

        super(source);
        this.file = source.file;
        this.fetcher = Fetcher.arrayBuffer;
        this.extensionOctree = 'octree.bin';

        this.whenReady = (source.cloud ? Promise.resolve(source.cloud) : Fetcher.json(`${this.url}/${this.file}`, this.networkOptions))
            .then((cloud) => {
                this.pointAttributes = cloud.attributes;
                this.baseurl = `${this.url}`;
                this.extension = 'bin';
                this.parse = Potree2BinParser.parse;

                return cloud;
            });
    }
}

export default Potree2Source;
