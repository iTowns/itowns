import * as THREE from 'three';
import PointCloudLayer from 'Layer/PointCloudLayer';
import Potree2Node from 'Core/Potree2Node';
import Extent from 'Core/Geographic/Extent';
import Potree2Utils from 'Utils/Potree2Utils';

const bboxMesh = new THREE.Mesh();
const box3 = new THREE.Box3();
bboxMesh.geometry.boundingBox = box3;

/**
 * @property {boolean} isPotreeLayer - Used to checkout whether this layer
 * is a Potre2eLayer. Default is `true`. You should not change this, as it is
 * used internally for optimisation.
 */
class Potree2Layer extends PointCloudLayer {
    /**
     * Constructs a new instance of Potree2 layer.
     *
     * @constructor
     * @extends PointCloudLayer
     *
     * @example
     * // Create a new point cloud layer
     * const points = new Potree2Layer('points',
     *  {
     *      source: new Potree2Source({
     *          url: 'https://pointsClouds/',
     *          file: 'metadata.json',
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
     * @param {string} [config.crs=ESPG:4326] - The CRS of the {@link View} this
     * layer will be attached to. This is used to determine the extent of this
     * layer.  Default to `EPSG:4326`.
     */
    constructor(id, config) {
        super(id, config);
        this.isPotreeLayer = true;

        const resolve = this.addInitializationStep();

        this.source.whenReady.then((metadata) => {
            this.scale = new THREE.Vector3(1, 1, 1);
            this.spacing = metadata.spacing;
            this.hierarchyStepSize = metadata.hierarchy.stepSize;
            this.metadata = metadata;
            this.pointAttributes = Potree2Utils.parseAttributes(metadata.attributes);

            const min = new THREE.Vector3(...metadata.boundingBox.min);
            const max = new THREE.Vector3(...metadata.boundingBox.max);
            const boundingBox = new THREE.Box3(min, max);

            const offset = min.clone();
            boundingBox.min.sub(offset);
            boundingBox.max.sub(offset);
            this.offset = offset;

            const root = new Potree2Node(0, 0, this);

            root.spacing = metadata.spacing;
            root.scale = metadata.scale;
            root.offset = metadata.offset;

            root.projection = metadata.projection;
            root.bbox = boundingBox;
            root.tightBoundingBox = boundingBox.clone();
            root.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
            root.tightBoundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
            root.offset = offset;

            root.id = 'r';
            root.depth = 0;
            root.nodeType = 2;
            root.hierarchyByteOffset = 0n;
            root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
            root.spacing = metadata.spacing;
            root.byteOffset = 0;

            this.root = root;

            this.extent = Extent.fromBox3(this.source.crs || 'EPSG:4326', boundingBox);
            return this.root.loadOctree().then(resolve);
        });
    }
}

export default Potree2Layer;
