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
        this.roots = [];
        this.spacing = [];
        this.scale = new THREE.Vector3(1.0, 1.0, 1.0);
        this.offset = new THREE.Vector3(0.0, 0.0, 0.0);

        const minElevationRanges = [];
        const maxElevationRanges = [];

        const resolve = this.addInitializationStep();

        this.whenReady = this.source.whenReady.then((/** @type {CopcSource} */ sources) => {
            const promisesAll = [];

            sources.forEach((source, i) => {
                const promise =
                    source.whenReady.then((src) => {
                        minElevationRanges.push(src.header.min[2]);
                        maxElevationRanges.push(src.header.max[2]);

                        const { cube, rootHierarchyPage } = src.info;
                        const { pageOffset, pageLength } = rootHierarchyPage;

                        this.spacing.push(src.info.spacing);

                        const root = new CopcNode(0, 0, 0, 0, pageOffset, pageLength, this, -1, i);
                        root.bbox.min.fromArray(cube, 0);
                        root.bbox.max.fromArray(cube, 3);
                        this.roots.push(root);

                        return root.loadOctree().then(resolve);
                    });
                promisesAll.push(promise);
            });

            return Promise.all(promisesAll).then(() => {
                this.minElevationRange = this.minElevationRange ?? Math.min(...minElevationRanges);
                this.maxElevationRange = this.maxElevationRange ?? Math.max(...maxElevationRanges);
            });
        });
    }

    // get spacing() {
    //     console.log(this.source);
    //     return this.source.info.spacing;
    // }

    preUpdate(context, changeSources) {
        // See https://cesiumjs.org/hosted-apps/massiveworlds/downloads/Ring/WorldScaleTerrainRendering.pptx
        // slide 17
        context.camera.preSSE =
            context.camera.height /
                (2 * Math.tan(THREE.MathUtils.degToRad(context.camera.camera3D.fov) * 0.5));

        if (this.material) {
            this.material.visible = this.visible;
            this.material.opacity = this.opacity;
            this.material.transparent = this.opacity < 1 || this.material.userData.needTransparency[this.material.mode];
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
                return this.roots;
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
                        console.log('preUpdate !commonAncestor');
                        return this.roots;
                    }
                }
            }
        }

        if (commonAncestor) {
            console.log('preUpdate commonAncestor');
            return [commonAncestor];
        }

        // Start updating from hierarchy root
        return this.roots;
    }
}

export default VpcLayer;
