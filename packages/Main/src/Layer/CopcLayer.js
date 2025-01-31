import * as THREE from 'three';
import CopcNode from 'Core/CopcNode';
import PointCloudLayer from 'Layer/PointCloudLayer';

/**
 * A layer for [Cloud Optimised Point Cloud](https://copc.io) (COPC) datasets.
 * See {@link PointCloudLayer} class for documentation on base properties.
 *
 * @extends {PointCloudLayer}
 *
 * @example
 * // Create a new COPC layer
 * const copcSource = new CopcSource({
 *     url: 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz',
 *     crs: 'EPSG:4978',
 *     colorDepth: 16, // bit-depth of 'color' attribute (either 8 or 16 bits)
 * });
 *
 * const copcLayer = new CopcLayer('COPC', {
 *     source: copcSource,
 * });
 *
 * View.prototype.addLayer.call(view, copcLayer);
 */
class CopcLayer extends PointCloudLayer {
    /**
     * @param {string} id - Unique id of the layer.
     * @param {Object} config - See {@link PointCloudLayer} for base pointcloud
     * options.
     */
    constructor(id, config) {
        super(id, config);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isCopcLayer = true;

        const resolve = () => this;
        this.whenReady = this.source.whenReady.then((/** @type {CopcSource} */ source) => {
            const { cube, rootHierarchyPage } = source.info;
            const { pageOffset, pageLength } = rootHierarchyPage;

            this.root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, this, -1);
            this.root.bbox.min.fromArray(cube, 0);
            this.root.bbox.max.fromArray(cube, 3);

            this.minElevationRange = source.header.min[2];
            this.maxElevationRange = source.header.max[2];

            this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
            this.offset = new THREE.Vector3(0.0, 0.0, 0.0);

            return this.root.loadOctree().then(resolve);
        });
    }

    get spacing() {
        return this.source.info.spacing;
    }
}

export default CopcLayer;
