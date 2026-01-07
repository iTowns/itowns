import PointCloudLayer, { type PointCloudLayerParameters } from 'Layer/PointCloudLayer';
import CopcNode from 'Core/CopcNode';
import type CopcSource from 'Source/CopcSource';

interface CopcLayerParameters extends PointCloudLayerParameters {
    source : CopcSource;
}

/**
 * A layer for [Cloud Optimised Point Cloud](https://copc.io) (COPC) datasets.
 * See {@link PointCloudLayer} class for documentation on base properties.
 *
 * @example
 * // Create a new COPC layer
 * const copcSource = new CopcSource(\{
 *     url: 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz',
 *     crs: 'EPSG:4978',
 *     colorDepth: 16, // bit-depth of 'color' attribute (either 8 or 16 bits)
 * \});
 *
 * const copcLayer = new CopcLayer('COPC', \{
 *     source: copcSource,
 * \});
 *
 * View.prototype.addLayer.call(view, copcLayer);
 */
class CopcLayer extends PointCloudLayer {
    readonly isCopcLayer: true;

    source: CopcSource;
    /**
     * @param id - Unique id of the layer.
     * @param config - See {@link PointCloudLayer} for base pointcloud options.
     */
    constructor(id: string, config: CopcLayerParameters) {
        super(id, config);
        this.isCopcLayer = true;
        this.source = config.source;

        this.whenReady = this.source.whenReady.then((source) => {
            this.setElevationRange();

            const { rootHierarchyPage, cube } = source.info;
            const { pageOffset, pageLength } = rootHierarchyPage;
            this.root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, source, -1, this.crs);
            this.root.setOBBes(cube.slice(0, 3), cube.slice(3, 6));

            this.object3d.add(this.root.clampOBB);
            this.root.clampOBB.updateMatrixWorld(true);

            return this.root.loadOctree();
        });
    }
}

export default CopcLayer;
