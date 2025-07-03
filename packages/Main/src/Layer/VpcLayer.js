import * as THREE from 'three';
import CopcNode from 'Core/CopcNode';
import PointCloudLayer from 'Layer/PointCloudLayer';

/**
 * A layer for [Cloud Optimised Point Cloud](https://copc.io) (COPC) datasets.
 * See {@link PointCloudLayer} class for documentation on base properties.
 *
 * @extends {PointCloudLayer}
 *
 * @example
 * // Create a new COPC layer
 * const copcSource = new CopcSource({
 *     url: 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz',
 *     crs: 'EPSG:4978',
 *     colorDepth: 16, // bit-depth of 'color' attribute (either 8 or 16 bits)
 * });
 *
 * const copcLayer = new CopcLayer('COPC', {
 *     source: copcSource,
 * });
 *
 * View.prototype.addLayer.call(view, copcLayer);
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

        this.root = [];
        this.spacing = [];

        const resolve = () => this;

        this.whenReady = this.source.whenReady.then((/** @type {CopcSource} */ sources) => {
            const loadOctrees = [];

            sources.forEach((src, i) => {
                this.minElevationRange = this.minElevationRange ?? src.header.min[2];
                this.maxElevationRange = this.maxElevationRange ?? src.header.max[2];

                this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
                this.offset = new THREE.Vector3(0.0, 0.0, 0.0);
                const { cube, rootHierarchyPage } = src.info;
                const { pageOffset, pageLength } = rootHierarchyPage;

                this.spacing.push(src.info.spacing);

                const root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, this, -1, i);
                root.bbox.min.fromArray(cube, 0);
                root.bbox.max.fromArray(cube, 3);
                this.root.push(root);

                loadOctrees.push(root.loadOctree().then(resolve));
            });

            return Promise.all(loadOctrees);
        });
    }

    preUpdate(context, changeSources) {
        // See https://cesiumjs.org/hosted-apps/massiveworlds/downloads/Ring/WorldScaleTerrainRendering.pptx
        // slide 17
        context.camera.preSSE =
            context.camera.height /
                (2 * Math.tan(THREE.MathUtils.degToRad(context.camera.camera3D.fov) * 0.5));

        if (this.material) {
            this.material.visible = this.visible;
            this.material.opacity = this.opacity;
            this.material.depthWrite = false;
            this.material.size = this.pointSize;
            this.material.scale = context.camera.preSSE;
            if (this.material.updateUniforms) {
                this.material.updateUniforms();
            }
        }

        // lookup lowest common ancestor of changeSources
        let commonAncestor;
        for (const source of changeSources.values()) {
            if (source.isCamera || source == this) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return this.root;
            }
            if (source.obj === undefined) {
                continue;
            }
            // filter sources that belong to our layer
            if (source.obj.isPoints && source.obj.layer == this) {
                if (!commonAncestor) {
                    commonAncestor = source;
                } else {
                    commonAncestor = source.findCommonAncestor(commonAncestor);

                    if (!commonAncestor) {
                        return [this.root];
                    }
                }
            }
        }

        if (commonAncestor) {
            return [commonAncestor];
        }

        // Start updating from hierarchy root
        return this.root;
    }
}

export default VpcLayer;
