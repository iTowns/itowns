import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import Fetcher from 'Provider/Fetcher';
import PotreeBinParser from 'Parser/PotreeBinParser';
import PotreeCinParser from 'Parser/PotreeCinParser';
import PointsMaterial, { MODE } from 'Renderer/PointsMaterial';
import Picking from 'Core/Picking';
import Extent from 'Core/Geographic/Extent';
import CancelledCommandException from 'Core/Scheduler/CancelledCommandException';

const point = new THREE.Vector3();
// Draw a cube with lines (12 lines).
function cube(size) {
    var h = size.clone().multiplyScalar(0.5);
    var geometry = new THREE.Geometry();
    var line = new THREE.Line(geometry);

    geometry.vertices.push(
        new THREE.Vector3(-h.x, -h.y, -h.z),
        new THREE.Vector3(-h.x, h.y, -h.z),
        new THREE.Vector3(-h.x, h.y, -h.z),
        new THREE.Vector3(h.x, h.y, -h.z),
        new THREE.Vector3(h.x, h.y, -h.z),
        new THREE.Vector3(h.x, -h.y, -h.z),
        new THREE.Vector3(h.x, -h.y, -h.z),
        new THREE.Vector3(-h.x, -h.y, -h.z),
        new THREE.Vector3(-h.x, -h.y, h.z),
        new THREE.Vector3(-h.x, h.y, h.z),
        new THREE.Vector3(-h.x, h.y, h.z),
        new THREE.Vector3(h.x, h.y, h.z),
        new THREE.Vector3(h.x, h.y, h.z),
        new THREE.Vector3(h.x, -h.y, h.z),
        new THREE.Vector3(h.x, -h.y, h.z),
        new THREE.Vector3(-h.x, -h.y, h.z),
        new THREE.Vector3(-h.x, -h.y, -h.z),
        new THREE.Vector3(-h.x, -h.y, h.z),
        new THREE.Vector3(-h.x, h.y, -h.z),
        new THREE.Vector3(-h.x, h.y, h.z),
        new THREE.Vector3(h.x, h.y, -h.z),
        new THREE.Vector3(h.x, h.y, h.z),
        new THREE.Vector3(h.x, -h.y, -h.z),
        new THREE.Vector3(h.x, -h.y, h.z));

    line.computeLineDistances();
    return line.geometry;
}

function initBoundingBox(elt, layer) {
    const size = new THREE.Vector3();
    elt.tightbbox.getSize(size);
    elt.obj.boxHelper = new THREE.LineSegments(
        cube(size),
        elt.childrenBitField ?
            new THREE.LineDashedMaterial({ color: 0, dashSize: 0.25, gapSize: 0.25 }) : new THREE.LineBasicMaterial({ color: 0 }));

    elt.obj.boxHelper.frustumCulled = false;
    elt.obj.boxHelper.position.copy(elt.tightbbox.min);
    elt.obj.boxHelper.position.add(size.multiplyScalar(0.5));
    elt.obj.boxHelper.updateMatrixWorld(true);
    elt.obj.boxHelper.autoUpdateMatrix = false;
    elt.obj.boxHelper.material.linewidth = 2;
    elt.obj.boxHelper.layers.mask = layer.bboxes.layers.mask;
    layer.bboxes.add(elt.obj.boxHelper);
    elt.obj.boxHelper.updateMatrixWorld();
}

function computeScreenSpaceError(context, layer, elt, distance) {
    if (distance <= 0) {
        return Infinity;
    }
    const pointSpacing = layer.metadata.spacing / 2 ** elt.name.length;
    // Estimate the onscreen distance between 2 points
    const onScreenSpacing = context.camera.preSSE * pointSpacing / distance;
    // [  P1  ]--------------[   P2   ]
    //     <--------------------->      = pointsSpacing (in world coordinates)
    //                                  ~ onScreenSpacing (in pixels)
    // <------>                         = layer.pointSize (in pixels)
    return Math.max(0.0, onScreenSpacing - layer.pointSize);
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

// Create an A(xis)A(ligned)B(ounding)B(ox) for the child `childIndex` of one aabb.
// (PotreeConverter protocol builds implicit octree hierarchy by applying the same
// subdivision algo recursively)
const dHalfLength = new THREE.Vector3();
function createChildAABB(aabb, childIndex) {
    // Code inspired from potree
    const box = aabb.clone();
    aabb.getCenter(box.max);
    dHalfLength.copy(box.max).sub(aabb.min);

    if (childIndex === 1) {
        box.min.z += dHalfLength.z;
        box.max.z += dHalfLength.z;
    } else if (childIndex === 3) {
        box.min.z += dHalfLength.z;
        box.max.z += dHalfLength.z;
        box.min.y += dHalfLength.y;
        box.max.y += dHalfLength.y;
    } else if (childIndex === 0) {
        //
    } else if (childIndex === 2) {
        box.min.y += dHalfLength.y;
        box.max.y += dHalfLength.y;
    } else if (childIndex === 5) {
        box.min.z += dHalfLength.z;
        box.max.z += dHalfLength.z;
        box.min.x += dHalfLength.x;
        box.max.x += dHalfLength.x;
    } else if (childIndex === 7) {
        box.min.add(dHalfLength);
        box.max.add(dHalfLength);
    } else if (childIndex === 4) {
        box.min.x += dHalfLength.x;
        box.max.x += dHalfLength.x;
    } else if (childIndex === 6) {
        box.min.y += dHalfLength.y;
        box.max.y += dHalfLength.y;
        box.min.x += dHalfLength.x;
        box.max.x += dHalfLength.x;
    }

    return box;
}


export function parseOctree(layer, hierarchyStepSize, root) {
    return Fetcher.arrayBuffer(`${root.baseurl}/r${root.name}.hrc`, layer.fetchOptions).then((blob) => {
        const view = new DataView(blob);

        const stack = [];

        let offset = 0;

        root.childrenBitField = view.getUint8(0); offset += 1;
        root.numPoints = view.getUint32(1, true); offset += 4;
        root.children = [];

        stack.push(root);

        while (stack.length && offset < blob.byteLength) {
            const snode = stack.shift();
            // look up 8 children
            for (let i = 0; i < 8; i++) {
                // does snode have a #i child ?
                if (snode.childrenBitField & (1 << i) && (offset + 5) <= blob.byteLength) {
                    const c = view.getUint8(offset); offset += 1;
                    let n = view.getUint32(offset, true); offset += 4;
                    if (n == 0) {
                        n = root.numPoints;
                    }
                    const childname = snode.name + i;
                    const bounds = createChildAABB(snode.bbox, i);

                    let url = root.baseurl;
                    if ((childname.length % hierarchyStepSize) == 0) {
                        const myname = childname.substr(root.name.length);
                        url = `${root.baseurl}/${myname}`;
                    }
                    const item = {
                        numPoints: n,
                        childrenBitField: c,
                        children: [],
                        name: childname,
                        baseurl: url,
                        bbox: bounds,
                        layer,
                        parent: snode,
                    };
                    snode.children.push(item);
                    stack.push(item);
                }
            }
        }

        return root;
    });
}

function findChildrenByName(node, name) {
    if (node.name === name) {
        return node;
    }
    const charIndex = node.name.length;
    for (let i = 0; i < node.children.length; i++) {
        if (node.children[i].name[charIndex] == name[charIndex]) {
            return findChildrenByName(node.children[i], name);
        }
    }
    throw new Error(`Cannot find node with name '${name}'`);
}

function computeBbox(layer) {
    let bbox;
    if (layer.isFromPotreeConverter) {
        bbox = new THREE.Box3(
            new THREE.Vector3(layer.metadata.boundingBox.lx, layer.metadata.boundingBox.ly, layer.metadata.boundingBox.lz),
            new THREE.Vector3(layer.metadata.boundingBox.ux, layer.metadata.boundingBox.uy, layer.metadata.boundingBox.uz));
    } else {
        // lopocs
        let idx = 0;
        for (const entry of layer.metadata) {
            if (entry.table == layer.table) {
                break;
            }
            idx++;
        }
        bbox = new THREE.Box3(
            new THREE.Vector3(layer.metadata[idx].bbox.xmin, layer.metadata[idx].bbox.ymin, layer.metadata[idx].bbox.zmin),
            new THREE.Vector3(layer.metadata[idx].bbox.xmax, layer.metadata[idx].bbox.ymax, layer.metadata[idx].bbox.zmax));
    }
    return bbox;
}

export function parseMetadata(metadata, layer) {
    layer.metadata = metadata;

    var customBinFormat = true;

    // Lopocs pointcloud server can expose the same file structure as PotreeConverter output.
    // The only difference is the metadata root file (cloud.js vs infos/sources), and we can
    // check for the existence of a `scale` field.
    // (if `scale` is defined => we're fetching files from PotreeConverter)
    if (layer.metadata.scale != undefined) {
        layer.isFromPotreeConverter = true;
        // PotreeConverter format
        customBinFormat = layer.metadata.pointAttributes === 'CIN';
        // do we have normal information
        const normal = Array.isArray(layer.metadata.pointAttributes) &&
            layer.metadata.pointAttributes.find(elem => elem.startsWith('NORMAL'));
        if (normal) {
            layer.material.defines[normal] = 1;
        }
    } else {
        // Lopocs
        layer.metadata.scale = 1;
        layer.metadata.octreeDir = `itowns/${layer.table}.points`;
        layer.metadata.hierarchyStepSize = 1000000; // ignore this with lopocs
        customBinFormat = true;
    }

    layer.parse = customBinFormat ? PotreeCinParser.parse : PotreeBinParser.parse;
    layer.extension = customBinFormat ? 'cin' : 'bin';
    layer.supportsProgressiveDisplay = customBinFormat;
}

class PointCloudLayer extends GeometryLayer {
    /**
     * Constructs a new instance of point cloud layer.
     * @constructor
     * @extends GeometryLayer
     *
     * @example
     * // Create a new point cloud layer
     * const points = new PointCloudLayer('points',
     *  {
     *      url: 'https://pointsClouds/',
     *      file: 'points.js',
     *  }, view);
     *
     * View.prototype.addLayer.call(view, points);
     *
     * @param      {string}  id - The id of the layer, that should be unique. It is
     * not mandatory, but an error will be emitted if this layer is added a
     * {@link View} that already has a layer going by that id.
     * @param      {object}  config   configuration, all elements in it
     * will be merged as is in the layer.
     * @param {string} config.url The base url.
     * @param {string} config.file file name.
     * @param {number} [config.pointBudget=2000000] max displayed points count.
     * @param {number} [config.sseThreshold=2] screen space error Threshold.
     * @param {Object} [config.fetchOptions={}] fetch config.
     * @param {number} [config.pointSize=4] point size.
     * @param {THREE.Material} [config.material] override material.
     * @param {number} [config.mode=MODE.COLOR] displaying mode.
     *
     * @param  {View}  view  The view
     */
    constructor(id, config, view) {
        if (!config.url) {
            throw new Error('New PointCloudLayer: url is required');
        }
        if (!config.file) {
            throw new Error('New PointCloudLayer: file is required');
        }
        super(id, new THREE.Group());
        this.isPointCloudLayer = true;
        this.protocol = 'potreeconverter';

        this.file = config.file;
        this.url = config.url;

        this.group = config.group || new THREE.Group();
        this.object3d.add(this.group);
        this.bboxes = config.bboxes || new THREE.Group();
        this.bboxes.visible = false;

        this.object3d.add(this.bboxes);
        this.group.updateMatrixWorld();

        // default config
        this.fetchOptions = config.fetchOptions || {};
        this.octreeDepthLimit = config.octreeDepthLimit || -1;
        this.pointBudget = config.pointBudget || 2000000;
        this.pointSize = config.pointSize === 0 || !isNaN(config.pointSize) ? config.pointSize : 4;
        this.sseThreshold = config.sseThreshold || 2;
        this.material = config.material || {};
        this.material = this.material.isMaterial ? config.material : new PointsMaterial(config.material);
        this.material.defines = this.material.defines || {};
        this.mode = MODE.COLOR || config.mode;

        this.whenReady = Fetcher.json(`${this.url}/${this.file}`, this.fetchOptions)
            .then((metadata) => {
                parseMetadata(metadata, this);
                const bbox = computeBbox(this);
                return parseOctree(this, this.metadata.hierarchyStepSize, { baseurl: `${this.url}/${this.metadata.octreeDir}/r`, name: '', bbox });
            })
            .then((root) => {
                this.root = root;
                root.findChildrenByName = findChildrenByName.bind(root, root);
                this.extent = Extent.fromBox3(view.referenceCrs, root.bbox);

                return this;
            });
    }

    preUpdate(context, changeSources) {
        // Bail-out if not ready
        if (!this.root) {
            return [];
        }

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
            return [this.root.findChildrenByName(commonAncestorName)];
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
                const priority = computeScreenSpaceError(context, layer, elt, distance) / distance;
                elt.promise = context.scheduler.execute({
                    layer,
                    requester: elt,
                    view: context.view,
                    priority,
                    redraw: true,
                    isLeaf: elt.childrenBitField == 0,
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
            elt.sse = computeScreenSpaceError(context, layer, elt, distance) / this.sseThreshold;
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
        if (!this.group) {
            return;
        }

        this.displayedCount = 0;
        for (const pts of this.group.children) {
            if (pts.material.visible) {
                const count = pts.geometry.attributes.position.count;
                pts.geometry.setDrawRange(0, count);
                this.displayedCount += count;
            }
        }

        if (this.displayedCount > this.pointBudget) {
            // 2 different point count limit implementation, depending on the pointcloud source
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
                this.group.children.sort((p1, p2) => p2.userData.metadata.sse - p1.userData.metadata.sse);

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
            if (!obj.material.visible && (now - obj.userData.metadata.notVisibleSince) > 10000) {
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
                obj.userData.metadata.obj = null;

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

    pickObjectsAt(view, mouse, radius) {
        return Picking.pickPointsAt(view, mouse, radius, this);
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

export default PointCloudLayer;
