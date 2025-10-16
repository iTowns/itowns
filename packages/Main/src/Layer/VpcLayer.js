import * as THREE from 'three';
import PointCloudNode from 'Core/PointCloudNode';
import CopcNode from 'Core/CopcNode';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import PointCloudLayer from 'Layer/PointCloudLayer';

function markForDeletion(elt) {
    if (elt.obj) {
        elt.obj.visible = false;
        if (__DEBUG__) {
            if (elt.obj.boxHelper) {
                elt.obj.boxHelper.visible = false;
            }
        }
    }

    if (!elt.notVisibleSince) {
        elt.notVisibleSince = Date.now();
        // Set .sse to an invalid value
        elt.sse = -1;
    }
    for (const child of elt.children) {
        markForDeletion(child);
    }
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

        this.whenReady = this.source.whenReady.then((/** @type {VpcSource} */ sources) => {
            this.minElevationRange = this.minElevationRange ?? this.source.minElevation;
            this.maxElevationRange = this.maxElevationRange ?? this.source.maxElevation;

            const boundsConforming = this.source.boundsConforming;
            this.root = new PointCloudNode(0, this.source);
            this.root.bbox.min.fromArray(boundsConforming, 0);
            this.root.bbox.max.fromArray(boundsConforming, 3);
            this.root.depth = 0;

            sources.forEach((source, i) => {
                const boundsConforming = source.boundsConforming;
                const bbox = new THREE.Box3().setFromArray(boundsConforming);
                const root = {
                    bbox,
                    children: [],
                    waitingForSource: true,
                    source,
                };
                let secondaryRoot;
                const promise =
                    this.source.sources[i].whenReady.then((src) => {
                        if (this.source.sources[i].isCopcSource) {
                            const { info } = src;
                            const { pageOffset, pageLength } = info.rootHierarchyPage;
                            secondaryRoot = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, src, -1);
                            secondaryRoot.bbox.min.fromArray(info.cube, 0);
                            secondaryRoot.bbox.max.fromArray(info.cube, 3);
                        } else {
                            secondaryRoot = new EntwinePointTileNode(0, 0, 0, 0, src, -1);
                            secondaryRoot.bbox.min.fromArray(src.boundsConforming, 0);
                            secondaryRoot.bbox.max.fromArray(src.boundsConforming, 3);
                        }
                        this.root.children[i] = secondaryRoot;
                        return secondaryRoot.loadOctree().then(resolve)
                            .then(() => secondaryRoot);
                    });

                root.loadOctree = promise;

                root.load = () => promise.then(() => this.root.children[i].load());
                this.root.children.push(root);
            });
            this.ready = true;
        });
    }

    update(context, layer, elt) {
        elt.visible = false;

        if (this.octreeDepthLimit >= 0 && this.octreeDepthLimit < elt.depth) {
            markForDeletion(elt);
            return [];
        }

        // pick the best bounding box
        const bbox = (elt.tightbbox ? elt.tightbbox : elt.bbox);
        elt.visible = context.camera.isBox3Visible(bbox, this.object3d.matrixWorld);
        if (!elt.visible) {
            markForDeletion(elt);
            return [];
        }

        if (elt.waitingForSource) {
            layer.source.instanciate(elt.source);
            elt.loadOctree
                .then(eltLoaded => this.loadData(eltLoaded, context, layer, bbox));
        } else {
            return this.loadData(elt, context, layer, bbox);
        }
    }
}

export default VpcLayer;
