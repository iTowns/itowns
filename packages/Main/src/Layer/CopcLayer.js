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

        const resolve = super.addInitializationStep();
        this.whenReady = this.source.whenReady.then((/** @type {CopcSource} */ source) => {
            const { cube } = source.info;
            const { pageOffset, pageLength } = source.info.rootHierarchyPage;

            const root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, this.source, -1);
            root.bbox.min.fromArray(cube, 0);
            root.bbox.max.fromArray(cube, 3);

            this.minElevationRange = this.minElevationRange ?? source.header.min[2];
            this.maxElevationRange = this.maxElevationRange ?? source.header.max[2];

            this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
            this.offset = new THREE.Vector3(0.0, 0.0, 0.0);

            this.root = root;

            return root.loadOctree().then(resolve);
        });
    }
}

export default CopcLayer;
