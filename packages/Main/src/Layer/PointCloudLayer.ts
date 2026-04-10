import * as THREE from 'three';
import TinyQueue from 'tinyqueue';
import GeometryLayer from 'Layer/GeometryLayer';
import PointsMaterial, { PNTS_MODE, PNTS_SIZE_MODE } from 'Renderer/PointsMaterial';
import Picking from 'Core/Picking';

import type PointCloudNode from 'Core/PointCloudNode';

const point = new THREE.Vector3();

export interface PointCloudSource {
    /** The minimal value for elevation (read from the metadata). */
    zmin: number;
    /** The maximal value for elevation (read from the metadata). */
    zmax: number;
}

export interface PointCloudLayerParameters {
    /** Description and options of the source. @see {@link Layer}. */
    source: PointCloudSource;
    object3d?: THREE.Group;
    group?: THREE.Group;
    octreeDepthLimit?: number;
    pointBudget?: number;
    pointSize?: number;
    sseThreshold?: number;
    /** The minimal intensity of the
     * layer. Changing this value will affect the material, if it has the
     * corresponding uniform. The value is normalized between 0 and 1. */
    minIntensityRange?: number;
    /** The maximal intensity of the
     * layer. Changing this value will affect the material, if it has the
     * corresponding uniform. The value is normalized between 0 and 1. */
    maxIntensityRange?: number;
    /** Min value for the elevation range
     * (default value taken from the source.metadata). */
    minElevationRange?: number;
    /** Max value for the elevation range
     * (default value taken from the source.metadata). */
    maxElevationRange?: number;
    minAngleRange?: number;
    maxAngleRange?: number;
    material?: THREE.Material;
    /** The displaying mode of the points.
    * Values are specified in `PointsMaterial`. */
    mode?: number;
}

interface Context {
    camera: {
        camera3D: THREE.PerspectiveCamera;
        preSSE: number;
        width: number;
        height: number;
        isBox3Visible: (bbox: THREE.Box3, matrixWorld: THREE.Matrix4) => boolean;
    };
    scheduler: {
        execute: (command: {
            layer: PointCloudLayer;
            requester: PointCloudNode;
            view: object;
            priority: number;
            redraw: boolean;
            earlyDropFunction?: (cmd: { requester: PointCloudNode }) => boolean;
        }) => Promise<THREE.Points>;
    };
    view: {
        notifyChange: (elt: PointCloudLayer) => void;
    };
}

function computeSSEPerspective(
    context: Context,
    pointSize: number,
    pointSpacing: number,
    distance: number,
) {
    if (distance <= 0) {
        return Infinity;
    }
    // Estimate the onscreen distance between 2 points
    const onScreenSpacing = context.camera.preSSE * pointSpacing / distance;
    // [  P1  ]--------------[   P2   ]
    //     <--------------------->      = pointsSpacing (in world coordinates)
    //                                  ~ onScreenSpacing (in pixels)
    // <------>                         = pointSize (in pixels)
    return Math.max(0.0, onScreenSpacing - pointSize);
}

function computeSSEOrthographic(
    context: Context,
    pointSize: number,
    pointSpacing: number,
) {
    // Given an identity view matrix, project pointSpacing from world space to
    // clip space. v' = vVP = vP
    const v = new THREE.Vector4(pointSpacing);
    v.applyMatrix4(context.camera.camera3D.projectionMatrix);

    // We map v' to the screen space and calculate the distance to the origin.
    const dx = v.x * 0.5 * context.camera.width;
    const dy = v.y * 0.5 * context.camera.height;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return Math.max(0.0, distance - pointSize);
}

function computeScreenSpaceError(
    context: Context,
    pointSize: number,
    pointSpacing: number,
    distance: number,
) {
    if (context.camera.camera3D instanceof THREE.OrthographicCamera) {
        return computeSSEOrthographic(context, pointSize, pointSpacing);
    }

    return computeSSEPerspective(context, pointSize, pointSpacing, distance);
}

function markForDeletion(elt: PointCloudNode) {
    elt.visible = false;
    if (elt.obj) {
        elt.obj.visible = false;
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

function changeIntensityRange(layer: PointCloudLayer) {
    // @ts-expect-error PointsMaterial is not typed yet
    layer.material.intensityRange?.set(layer.minIntensityRange, layer.maxIntensityRange);
}

function changeElevationRange(layer: PointCloudLayer) {
    // @ts-expect-error PointsMaterial is not typed yet
    layer.material.elevationRange?.set(layer.minElevationRange, layer.maxElevationRange);
}

function changeAngleRange(layer: PointCloudLayer) {
    // @ts-expect-error PointsMaterial is not typed yet
    layer.material.angleRange?.set(layer.minAngleRange, layer.maxAngleRange);
}

abstract class PointCloudLayer<S extends PointCloudSource = PointCloudSource>
    extends GeometryLayer {
    /**
     * Read-only flag to assert that a given object is of type PointCloudLayer.
     * Used internally for optimisation.
     */
    readonly isPointCloudLayer: true;

    /** Used internally for scheduling tasks. */
    readonly protocol: 'pointcloud';

    // @ts-expect-error Source is not typed yet
    source: S;

    /**
     * Container group for the points.
     * Add this to the three.js scene in order to render it.
     */
    readonly group: THREE.Group;

    /**
     * Container group for the oriented points bounding boxes.
     * Add this to the three.js scene in order to render it.
     */
    readonly obbes: THREE.Group;

    /**
     * Maximum depth to which points will be loaded and rendered.
     * Setting it to 1 will only render the root node.
     * Default to `Infinity`.
     */
    octreeDepthLimit: number;

    /**
     * Maximum number of points to display at the same time.
     * Defaults to 2 millions points.
     */
    pointBudget: number;

    /**
     * Size of the points (in pixels) rendered on the screen.
     * In attenuated point size mode, this value is used as basis for the
     * attenuation.
     * Defaults to 2 pixels.
     */
    pointSize: number;

    /**
     * Screen space error (in pixels) to target when updating the geometry.
     * Points below this threshold will not rendered.
     * Defaults to 2 pixels.
     */
    sseThreshold: number;

    /** Minimal intensity value of the layer. */
    minIntensityRange!: number;
    /** Maximal intensity value of the layer. */
    maxIntensityRange!: number;
    /** Minimal elevation value of the layer. */
    minElevationRange!: number;
    /** Maximal elevation value of the layer. */
    maxElevationRange!: number;
    /** Minimal angle value of the layer. */
    minAngleRange!: number;
    /** Maximal angle value of the layer. */
    maxAngleRange!: number;

    /** Number of points displayed in the last update. */
    displayedCount: number;

    /** Root node of the point cloud tree. */
    root: PointCloudNode | undefined;

    /** The material to use to display the points of the cloud.
     * Be default it is a new `PointsMaterial`. */
    material: THREE.PointsMaterial;

    private _candidateNodes: TinyQueue<PointCloudNode>;
    private _visibleNodes: Set<PointCloudNode> = new Set();
    private _visibilityTextureNeedsUpdate: boolean = true;
    private _visibilityTextureData: { data: Uint8Array; offsets: Map<string, number> } | undefined;

    /**
     * Constructs a new instance of point cloud layer.
     * Constructs a new instance of a Point Cloud Layer. This should not be used
     * directly, but rather implemented using `extends`.
     *
     * @param id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param config - Optional configuration, all elements in it
     * will be merged as is in the layer. For example, if the configuration
     * contains three elements `name, protocol, extent`, these elements will be
     * available using `layer.name` or something else depending on the property
     * name. See the list of properties to know which one can be specified.
     */
    constructor(id: string, config: PointCloudLayerParameters) {
        const {
            object3d = new THREE.Group(),
            group = new THREE.Group(),
            octreeDepthLimit = -1,
            pointBudget = 2000000,
            pointSize = 2,
            sseThreshold = 2,
            minIntensityRange = 1,
            maxIntensityRange = 65536,
            minElevationRange,
            maxElevationRange,
            minAngleRange = -90,
            maxAngleRange = 90,
            material = {},
            mode = PNTS_MODE.COLOR,
            ...geometryLayerConfig
        } = config;

        super(id, object3d, geometryLayerConfig);

        this.isPointCloudLayer = true;
        this.protocol = 'pointcloud';

        this.group = group;
        this.group.name = 'points';
        this.object3d.add(this.group);

        this.obbes = new THREE.Group();
        this.obbes.name = 'obbes';
        this.obbes.visible = false;
        this.object3d.add(this.obbes);

        this.group.updateMatrixWorld();

        this.octreeDepthLimit = octreeDepthLimit;
        this.pointBudget = pointBudget;
        this.pointSize = pointSize;
        this.sseThreshold = sseThreshold;

        this.defineLayerProperty('minIntensityRange', minIntensityRange, changeIntensityRange);
        this.defineLayerProperty('maxIntensityRange', maxIntensityRange, changeIntensityRange);
        this.defineLayerProperty('minElevationRange', minElevationRange, changeElevationRange);
        this.defineLayerProperty('maxElevationRange', maxElevationRange, changeElevationRange);
        this.defineLayerProperty('minAngleRange', minAngleRange, changeAngleRange);
        this.defineLayerProperty('maxAngleRange', maxAngleRange, changeAngleRange);

        // @ts-expect-error PointsMaterial is not typed yet
        this.material = material;
        if (!this.material.isMaterial) {
            // @ts-expect-error PointsMaterial is not typed yet
            this.material.intensityRange =
                new THREE.Vector2(this.minIntensityRange, this.maxIntensityRange);
            // @ts-expect-error PointsMaterial is not typed yet
            this.material.elevationRange =
                new THREE.Vector2(this.minElevationRange, this.maxElevationRange);
            // @ts-expect-error PointsMaterial is not typed yet
            this.material.angleRange = new THREE.Vector2(this.minAngleRange, this.maxAngleRange);
            // @ts-expect-error PointsMaterial is not typed yet
            this.material = new PointsMaterial(this.material);
        }

        // @ts-expect-error PointsMaterial is not typed yet
        this.material.mode = mode || PNTS_MODE.COLOR;

        this.root = undefined;

        this.displayedCount = 0;

        this._candidateNodes = new TinyQueue<PointCloudNode>([], (a, b) => b.sse - a.sse);
    }

    setElevationRange() {
        this.minElevationRange = this.minElevationRange ?? this.source.zmin;
        this.maxElevationRange = this.maxElevationRange ?? this.source.zmax;
    }

    setNodeVisible(node: PointCloudNode, visible: boolean) {
        this.dispatchEvent({
            type: 'node-visibility-change',
            tile: node,
            visible,
        });
        node.visible = visible;
        this._visibilityTextureNeedsUpdate = true;
    }

    preUpdate(context: Context) {
        this._candidateNodes = new TinyQueue<PointCloudNode>([], (a, b) => b.sse - a.sse);

        // See https://cesiumjs.org/hosted-apps/massiveworlds/downloads/Ring/WorldScaleTerrainRendering.pptx
        // slide 17
        context.camera.preSSE =
            context.camera.height /
            (2 * Math.tan(THREE.MathUtils.degToRad(context.camera.camera3D.fov) * 0.5));

        if (this.material) {
            this.material.visible = this.visible;
            this.material.opacity = this.opacity;
            this.material.size = this.pointSize;
            // @ts-expect-error PointsMaterial is not typed yet
            this.material.scale = context.camera.preSSE;
            // @ts-expect-error PointsMaterial is not typed yet
            if (this.material.updateUniforms) {
                // @ts-expect-error PointsMaterial is not typed yet
                this.material.updateUniforms();
            }
        }

        // Start updating from hierarchy root
        return [this.root];
    }

    /**
     * Load the data of a node.
     * Send a promise to get the data (if not already sent)
     * and add the result to the node when resolve.
     * Check the visiblility of children to see if the need to be updated
     * as well.
     *
     * @param elt - The element (node) to load data.
     * @param context - The context.
     * @param layer - The layer on wich the node is attach.
     * @param distanceToCamera - The distance between the camera and the node.
     *
     * @returns The child nodes to update or [].
     */
    loadData(
        elt: PointCloudNode, context: Context, layer: this, distanceToCamera: number,
    ): void {
        // only load geometry if this elements has points
        if (elt.numPoints !== 0) {
            if (!elt.obj && !elt.promise) {
                const distance = Math.max(0.001, distanceToCamera);
                // Increase priority of greatest node on screen
                const priority = computeScreenSpaceError(
                    context,
                    layer.pointSize,
                    elt.pointSpacing,
                    distance,
                );
                elt.promise = context.scheduler.execute({
                    layer,
                    requester: elt,
                    view: context.view,
                    priority,
                    redraw: true,
                    earlyDropFunction: cmd => !cmd.requester.visible || !this.visible,
                }).then((pts: THREE.Points) => {
                    elt.obj = pts;
                    elt.obj.visible = false;

                    // make sure to add it here, otherwise it might never
                    // be added nor cleaned
                    this.group.add(elt.obj);
                    elt.obj.updateMatrixWorld(true);
                    elt.obj.matrixWorldInverse = elt.obj.matrixWorld.clone().invert();
                    context.view.notifyChange(this);
                    this.dispatchEvent({ type: 'load-model', scene: pts, tile: elt });
                }).catch((err: { isCancelledCommandException: boolean }) => {
                    this.dispatchEvent({ type: 'load-error', tile: elt, error: err });
                    if (!err.isCancelledCommandException) {
                        return err;
                    }
                }).finally(() => {
                    elt.promise = null;
                });
            }
        }
    }

    /**
     * Check if the node need to be rendered. In that case it call the
     * node.loadData() on it.
     *
     * @param context - The context.
     * @param layer - The layer on wich the node is attach.
     * @param elt - The element (node) to render.
     *
     * @returns The child nodes to update or [] if there is none.
     */
    update(context: Context, layer: this, elt: PointCloudNode): PointCloudNode[] {
        if (this.octreeDepthLimit >= 0 && this.octreeDepthLimit < elt.depth) {
            markForDeletion(elt);
            return [];
        }

        // get object on which to measure distance
        let bbox;
        let object3d;
        if (elt.obj) {
            object3d = elt.obj;
            bbox = object3d.geometry.boundingBox as THREE.Box3;
        } else {
            object3d = elt.clampOBB;
            bbox = object3d.box3D;
            if (!object3d.parent) {
                this.obbes.add(object3d);
                object3d.updateMatrixWorld(true);
            }
        }

        const visible = context.camera.isBox3Visible(bbox, object3d.matrixWorld);

        if (!visible) {
            markForDeletion(elt);
            return [];
        }

        point.copy(context.camera.camera3D.position)
            .applyMatrix4(object3d.matrixWorldInverse as THREE.Matrix4);

        const distanceToCamera = bbox.distanceToPoint(point);

        elt.sse = computeScreenSpaceError(
            context,
            layer.pointSize,
            elt.pointSpacing,
            distanceToCamera,
        ) / this.sseThreshold;

        // The visibility here is not definitive, as it will be updated
        // in the postUpdate phase
        elt.visible = visible;
        elt.notVisibleSince = undefined;
        this._candidateNodes.push(elt);
        this.loadData(elt, context, layer, distanceToCamera);

        if (elt.children && elt.children.length) {
            if (elt.sse >= 1) {
                return elt.children;
            } else {
                for (const child of elt.children) {
                    markForDeletion(child);
                }
                return [];
            }
        }

        return [];
    }

    postUpdate() {
        const visibleLastUpdate = this._visibleNodes;
        this._visibleNodes = new Set();
        this.displayedCount = 0;

        // Push visible nodes until the point budget is reached
        while (this._candidateNodes.length > 0) {
            const node = this._candidateNodes.pop() as PointCloudNode;
            if (this.displayedCount + node.numPoints > this.pointBudget) {
                this._candidateNodes.push(node);
                break;
            }
            this.displayedCount += node.numPoints;
            this._visibleNodes.add(node);
            node.visible = true;
            if (node.obj) { node.obj.visible = true; }
            if (!visibleLastUpdate.has(node)) {
                this.setNodeVisible(node, true);
            }
        }

        const nonVisibleNodes = new Set<PointCloudNode>();
        // Hide remaining visible nodes that didn't fit in the budget
        while (this._candidateNodes.length > 0) {
            const node = this._candidateNodes.pop() as PointCloudNode;
            node.visible = false;
            if (node.obj) { node.obj.visible = false; }
            nonVisibleNodes.add(node);
        }

        // Set symmetric difference between visible nodes from last
        // update and current update. Unfortunatelly the standard operation
        // is only available on browsers baseline since june 2024.
        for (const n of visibleLastUpdate) {
            if (!this._visibleNodes.has(n)) {
                this.setNodeVisible(n, false);
            }
        }

        // Garbage-collect geometry of invisible nodes that have been hidden for
        // more than 10 seconds
        const now = Date.now();
        for (let i = this.group.children.length - 1; i >= 0; i--) {
            const obj = this.group.children[i] as THREE.Points;
            if (!obj.visible && (now - obj.userData.node.notVisibleSince > 10000)) {
                this.group.remove(obj);
                obj.geometry.dispose();
                obj.userData.node.obj = null;
                this.dispatchEvent({ type: 'dispose-model', scene: obj, tile: obj.userData.node });
            }
        }

        // @ts-expect-error PointsMaterial is not typed yet
        if (this.material.sizeMode === PNTS_SIZE_MODE.ADAPTIVE) {
            if (this._visibilityTextureNeedsUpdate) {
                this._visibilityTextureData =
                    this.computeVisibilityTextureData(Array.from(this._visibleNodes));
                this._visibilityTextureNeedsUpdate = false;
            }

            if (this._visibilityTextureData === undefined) {
                return;
            }

            // @ts-expect-error PointsMaterial is not typed yet
            const vnt = this.material.visibleNodes;
            const data = vnt.image.data;
            data.set(this._visibilityTextureData.data);
            vnt.needsUpdate = true;

            // Use natBox (native octree space) for octreeSize, as the
            // octree hierarchy is defined in the source CRS coordinate system
            const rootSize = this.root!.voxelOBB.natBox.getSize(new THREE.Vector3());
            const octreeSize = Math.max(rootSize.x, rootSize.y, rootSize.z);

            for (const pts of this.group.children) {
                const node = pts.userData.node;
                const depth = node.depth;
                const nodeStartOffset = this._visibilityTextureData.offsets.get(node.voxelKey);
                const octreeSpacing = node.source.spacing;

                // Compute the bounding box min of the node's octree cell
                // in the local space of the THREE.Points geometry.
                // We must use voxelOBB.natBox.min (the octree cell boundary
                // in source CRS) rather than geomBBox.min (which only covers
                // the actual points, not the full octree cell).
                const natMin = node.voxelOBB.natBox.min;
                const origin = node.obj.position;
                const bboxMin = new THREE.Vector3(
                    natMin.x - origin.x,
                    natMin.y - origin.y,
                    natMin.z - origin.z,
                );

                pts.onBeforeRender = (_renderer, _scene, _camera, _geometry, material) => {
                    // @ts-expect-error Material is not typed yet
                    material.uniforms.nodeStartOffset.value = nodeStartOffset;
                    // @ts-expect-error Material is not typed yet
                    material.uniforms.octreeSize.value = octreeSize;
                    // @ts-expect-error Material is not typed yet
                    material.uniforms.octreeSpacing.value = octreeSpacing;
                    // @ts-expect-error Material is not typed yet
                    material.uniforms.nodeDepth.value = depth;
                    // @ts-expect-error Material is not typed yet
                    material.uniforms.nodeBBoxMin.value.copy(bboxMin);
                    // @ts-expect-error Material is not typed yet
                    material.uniformsNeedUpdate = true;
                };
            }
        }
        this.dispatchEvent({ type: 'post-update' });
    }

    // @ts-expect-error Layer and Picking are not typed yet
    pickObjectsAt(view, mouse, radius, target = []) {
        return Picking.pickPointsAt(view, mouse, radius, this, target);
    }

    // @ts-expect-error Layer is not typed yet
    getObjectToUpdateForAttachedLayers(meta) {
        if (meta.obj) {
            const p = meta.parent;
            if (p && p.obj) {
                return {
                    elements: [meta.obj],
                    parent: p.obj,
                };
            } else {
                return {
                    elements: [meta.obj],
                };
            }
        }
    }

    // Encoding the octree hierarchy in breadth-first order
    // into a texture for adaptive point size rendering
    // Explanation p36: https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf
    computeVisibilityTextureData(nodes: PointCloudNode[]) {
        // sort by level and hierarchy order
        const sort = function sortNodes(a: PointCloudNode, b: PointCloudNode) {
            if (a.depth !== b.depth) { return a.depth - b.depth; }
            // @ts-expect-error PointCloudNode has x properties
            if (a.x !== b.x) { return a.x - b.x; }
            // @ts-expect-error PointCloudNode has y properties
            if (a.y !== b.y) { return a.y - b.y; }
            // @ts-expect-error PointCloudNode has z properties
            return a.z - b.z;
        };
        // breadth-first order
        const orderedNodes = nodes.toSorted(sort);

        const data = new Uint8Array(orderedNodes.length * 4);
        const visibleNodeTextureOffsets = new Map<string, number>();
        const offsetsToChild: number[] = new Array(orderedNodes.length).fill(Infinity);

        // Helper function to get octree child index from node
        const getChildIndex = (node: PointCloudNode): number => {
            if (!node.parent) {
                return 0;
            }
            const parent = node.parent;
            // @ts-expect-error PointCloudNode has x properties
            const dx = node.x - parent.x * 2;
            // @ts-expect-error PointCloudNode has y properties
            const dy = node.y - parent.y * 2;
            // @ts-expect-error PointCloudNode has z properties
            const dz = node.z - parent.z * 2;
            // Octree child index (Potree convention): 4*x + 2*y + z
            return 4 * dx + 2 * dy + dz;
        };

        for (let nodeIndex = 0; nodeIndex < orderedNodes.length; nodeIndex++) {
            const node = orderedNodes[nodeIndex];
            // @ts-expect-error PointCloudNode has voxelKey properties
            visibleNodeTextureOffsets.set(node.voxelKey, nodeIndex);

            if (node.parent) {
                const childIndex = getChildIndex(node);
                // @ts-expect-error PointCloudNode has voxelKey properties
                const parentIndex = visibleNodeTextureOffsets.get(node.parent.voxelKey);

                if (parentIndex === undefined) {
                    continue;
                }

                const parentOffsetToChild = nodeIndex - parentIndex;
                const offsetToFirstChild =
                    Math.min(offsetsToChild[parentIndex], parentOffsetToChild);
                offsetsToChild[parentIndex] = offsetToFirstChild;

                // The 8 bits of the red value indicate
                // which of the children are visible
                data[parentIndex * 4] = data[parentIndex * 4] | (1 << childIndex);
                // Offset to child is stored on 2 bytes,
                // so it can support up to 65536 nodes per subtree.
                // The green channel contains the relative offset
                // to the node’s first child (8 most significant bits)
                data[parentIndex * 4 + 1] = offsetToFirstChild >> 8;
                // The blue channel contains the relative offset
                // to the node’s first child (8 least significant bits)
                data[parentIndex * 4 + 2] = offsetToFirstChild % 256;
            }
        }

        return {
            data,
            offsets: visibleNodeTextureOffsets,
        };
    }
}

export default PointCloudLayer;
