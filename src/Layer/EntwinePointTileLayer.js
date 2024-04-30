import * as THREE from 'three';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Extent from 'Core/Geographic/Extent';
import proj4 from 'proj4';

const bboxMesh = new THREE.Mesh();
const box3 = new THREE.Box3();
bboxMesh.geometry.boundingBox = box3;

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
        this.scale = new THREE.Vector3(1, 1, 1);

        const resolve = this.addInitializationStep();
        this.whenReady = this.source.whenReady.then(() => {
            // NOTE: this spacing is kinda arbitrary here, we take the width and
            // length (height can be ignored), and we divide by the specified
            // span in ept.json. This needs improvements.
            this.spacing = (Math.abs(this.source.bounds[3] - this.source.bounds[0])
                + Math.abs(this.source.bounds[4] - this.source.bounds[1])) / (2 * this.source.span);

            this.root = new EntwinePointTileNode(0, 0, 0, 0, this, -1);

            let forward = (x => x);
            if (this.source.crs !== this.crs) {
                try {
                    forward = proj4(this.source.crs, this.crs).forward;
                } catch (err) {
                    throw new Error(`${err} is not defined in proj4`);
                }
            }

            this.minElevationRange = this.minElevationRange ?? this.source.boundsConforming[2];
            this.maxElevationRange = this.maxElevationRange ?? this.source.boundsConforming[5];

            const bounds = [
                ...forward(this.source.bounds.slice(0, 3)),
                ...forward(this.source.bounds.slice(3, 6)),
            ];

            this.root.bbox.setFromArray(bounds);

            this.extent = Extent.fromBox3(this.crs, this.root.bbox);

            return this.root.loadOctree().then(resolve);
        });
    }
}

export default EntwinePointTileLayer;
