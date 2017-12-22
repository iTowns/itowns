import * as THREE from 'three';
import CancelledCommandException from '../Core/Scheduler/CancelledCommandException';
import ScreenSpaceError from '../Core/ScreenSpaceError';

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

function shouldDisplayNode(context, layer, elt) {
    if (layer.octreeDepthLimit >= 0 && layer.octreeDepthLimit < elt.name.length) {
        return 0;
    }
    let shouldBeLoaded = 0;

    const numPoints = elt.numPoints;

    const cl = (elt.tightbbox ? elt.tightbbox : elt.bbox);

    const visible = context.camera.isBox3Visible(cl, layer.object3d.matrixWorld);

    if (visible) {
        if (numPoints == 0) {
            // no point indicates shallow hierarchy, so we definitely want to load its children
            shouldBeLoaded = 1;
            elt.sse = {
                sse: Infinity,
            };
        } else {
            elt.sse = ScreenSpaceError.computeFromBox3(context.camera,
                    cl,
                    layer.object3d.matrixWorld,
                    elt.geometricError,
                    ScreenSpaceError.MODE_3D);
            shouldBeLoaded = Math.min(1, elt.sse.sse / layer.sseThreshold);
        }
        return shouldBeLoaded;
    }
    return 0;
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
        elt.shouldBeLoaded = -1;
    }
    for (const child of elt.children) {
        markForDeletion(child);
    }
}

export default {
    preUpdate(context, layer) {
        // TODO: use changeSource
        layer.counters = {
            pointCount: 0,
            displayedCount: 0,
        };

        // Bail-out if not ready
        if (!layer.root) {
            return [];
        }

        // Start updating from hierarchy root
        return [layer.root];
    },

    update(context, layer, elt) {
        const shouldBeLoaded = shouldDisplayNode(context, layer, elt);

        elt.shouldBeLoaded = shouldBeLoaded;

        if (shouldBeLoaded > 0) {
            elt.notVisibleSince = undefined;

            // only load geometry if this elements has points
            if (elt.numPoints > 0) {
                if (elt.obj) {
                    elt.obj.material.visible = true;
                    if (__DEBUG__) {
                        elt.obj.material.uniforms.density.value = elt.density;

                        if (layer.bboxes.visible) {
                            if (!elt.obj.boxHelper) {
                                initBoundingBox(elt, layer);
                            }
                            elt.obj.boxHelper.visible = true;
                            elt.obj.boxHelper.material.color.r = 1 - shouldBeLoaded;
                            elt.obj.boxHelper.material.color.g = shouldBeLoaded;
                        }
                    }
                    const count = Math.max(1.0, Math.floor(shouldBeLoaded * elt.obj.geometry.attributes.position.count));
                    elt.obj.geometry.setDrawRange(0, count);
                    layer.counters.pointCount += elt.obj.realPointCount;
                    layer.counters.displayedCount += Math.floor(shouldBeLoaded * elt.obj.geometry.attributes.position.count);
                    elt.obj.material.uniforms.size.value = layer.pointSize;
                } else if (!elt.promise) {
                    // TODO:
                    // - add command cancelation support
                    // - rework priority
                    elt.promise = context.scheduler.execute({
                        layer,
                        requester: elt,
                        view: context.view,
                        priority: elt.sse.sse,
                        redraw: true,
                        isLeaf: elt.childrenBitField == 0,
                        earlyDropFunction: cmd => cmd.requester.shouldBeLoaded <= 0,
                    }).then((pts) => {
                        if (layer.onPointsCreated) {
                            layer.onPointsCreated(layer, pts);
                        }

                        elt.obj = pts;
                        // store tightbbox to avoid ping-pong (bbox = larger => visible, tight => invisible)
                        elt.tightbbox = pts.tightbbox;
                        const count = Math.max(1.0, Math.floor(shouldBeLoaded * pts.geometry.attributes.position.count));
                        pts.geometry.setDrawRange(0, count);

                        // make sure to add it here, otherwise it might never
                        // be added nor cleaned
                        layer.group.add(elt.obj);
                        elt.obj.updateMatrixWorld(true);

                        elt.obj.owner = elt;
                        elt.promise = null;
                    }, (err) => {
                        if (err instanceof CancelledCommandException) {
                            elt.promise = null;
                        }
                    });
                }
            }
        } else {
            // not visible / displayed
            markForDeletion(elt);
        }

        if (shouldBeLoaded >= 0.9 && elt.children && elt.children.length) {
            return elt.children;
        }
        return undefined;
    },

    postUpdate(context, layer) {
        if (!layer.group) {
            return;
        }

        if (layer.counters.displayedCount > layer.pointBudget) {
            const reduction = layer.pointBudget / layer.counters.displayedCount;
            for (const pts of layer.group.children) {
                if (pts.material.visible) {
                    const count = Math.max(1.0, Math.floor(pts.geometry.drawRange.count * reduction));
                    pts.geometry.setDrawRange(0, count);
                }
            }
            layer.counters.displayedCount *= reduction;
        }

        const now = Date.now();

        for (let i = layer.group.children.length - 1; i >= 0; i--) {
            const obj = layer.group.children[i];
            if (!obj.material.visible && (now - obj.owner.notVisibleSince) > 10000) {
                // remove from group
                layer.group.children.splice(i, 1);

                obj.material.dispose();
                obj.geometry.dispose();
                obj.material = null;
                obj.geometry = null;
                obj.owner.obj = null;

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
