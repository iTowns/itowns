import CopcSource from './CopcSource';

/**
 * @classdesc
 * A source for [Cloud Optimised Point Cloud](https://copc.io/) (COPC) data.
 * Such data consists of a [LAZ 1.4](https://www.ogc.org/standard/las/) file
 * that stores compressed points data organized in a clustered octree.
 *
 * A freshly created source fetches and parses portions of the file
 * corresponding to the LAS 1.4 header, all the Variable Length Record (VLR)
 * headers as well the following VLRs:
 * - COPC [`info`](https://copc.io/#info-vlr) record (mandatory)
 * - LAS 1.4 `OGC Coordinate System WKT` record (mandatory, see [Las 1.4
 *   spec](https://portal.ogc.org/files/?artifact_id=74523))
 * - LAS 1.4 `Extra Bytes` record (optional, see [Las 1.4
 *   spec](https://portal.ogc.org/files/?artifact_id=74523))
 *
 * @extends {Source}
 *
 * @property {boolean} isCopcSource - Read-only flag to check that a given
 * object is of type CopcSource.
 * @property {Object} header - LAS header of the source.
 * @property {Object[]} eb - List of headers of each Variable Length Records
 * (VLRs).
 * @property {Object} info - COPC `info` VLR.
 * @property {number[]} info.cube - Bounding box of the octree as a 6-elements.
 * tuple `[minX, minY, minZ, maxX, maxY, maxZ]`. Computed from `center_x`,
 * `center_y`, `center_z` and `halfSize` properties.
 * @property {Object} info.rootHierarchyPage - Hierarchy page of the root node.
 * @property {number} info.rootHierarchyPage.pageOffset - Absolute Offset to the
 * root node data chunk.
 * @property {number} info.rootHierarchyPage.pageOffset - Size (in bytes) of the
 * root node data chunk.
 * @property {number[]} gpsTimeRange - A 2-element tuple denoting the minimum
 * and maximum values of attribute `gpsTime`.
 */
// class MultiSource extends Source {
class MultiSource {
    /**
     * @param {Object} config - Source configuration
     * @param {string} config.url - URL of the COPC resource.
     * @param {8 | 16} [config.colorDepth=16] - Encoding of the `color`
     * attribute. Either `8` or `16` bits.
     * @param {string} [config._lazPerfBaseUrl] - (experimental) Overrides base
     * url of the `las-zip.wasm` file of the `laz-perf` library.
     * @param {string} [config.crs='EPSG:4326'] - Native CRS of the COPC
     * ressource. Note that this is not for now inferred from the COPC header.
     * @param {RequestInit} [config.networkOptions] - Fetch options (passed
     * directly to `fetch()`), see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     * @param {Object} [config.attribution] - Attribution of the data.
     *
     * @constructor
     */
    constructor(config) {
        this.url = config.url;
        this.isMultipleSource = true;

        const promises = [];
        this.url.forEach((url) => {
            const source = new CopcSource({ url });
            promises.push(source);
        });

        this.whenReady = promises;
    }
}

export default MultiSource;
