import PointCloudLayer, { PointCloudLayerParameters } from 'Layer/PointCloudLayer';
import PotreeNode from 'Core/PotreeNode';
import type PotreeSource from 'Source/PotreeSource';

interface PotreeLayerParameters extends PointCloudLayerParameters {
    /** he CRS of the View this layer will be attached to.
     * This is used to determine the extent of this
     * layer.  Default to `EPSG:4326`. */
    crs?: string;
    source: PotreeSource;
}

class PotreeLayer extends PointCloudLayer<PotreeSource> {
    /** Used to checkout whether this layer is a PotreeLayer.
     * Default is `true`. You should not change this, as it is
     * used internally for optimisation. */
    readonly isPotreeLayer: true;

    /**
     * Constructs a new instance of Potree layer.
     *
     * @example
     * // Create a new point cloud layer
     * const points = new PotreeLayer('points',
     *  \{
     *      source: new PotreeLayer(\{
     *          url: 'https://pointsClouds/',
     *          file: 'points.js',
     *      \}
     *  \});
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * View that already has a layer going by that id.
     * @param config - Configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     */
    constructor(id: string, config: PotreeLayerParameters) {
        super(id, config);

        this.isPotreeLayer = true;

        const loadOctree = this.source.whenReady.then((cloud) => {
            const normal = Array.isArray(cloud.pointAttributes) &&
                cloud.pointAttributes.find((elem: string) => elem.startsWith('NORMAL'));
            if (normal) {
                // @ts-expect-error PointsMaterial is not typed
                this.material.defines[normal] = 1;
            }

            this.setElevationRange();

            this.root = new PotreeNode(0, -1, 0, 0, this.source, this.crs);
            const { boundingBox } = cloud;
            this.root.setOBBes([boundingBox.lx, boundingBox.ly, boundingBox.lz],
                [boundingBox.ux, boundingBox.uy, boundingBox.uz]);

            this.object3d.add(this.root.clampOBB);
            this.root.clampOBB.updateMatrixWorld(true);

            return this.root.loadOctree();
        });

        this._promises.push(loadOctree);
    }
}

export default PotreeLayer;
