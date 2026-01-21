import PointCloudLayer, { type PointCloudLayerParameters } from 'Layer/PointCloudLayer';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import type EntwinePointTileSource from 'Source/EntwinePointTileSource';

interface EntwinePointTileLayerParameters extends PointCloudLayerParameters {
    crs?: string;
    source: EntwinePointTileSource;
}

class EntwinePointTileLayer extends PointCloudLayer<EntwinePointTileSource> {
    /** Used to checkout whether this
     * layer is a EntwinePointTileLayer. Default is `true`. You should not
     * change this, as it is used internally for optimisation. */
    readonly isEntwinePointTileLayer: true;

    /**
     * Constructs a new instance of Entwine Point Tile layer.
     *
     * @example
     * // Create a new point cloud layer
     * const points = new EntwinePointTileLayer('EPT',
     *  \{
     *      source: new EntwinePointTileSource(\{
     *          url: 'https://server.geo/ept-dataset',
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
    constructor(id: string, config: EntwinePointTileLayerParameters) {
        super(id, config);

        this.isEntwinePointTileLayer = true;

        const resolve = this.addInitializationStep();
        this.whenReady = this.source.whenReady.then((source) => {
            this.setElevationRange();

            this.root = new EntwinePointTileNode(0, 0, 0, 0, source, -1, this.crs);
            // const { origin, rotation } = this.root.voxelOBB.projOBB(this.source.crs, this.crs);
            this.root.voxelOBB.projOBB(this.source.crs, this.crs);
            this.root.voxelOBB.name = 'this.root.voxelOBB';

            // this.root.voxelOBB.position.fromArray(origin);
            // this.root.voxelOBB.quaternion.copy(rotation).invert();

            this.root.voxelOBB.updateMatrix();
            this.root.voxelOBB.updateMatrixWorld(true);



            // this.bboxes.position.fromArray(origin);
            // this.bboxes.quaternion.copy(rotation).invert();

            // this.bboxes.updateMatrix();
            // this.bboxes.updateMatrixWorld(true);




            // this.bboxes.add(this.root.voxelOBB);
            // this.root.voxelOBB.updateMatrix();
            // this.root.voxelOBB.updateMatrixWorld(true);




            const res = this.root.clampOBB.projOBB(this.source.crs, this.crs);
            this.root.clampOBB.name = 'this.root.clampOBB';

            this.root.clampOBB.position.fromArray(res.origin);
            this.root.clampOBB.quaternion.copy(res.rotation).invert();

            this.root.clampOBB.updateMatrix();
            this.root.clampOBB.updateMatrixWorld(true);

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default EntwinePointTileLayer;
