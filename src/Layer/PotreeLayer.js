import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import PointsMaterial, { MODE } from 'Renderer/PointsMaterial';
import Picking from 'Core/Picking';
import PotreeNode from 'Core/PotreeNode';
import Extent from 'Core/Geographic/Extent';
import CancelledCommandException from 'Core/Scheduler/CancelledCommandException';

const point = new THREE.Vector3();
const bboxMesh = new THREE.Mesh();
const box3 = new THREE.Box3();
bboxMesh.geometry.boundingBox = box3;

function initBoundingBox(elt, layer) {
    elt.tightbbox.getSize(box3.max);
    box3.max.multiplyScalar(0.5);
    box3.min.copy(box3.max).negate();
    elt.obj.boxHelper = new THREE.BoxHelper(bboxMesh);
    elt.obj.boxHelper.geometry = new THREE.Geometry().fromBufferGeometry(elt.obj.boxHelper.geometry.toNonIndexed());
    elt.obj.boxHelper.computeLineDistances();
    elt.obj.boxHelper.material = elt.childrenBitField ? new THREE.LineDashedMaterial({ dashSize: 0.25, gapSize: 0.25 }) : new THREE.LineBasicMaterial();
    elt.obj.boxHelper.material.color.setHex(0);
    elt.obj.boxHelper.material.linewidth = 2;
    elt.obj.boxHelper.frustumCulled = false;
    elt.obj.boxHelper.position.copy(elt.tightbbox.min).add(box3.max);
    elt.obj.boxHelper.autoUpdateMatrix = false;
    elt.obj.boxHelper.layers.mask = layer.bboxes.layers.mask;
    layer.bboxes.add(elt.obj.boxHelper);
    elt.obj.boxHelper.updateMatrix();
    elt.obj.boxHelper.updateMatrixWorld();
}

function computeScreenSpaceError(context, pointSize, spacing, elt, distance) {
    if (distance <= 0) {
        return Infinity;
    }
    const pointSpacing = spacing / 2 ** elt.name.length;
    // Estimate the onscreen distance between 2 points
    const onScreenSpacing = context.camera.preSSE * pointSpacing / distance;
    // [  P1  ]--------------[   P2   ]
    //     <--------------------->      = pointsSpacing (in world coordinates)
    //                                  ~ onScreenSpacing (in pixels)
    // <------>                         = pointSize (in pixels)
    return Math.max(0.0, onScreenSpacing - pointSize);
}

function markForDeletion(elt) {
    if (elt.obj) {
        elt.obj.material.visible = false;
        if (__DEBUG__) {
            if (elt.obj.boxHelper) {
                elt.obj.boxHelper.material.visible = false;
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

class PotreeLayer extends GeometryLayer {
    /**
     * Constructs a new instance of point cloud layer.
     * @constructor
     * @extends GeometryLayer
     *
     * @example
     * // Create a new point cloud layer
     * const points = new PotreeLayer('points',
     *  {
     *      source: new PotreeLayer({
     *          url: 'https://pointsClouds/',
     *          file: 'points.js',
     *      }
     *  }, view);
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param      {string}  id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param      {object}  config   configuration, all elements in it
     * will be merged as is in the layer.
     * @param {number} [config.pointBudget=2000000] max displayed points count.
     * @param {PotreeSource} config.source - Description and options of the source.
     * @param {number} [config.sseThreshold=2] screen space error Threshold.
     * @param {number} [config.pointSize=4] point size.
     * @param {THREE.Material} [config.material] override material.
     * @param {number} [config.mode=MODE.COLOR] displaying mode.
     *
     * @param  {View}  view  The view
     */
    constructor(id, config, view) {
        super(id, new THREE.Group(), config);
        this.isPotreeLayer = true;
        this.protocol = 'potreeconverter';

        this.group = config.group || new THREE.Group();
        this.object3d.add(this.group);
        this.bboxes = config.bboxes || new THREE.Group();
        this.bboxes.visible = false;
        this.object3d.add(this.bboxes);
        this.group.updateMatrixWorld();

        // default config
        this.octreeDepthLimit = config.octreeDepthLimit || -1;
        this.pointBudget = config.pointBudget || 2000000;
        this.pointSize = config.pointSize === 0 || !isNaN(config.pointSize) ? config.pointSize : 4;
        this.sseThreshold = config.sseThreshold || 2;
        this.material = config.material || {};
        this.material = this.material.isMaterial ? config.material : new PointsMaterial(config.material);
        this.material.defines = this.material.defines || {};
        this.mode = MODE.COLOR || config.mode;

        const resolve = this.addInitializationStep();

        this.source.whenReady.then((cloud) => {
            this.scale = new THREE.Vector3().addScalar(cloud.scale);
            this.spacing = cloud.spacing;
            this.hierarchyStepSize = cloud.hierarchyStepSize;

            const normal = Array.isArray(cloud.pointAttributes) &&
                        cloud.pointAttributes.find(elem => elem.startsWith('NORMAL'));
            if (normal) {
                this.material.defines[normal] = 1;
            }

            this.supportsProgressiveDisplay = (this.source.extention === 'cin');

            this.root = new PotreeNode(0, 0, this);
            this.root.bbox.min.set(cloud.boundingBox.lx, cloud.boundingBox.ly, cloud.boundingBox.lz);
            this.root.bbox.max.set(cloud.boundingBox.ux, cloud.boundingBox.uy, cloud.boundingBox.uz);

            this.extent = Extent.fromBox3(view.referenceCrs, this.root.bbox);
            return this.root.loadOctree().then(resolve);
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
            this.material.transparent = this.opacity < 1;
            this.material.size = this.pointSize;
        }

        // lookup lowest common ancestor of changeSources
        let commonAncestorName;
        for (const source of changeSources.values()) {
            if (source.isCamera || source == this) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return [this.root];
            }
            if (source.obj === undefined) {
                continue;
            }
            // filter sources that belong to our layer
            if (source.obj.isPoints && source.obj.layer == this) {
                if (!commonAncestorName) {
                    commonAncestorName = source.name;
                } else {
                    let i;
                    for (i = 0; i < Math.min(source.name.length, commonAncestorName.length); i++) {
                        if (source.name[i] != commonAncestorName[i]) {
                            break;
                        }
                    }
                    commonAncestorName = commonAncestorName.substr(0, i);
                    if (commonAncestorName.length == 0) {
                        break;
                    }
                }
            }
        }

        if (commonAncestorName) {
            return [this.root.getChildByName(commonAncestorName)];
        }

        // Start updating from hierarchy root
        return [this.root];
    }

    update(context, layer, elt) {
        elt.visible = false;

        if (this.octreeDepthLimit >= 0 && this.octreeDepthLimit < elt.name.length) {
            markForDeletion(elt);
            return;
        }

        // pick the best bounding box
        const bbox = (elt.tightbbox ? elt.tightbbox : elt.bbox);
        elt.visible = context.camera.isBox3Visible(bbox, this.object3d.matrixWorld);
        if (!elt.visible) {
            markForDeletion(elt);
            return;
        }

        elt.notVisibleSince = undefined;
        point.copy(context.camera.camera3D.position).sub(this.object3d.position);

        // only load geometry if this elements has points
        if (elt.numPoints > 0) {
            if (elt.obj) {
                if (elt.obj.material.update) {
                    elt.obj.material.update(this.material);
                } else {
                    elt.obj.material.copy(this.material);
                }
                if (__DEBUG__) {
                    if (this.bboxes.visible) {
                        if (!elt.obj.boxHelper) {
                            initBoundingBox(elt, layer);
                        }
                        elt.obj.boxHelper.visible = true;
                        elt.obj.boxHelper.material.color.r = 1 - elt.sse;
                        elt.obj.boxHelper.material.color.g = elt.sse;
                    }
                }
            } else if (!elt.promise) {
                const distance = Math.max(0.001, bbox.distanceToPoint(point));
                // Increase priority of nearest node
                const priority = computeScreenSpaceError(context, layer.pointSize, layer.spacing, elt, distance) / distance;
                elt.promise = context.scheduler.execute({
                    layer,
                    requester: elt,
                    view: context.view,
                    priority,
                    redraw: true,
                    earlyDropFunction: cmd => !cmd.requester.visible || !this.visible,
                }).then((pts) => {
                    if (this.onPointsCreated) {
                        this.onPointsCreated(layer, pts);
                    }

                    elt.obj = pts;
                    // store tightbbox to avoid ping-pong (bbox = larger => visible, tight => invisible)
                    elt.tightbbox = pts.tightbbox;

                    // make sure to add it here, otherwise it might never
                    // be added nor cleaned
                    this.group.add(elt.obj);
                    elt.obj.updateMatrixWorld(true);

                    elt.promise = null;
                }, (err) => {
                    if (err instanceof CancelledCommandException) {
                        elt.promise = null;
                    }
                });
            }
        }

        if (elt.children && elt.children.length) {
            const distance = bbox.distanceToPoint(point);
            elt.sse = computeScreenSpaceError(context, layer.pointSize, layer.spacing, elt, distance) / this.sseThreshold;
            if (elt.sse >= 1) {
                return elt.children;
            } else {
                for (const child of elt.children) {
                    markForDeletion(child);
                }
            }
        }
    }

    postUpdate() {
        this.displayedCount = 0;
        for (const pts of this.group.children) {
            if (pts.material.visible) {
                const count = pts.geometry.attributes.position.count;
                pts.geometry.setDrawRange(0, count);
                this.displayedCount += count;
            }
        }

        if (this.displayedCount > this.pointBudget) {
            // 2 different point count limit implementation, depending on the potree source
            if (this.supportsProgressiveDisplay) {
                // In this format, points are evenly distributed within a node,
                // so we can draw a percentage of each node and still get a correct
                // representation
                const reduction = this.pointBudget / this.displayedCount;
                for (const pts of this.group.children) {
                    if (pts.material.visible) {
                        const count = Math.floor(pts.geometry.drawRange.count * reduction);
                        if (count > 0) {
                            pts.geometry.setDrawRange(0, count);
                        } else {
                            pts.material.visible = false;
                        }
                    }
                }
                this.displayedCount *= reduction;
            } else {
                // This format doesn't require points to be evenly distributed, so
                // we're going to sort the nodes by "importance" (= on screen size)
                // and display only the first N nodes
                this.group.children.sort((p1, p2) => p2.userData.potreeNode.sse - p1.userData.potreeNode.sse);

                let limitHit = false;
                this.displayedCount = 0;
                for (const pts of this.group.children) {
                    const count = pts.geometry.attributes.position.count;
                    if (limitHit || (this.displayedCount + count) > this.pointBudget) {
                        pts.material.visible = false;
                        limitHit = true;
                    } else {
                        this.displayedCount += count;
                    }
                }
            }
        }

        const now = Date.now();
        for (let i = this.group.children.length - 1; i >= 0; i--) {
            const obj = this.group.children[i];
            if (!obj.material.visible && (now - obj.userData.potreeNode.notVisibleSince) > 10000) {
                // remove from group
                this.group.children.splice(i, 1);

                if (Array.isArray(obj.material)) {
                    for (const material of obj.material) {
                        material.dispose();
                    }
                } else {
                    obj.material.dispose();
                }
                obj.geometry.dispose();
                obj.material = null;
                obj.geometry = null;
                obj.userData.potreeNode.obj = null;

                if (__DEBUG__) {
                    if (obj.boxHelper) {
                        obj.boxHelper.removeMe = true;
                        if (Array.isArray(obj.boxHelper.material)) {
                            for (const material of obj.boxHelper.material) {
                                material.dispose();
                            }
                        } else {
                            obj.boxHelper.material.dispose();
                        }
                        obj.boxHelper.geometry.dispose();
                    }
                }
            }
        }

        if (__DEBUG__) {
            this.bboxes.children = this.bboxes.children.filter(b => !b.removeMe);
        }
    }

    pickObjectsAt(view, mouse, radius, target = []) {
        return Picking.pickPointsAt(view, mouse, radius, this, target);
    }

    getObjectToUpdateForAttachedLayers(meta) {
        if (meta.obj) {
            const p = meta.parent;
            if (p && p.obj) {
                return {
                    element: meta.obj,
                    parent: p.obj,
                };
            } else {
                return {
                    element: meta.obj,
                };
            }
        }
    }
}

export default PotreeLayer;
