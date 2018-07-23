import * as THREE from 'three';
import CancelledCommandException from '../Core/Scheduler/CancelledCommandException';

// Draw a cube with lines (12 lines).
function cube(size) {
    var h = size.clone().multiplyScalar(0.5);
    var geometry = new THREE.Geometry();
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
    geometry.computeLineDistances();
    return geometry;
}

function initBoundingBox(elt, layer) {
    const size = elt.tightbbox.getSize();
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
    const pointSpacing = layer.metadata.spacing / Math.pow(2, elt.name.length);
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

function updateMinMaxDistance(context, bbox) {
    const distance = bbox.distanceToPoint(context.camera.camera3D.position);
    context.distance.update(distance, bbox.getSize());
    return distance;
}

export default {
    preUpdate(context, layer, changeSources) {
        // Bail-out if not ready
        if (!layer.root) {
            return [];
        }

        // See https://cesiumjs.org/hosted-apps/massiveworlds/downloads/Ring/WorldScaleTerrainRendering.pptx
        // slide 17
        context.camera.preSSE =
            context.camera.height /
                (2 * Math.tan(THREE.Math.degToRad(context.camera.camera3D.fov) * 0.5));

        if (layer.material) {
            layer.material.visible = layer.visible;
            layer.material.opacity = layer.opacity;
            layer.material.transparent = layer.opacity < 1;
            layer.material.size = layer.pointSize;
        }

        // lookup lowest common ancestor of changeSources
        let commonAncestorName;
        for (const source of changeSources.values()) {
            if (source.isCamera || source == layer) {
                // if the change is caused by a camera move, no need to bother
                // to find common ancestor: we need to update the whole tree:
                // some invisible tiles may now be visible
                return [layer.root];
            }
            if (source.obj === undefined) {
                continue;
            }
            // filter sources that belong to our layer
            if (source.obj.isPoints && source.obj.layer == layer) {
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
            context.fastUpdateHint = commonAncestorName;
        }

        // Start updating from hierarchy root
        return [layer.root];
    },

    update(context, layer, elt) {
        if (layer.octreeDepthLimit >= 0 && layer.octreeDepthLimit < elt.name.length) {
            markForDeletion(elt);
            return;
        }

        // pick the best bounding box
        const bbox = (elt.tightbbox ? elt.tightbbox : elt.bbox);

        if (context.fastUpdateHint && !elt.name.startsWith(context.fastUpdateHint)) {
            if (!elt.visible) {
                return;
            }
            updateMinMaxDistance(context, bbox);
        } else {
            elt.visible = context.camera.isBox3Visible(bbox, layer.object3d.matrixWorld);

            if (!elt.visible) {
                markForDeletion(elt);
                return;
            }

            const distance = updateMinMaxDistance(context, bbox);
            elt.notVisibleSince = undefined;

            // only load geometry if this elements has points
            if (elt.numPoints > 0) {
                if (elt.obj) {
                    if (elt.obj.material.update) {
                        elt.obj.material.update(layer.material);
                    } else {
                        elt.obj.material.copy(layer.material);
                    }
                    if (__DEBUG__) {
                        if (layer.bboxes.visible) {
                            if (!elt.obj.boxHelper) {
                                initBoundingBox(elt, layer);
                            }
                            elt.obj.boxHelper.visible = true;
                            elt.obj.boxHelper.material.color.r = 1 - elt.sse;
                            elt.obj.boxHelper.material.color.g = elt.sse;
                        }
                    }
                } else if (!elt.promise) {
                    // Increase priority of nearest node
                    const priority = computeScreenSpaceError(context, layer, elt, distance) / Math.max(0.001, distance);
                    elt.promise = context.scheduler.execute({
                        layer,
                        requester: elt,
                        view: context.view,
                        priority,
                        redraw: true,
                        isLeaf: elt.childrenBitField == 0,
                        earlyDropFunction: cmd => !cmd.requester.visible || !layer.visible,
                    }).then((pts) => {
                        if (layer.onPointsCreated) {
                            layer.onPointsCreated(layer, pts);
                        }

                        elt.obj = pts;
                        // store tightbbox to avoid ping-pong (bbox = larger => visible, tight => invisible)
                        elt.tightbbox = pts.tightbbox;

                        // make sure to add it here, otherwise it might never
                        // be added nor cleaned
                        layer.group.add(elt.obj);
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
                elt.sse = computeScreenSpaceError(context, layer, elt, distance) / layer.sseThreshold;
            }
        }

        if (elt.children && elt.children.length) {
            if (elt.sse >= 1) {
                return elt.children;
            } else {
                for (const child of elt.children) {
                    markForDeletion(child);
                }
            }
        }
    },

    postUpdate(context, layer) {
        if (!layer.group) {
            return;
        }

        layer.displayedCount = 0;
        for (const pts of layer.group.children) {
            if (pts.material.visible) {
                const count = pts.geometry.attributes.position.count;
                pts.geometry.setDrawRange(0, count);
                layer.displayedCount += count;
            }
        }

        if (layer.displayedCount > layer.pointBudget) {
            // 2 different point count limit implementation, depending on the pointcloud source
            if (layer.supportsProgressiveDisplay) {
                // In this format, points are evenly distributed within a node,
                // so we can draw a percentage of each node and still get a correct
                // representation
                const reduction = layer.pointBudget / layer.displayedCount;
                for (const pts of layer.group.children) {
                    if (pts.material.visible) {
                        const count = Math.floor(pts.geometry.drawRange.count * reduction);
                        if (count > 0) {
                            pts.geometry.setDrawRange(0, count);
                        } else {
                            pts.material.visible = false;
                        }
                    }
                }
                layer.displayedCount *= reduction;
            } else {
                // This format doesn't require points to be evenly distributed, so
                // we're going to sort the nodes by "importance" (= on screen size)
                // and display only the first N nodes
                layer.group.children.sort((p1, p2) => p2.userData.metadata.sse - p1.userData.metadata.sse);

                let limitHit = false;
                layer.displayedCount = 0;
                for (const pts of layer.group.children) {
                    const count = pts.geometry.attributes.position.count;
                    if (limitHit || (layer.displayedCount + count) > layer.pointBudget) {
                        pts.material.visible = false;
                        limitHit = true;
                    } else {
                        layer.displayedCount += count;
                    }
                }
            }
        }

        const now = Date.now();
        for (let i = layer.group.children.length - 1; i >= 0; i--) {
            const obj = layer.group.children[i];
            if (!obj.material.visible && (now - obj.userData.metadata.notVisibleSince) > 10000) {
                // remove from group
                layer.group.children.splice(i, 1);

                obj.material.dispose();
                obj.geometry.dispose();
                obj.material = null;
                obj.geometry = null;
                obj.userData.metadata.obj = null;

                if (__DEBUG__) {
                    if (obj.boxHelper) {
                        obj.boxHelper.removeMe = true;
                        obj.boxHelper.material.dispose();
                        obj.boxHelper.geometry.dispose();
                    }
                }
            }
        }

        if (__DEBUG__) {
            layer.bboxes.children = layer.bboxes.children.filter(b => !b.removeMe);
        }
    },
};
