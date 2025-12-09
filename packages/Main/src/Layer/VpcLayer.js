import * as THREE from 'three';
import PointCloudNode from 'Core/PointCloudNode';
import CopcNode from 'Core/CopcNode';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';
import OBB from 'Renderer/OBB';

function _instantiateRootNode(source, crs) {
    let root;
    if (source.isCopcSource) {
        const { info } = source;
        const { pageOffset, pageLength } = info.rootHierarchyPage;
        root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, source, -1, crs);
        root.setOBBes(info.cube.slice(0, 3), info.cube.slice(3, 6));
    } else if (source.isEntwinePointTileSource) {
        root = new EntwinePointTileNode(0, 0, 0, 0, source, -1, crs);
        root.setOBBes(source.boundsConforming.slice(0, 3), source.boundsConforming.slice(3, 6));
    } else {
        const msg = '[VPCLayer]: stack point cloud format not supporter';
        console.warn(msg);
        PointCloudLayer.handlingError(msg);
    }
    return root;
}

/**
 * A layer for [Virtual Point Clouds](https://github.com/PDAL/wrench/blob/main/vpc-spec.md) (VPC) datasets.
 * See {@link PointCloudLayer} class for documentation on base properties.
 *
 * @extends {PointCloudLayer}
 *
 * @property {boolean} isVpcLayer - Used to checkout whether this layer
 * is a VpcLayer. Default is `true`. You should not change this, as it is
 * used internally for optimisation.
 *
 *
 *
 * @example
 * // Create a new VPC layer
 * const vpcSource = new VpcSource({
 *     url: 'https://data.geopf.fr/chunk/telechargement/download/lidarhd_fxx_ept/vpc/index.vpc',
 * });
 *
 * const vpcLayer = new VpcLayer('VPC', {
 *     source: vpcSource,
 * });
 *
 * View.prototype.addLayer.call(view, vpcLayer);
 */
class VpcLayer extends PointCloudLayer {
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
        this.isVpcLayer = true;

        this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
        this.offset = new THREE.Vector3(0.0, 0.0, 0.0);

        const resolve = this.addInitializationStep();

        // a Vpc layer should be ready when all the child sources are
        this.whenReady = this.source.whenReady.then((/** @type {VpcSource} */ sources) => {
            this.setElevationRange();

            const boundsConforming = this.source.boundsConforming;
            this.root = new PointCloudNode(0);
            this.root.source = this.source;
            this.root.crs = this.crs;
            this.root.setOBBes(boundsConforming.slice(0, 3), boundsConforming.slice(3, 6));
            this.root.depth = 0;

            sources.forEach((source, i) => {
                const boundsConforming = source.boundsConforming;
                const mockRoot = {
                    voxelOBB: new OBB(),
                    clampOBB: new OBB(),
                    children: [],
                    waitingForSource: true,
                    source,
                    crs: this.crs,
                };
                PointCloudNode.prototype.setOBBes.call(mockRoot, boundsConforming.slice(0, 3), boundsConforming.slice(3, 6));

                // As we delayed the intanciation of the source to the moment we need to render a particular node,
                // we need to wait for the source to be instantiate to be able
                // to instantiate a node and load the Octree associated.
                const promise =
                    source.whenReady.then((src) => {
                        const root = _instantiateRootNode(src, this.crs);
                        this.root.children[i] = root;
                        return root.loadOctree().then(resolve)
                            .then(() => root);
                    });

                mockRoot.loadOctree = promise;
                // when load() is called on the mockRoot, we need the associated source to be loaded
                // as well as the octree, before calling load() on the real root.
                mockRoot.load = () => promise.then(root => root.load());
                this.root.children.push(mockRoot);
            });
            this.ready = true;
        });
    }

    loadData(elt, context, layer, bbox) {
        if (elt.waitingForSource) {
            layer.source.instantiate(elt.source);
            elt.loadOctree
                .then(eltLoaded => super.loadData(eltLoaded, context, layer, bbox))
                .then(() => context.view.notifyChange(layer));
        } else {
            return super.loadData(elt, context, layer, bbox);
        }
    }
}

export default VpcLayer;
