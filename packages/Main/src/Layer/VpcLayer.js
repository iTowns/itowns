import * as THREE from 'three';
import PointCloudNode from 'Core/PointCloudNode';
import CopcNode from 'Core/CopcNode';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';

function _instantiateSubRoot(source, crs) {
    return source.whenReady.then((src) => {
        let root;
        let bounds;
        if (src.isCopcSource) {
            const { info } = src;
            const { pageOffset, pageLength } = info.rootHierarchyPage;
            bounds = info.cube;
            root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, src, -1, crs);
        } else if (src.isEntwinePointTileSource) {
            bounds = src.bounds;
            root = new EntwinePointTileNode(0, 0, 0, 0, src, -1, crs);
        } else {
            const msg = '[VPCLayer]: stack point cloud format not supporter';
            console.warn(msg);
            PointCloudLayer.handlingError(msg);
        }
        root.voxelOBB.setFromArray(bounds).projOBB(source.crs, crs);
        root.clampOBB.copy(root.voxelOBB).clampZ(src.zmin, src.zmax);
        return root;
    });
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

        // a Vpc layer should be ready when all the child sources are
        const prepSubSource = this.source.whenReady.then((/** @type {VpcSource} */ source) => {
            this.setElevationRange();

            const boundsConforming = this.source.boundsConforming;
            this.root = new PointCloudNode(0, 0);
            this.root.source = this.source;
            this.root.crs = this.crs;
            this.root.voxelOBB.setFromArray(boundsConforming).projOBB(this.source.crs, this.crs);
            this.root.clampOBB.copy(this.root.voxelOBB).clampZ(this.source.zmin, this.source.zmax);
            this.object3d.add(this.root.clampOBB);
            this.root.clampOBB.updateMatrixWorld(true);

            source.sources.forEach((src, i) => {
                const boundsConforming = src.boundsConforming;

                // As we delayed the intanciation of the source to the moment we need to render a particular node,
                // we need to wait for the source to be instantiate to be able
                // to instantiate a node and load the Octree associated.
                // todo:  factorize _instantiateSubRoot in each source
                const promisedRoot = _instantiateSubRoot(src, this.crs);

                promisedRoot.then((r) => {
                    r.parent = this.root;
                    this.object3d.add(r.clampOBB);
                    r.clampOBB.updateMatrixWorld(true);
                    this.root.children[i] = r;
                });

                const mockSubRoot = new PointCloudNode(0, 0);
                mockSubRoot.source = src;
                mockSubRoot.crs = this.crs;
                mockSubRoot.loadOctree = promisedRoot.then(root => root.loadOctree());
                // when load() is called on the mockSubRoot, we need the associated source to be loaded
                // as well as the octree, before calling load() on the real root.
                mockSubRoot.load = promisedRoot.then(root => root.load);

                mockSubRoot.voxelOBB.setFromArray(boundsConforming).projOBB(source.crs, this.crs);
                mockSubRoot.clampOBB.copy(mockSubRoot.voxelOBB).clampZ(source.zmin, source.zmax);
                this.object3d.add(mockSubRoot.clampOBB);
                mockSubRoot.clampOBB.updateMatrixWorld(true);

                mockSubRoot.parent = this.root;
                this.root.children[i] = mockSubRoot;
            });

            this._promises.push(prepSubSource);
        });
    }

    loadData(elt, context, layer, bbox) {
        if (elt.source.isSource) {
            return super.loadData(elt, context, layer, bbox);
        }

        // elt is a mockSubRoot (its source is a mockSource)
        if (elt.source.instantiation === false) {
            elt.source.instantiation = true;
            const cmd = {
                layer,
                callback: {
                    executeCommand: () => elt.source.instantiate().whenReady,
                },
                view: context.view,
            };
            context.scheduler.execute(cmd);

            elt.loadOctree
                .then(() => {
                    // after the octree is loaded we need to recall update
                    context.view.notifyChange(layer);
                });
        }
    }
}

export default VpcLayer;
