import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';

/**
 * @property {boolean} isEntwinePointTileLayer - Used to checkout whether this
 * layer is a EntwinePointTileLayer. Default is `true`. You should not change
 * this, as it is used internally for optimisation.
 *
 * @extends PointCloudLayer
 */
class EntwinePointTileLayer extends PointCloudLayer {
    /**
     * Constructs a new instance of Entwine Point Tile layer.
     *
     * @example
     * // Create a new point cloud layer
     * const points = new EntwinePointTileLayer('EPT',
     *  {
     *      source: new EntwinePointTileSource({
     *          url: 'https://server.geo/ept-dataset',
     *      }
     *  });
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param {string} id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param {Object} config - Configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     */
    constructor(id, config) {
        super(id, config);

        /**
         * @type {boolean}
         * @readonly
         */
        this.isEntwinePointTileLayer = true;

        /**
         * @type {THREE.Vector3}
         */

        const resolve = this.addInitializationStep();
        this.whenReady = this.source.whenReady.then(() => {
            this.setElevationRange();

            this.root = new EntwinePointTileNode(0, 0, 0, 0, this.source, -1, this.crs);

            this.setRootOBBes(this.source.bounds.slice(0, 3), this.source.bounds.slice(3, 6));

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default EntwinePointTileLayer;
