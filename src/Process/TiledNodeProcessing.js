import * as THREE from 'three';
import BoundingBox from '../Scene/BoundingBox';


function subdivisionBoundingBoxes(bbox) {
    const center = bbox.center();

    const northWest = new BoundingBox(bbox.crs(), bbox.west(), center._values[0], center._values[1], bbox.north());
    const northEast = new BoundingBox(bbox.crs(), center._values[0], bbox.east(), center._values[1], bbox.north());
    const southWest = new BoundingBox(bbox.crs(), bbox.west(), center._values[0], bbox.south(), center._values[1]);
    const southEast = new BoundingBox(bbox.crs(), center._values[0], bbox.east(), bbox.south(), center._values[1]);

    // scheme tiles store their coordinates in radians internally,
    // so we need to fix the new bboxes as well
    const result = [northWest, northEast, southWest, southEast];

    for (const r of result) {
        r.minCoordinate._internalStorageUnit = bbox.minCoordinate._internalStorageUnit;
        r.maxCoordinate._internalStorageUnit = bbox.minCoordinate._internalStorageUnit;
    }
    return result;
}

function requestNewTile(scheduler, geometryLayer, bbox, parent, level) {
    const command = {
        /* mandatory */
        requester: parent,
        layer: geometryLayer,
        priority: 10000,
        /* specific params */
        bbox,
        level,
        redraw: false,
        threejsLayer: geometryLayer.threejsLayer,
    };

    return scheduler.execute(command).then((node) => {
        node.add(node.OBB());
        return node;
    });
}

function subdivideNode(context, layer, node, initNewNode) {
    if (!node.pendingSubdivision && !node.children.some(n => n.layer == layer.id)) {
        const bboxes = subdivisionBoundingBoxes(node.bbox);
        // TODO: pendingSubdivision mechanism is fragile, get rid of it
        node.pendingSubdivision = true;

        const promises = [];
        const children = [];
        for (const bbox of bboxes) {
            promises.push(
                requestNewTile(context.scheduler, layer, bbox, node).then((child) => {
                    children.push(child);
                    initNewNode(context, layer, node, child);
                    return node;
                }));
        }

        Promise.all(promises).then(() => {
            for (const child of children) {
                node.add(child);
                child.updateMatrixWorld(true);
                child.OBB().update();
            }
            // TODO
            /*
              if (child.material.elevationLayersId.length) {
                // need to force update elevation when delta is important
                if (child.level - child.material.getElevationLayerLevel() > 6) {
                    updateNodeElevation(_this.scene, params.tree, child, params.layersConfig, true);
                }
            }
            */
            node.pendingSubdivision = false;
            context.scene.notifyChange(0, false);
        }, (err) => {
            node.pendingSubdivision = false;
            throw new Error(err);
        });
    }
}

export function initTiledGeometryLayer(schemeTile) {
    const _promises = [];
    return function _initTiledGeometryLayer(context, layer) {
        if (_promises.length > 0) {
            return;
        }

        layer.level0Nodes = [];

        for (let i = 0; i < schemeTile.rootCount(); i++) {
            _promises.push(
                requestNewTile(context.scheduler, layer, schemeTile.getRoot(i), undefined, 0));
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
            // TODO: consider cancelling pending commands from this node
            node.children[i].dispose();
            node.children.splice(i, 1);
        } else {
            i++;
        }
    }
}

export function processTiledGeometryNode(cullingTest, subdivisionTest, initNewNode) {
    return function _processTiledGeometryNode(context, layer, node) {
    // early exit if parent' subdivision is in progress
        if (node.parent.pendingSubdivision) {
            node.visible = false;
            node.setDisplayed(false);
            return undefined;
        }

        // do proper culling
        const isVisible = cullingTest ? (!cullingTest(node, context.camera)) : true;
        node.visible = isVisible;


        if (isVisible) {
            let requestChildrenUpdate = false;

            if (node.pendingSubdivision || subdivisionTest(context, layer, node)) {
                subdivideNode(context, layer, node, initNewNode);
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

            // TODO: use Array.slice()
            return requestChildrenUpdate ? node.children.filter(n => n.layer == layer.id) : undefined;
        }

        node.setDisplayed(false);
        _removeChildren(layer, node);

        return undefined;
    };
}
