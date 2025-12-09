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
        this.whenReady = this.source.whenReady.then(() => {
            this.setElevationRange();

            this.root = new EntwinePointTileNode(0, 0, 0, 0, this.source, -1, this.crs);
            const { bounds } = this.source;
            this.root.setOBBes(bounds.slice(0, 3), bounds.slice(3, 6));

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default EntwinePointTileLayer;
