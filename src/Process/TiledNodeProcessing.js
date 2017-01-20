import BoundingBox from 'Scene/BoundingBox';

import * as THREE from 'three';

function subdivisionBoundingBoxes(bbox) {
    const northWest = new BoundingBox(bbox.west(), bbox.center.x, bbox.center.y, bbox.north(), 0, 0, bbox.minCoordinate.unit);
    const northEast = new BoundingBox(bbox.center.x, bbox.east(), bbox.center.y, bbox.north(), 0, 0, bbox.minCoordinate.unit);
    const southWest = new BoundingBox(bbox.west(), bbox.center.x, bbox.south(), bbox.center.y, 0, 0, bbox.minCoordinate.unit);
    const southEast = new BoundingBox(bbox.center.x, bbox.east(), bbox.south(), bbox.center.y, 0, 0, bbox.minCoordinate.unit);


    return [northWest, northEast, southWest, southEast];
}

function requestNewTile(scheduler, geometryLayer, bbox, parent, level) {
    const command = {
        /* mandatory */
        requester: parent,
        layer: geometryLayer,
        priority: 10000,
        /* specific params */
        bbox,
        type: geometryLayer.nodeType,
        level,
        redraw: false,
    };

    return scheduler.execute(command);
}

function subdivideNode(context, layer, node) {
    if (!node.pendingSubdivision && node.children.filter(n => n.layer == layer.id).length == 0) {
        const bboxes = subdivisionBoundingBoxes(node.bbox);
        // TODO: pendingSubdivision mechanism is fragile, get rid of it
        node.pendingSubdivision = true;

        const promises = [];
        const children = [];
        for (let i = 0; i < bboxes.length; i++) {
            promises.push(
                requestNewTile(context.scheduler, layer, bboxes[i], node).then((child) => {
                    children.push(child);
                    return layer.initNewNode(context, node, child);
                }));
        }

        Promise.all(promises).then(() => {
            for (const t of children) {
                node.add(t);
                t.updateMatrixWorld();
            }
            node.pendingSubdivision = false;
            context.scene.notifyChange(0, false);
        }, () => { node.pendingSubdivision = false; });
    }
}

export function initTiledGeometryLayer() {
    const _promises = [];
    return function initTiled(context, layer) {
        if (_promises.length > 0) {
            return;
        }

        layer.level0Nodes = [];

        for (let i = 0; i < layer.schemeTile.rootCount(); i++) {
            _promises.push(
                requestNewTile(context.scheduler, layer, layer.schemeTile.getRoot(i), undefined, 0));
        }
        Promise.all(_promises).then((level0s) => {
            layer.level0Nodes = level0s;
            for (const level0 of level0s) {
                // TODO: support a layer.root attribute, to be able
                // to add a layer to a three.js node, e.g:
                // layer.root.add(level0);
                context.scene.gfxEngine.scene3D.add(level0);
                level0.updateMatrixWorld();
            }
        });
    };
}

function _removeChildren(layer, node) {
    // remove children
    for (let i = 0; i < node.children.length;) {
        if (node.children[i].layer === layer.id) {
            node.children[i].dispose();
            node.children.splice(i, 1);
        } else {
            i++;
        }
    }
}

export function processTiledGeometryNode(context, layer, node) {
    // early exit if parent' subdivision is in progress
    if (node.parent.pendingSubdivision) {
        node.visible = false;
        node.setDisplayed(false);
        return undefined;
    }

    // do proper culling
    const isVisible = layer.cullingTest ? (!layer.cullingTest(node, context.camera)) : true;
    node.visible = isVisible;


    if (isVisible) {
        let requestChildrenUpdate = false;

        if (node.pendingSubdivision || layer.mustSubdivide(context, layer, node)) {
            subdivideNode(context, layer, node);
            // display iff children aren't ready
            node.setDisplayed(node.pendingSubdivision);
            requestChildrenUpdate = true;
        } else {
            node.setDisplayed(true);
        }

        if (node.material.visible) {
            // update uniforms
            const positionWorld = new THREE.Vector3();
            positionWorld.setFromMatrixPosition(node.matrixWorld);
            node.setMatrixRTC(
                context.scene.gfxEngine.getRTCMatrixFromCenter(
                    positionWorld, context.camera));
            node.setFog(1000000000);

            if (!requestChildrenUpdate) {
                _removeChildren(layer, node);
            }
        }

        return requestChildrenUpdate ? node.children.filter(n => n.layer == layer.id) : undefined;
    }

    node.setDisplayed(false);
    _removeChildren(layer, node);

    // TODO: cleanup tree
    return undefined;
}
