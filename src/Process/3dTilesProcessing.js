import * as THREE from 'three';

function requestNewTile(view, scheduler, geometryLayer, metadata, parent, redraw) {
    const command = {
        /* mandatory */
        view,
        requester: parent,
        layer: geometryLayer,
        priority: parent ? 1.0 / (parent.distance + 1) : 100,
        /* specific params */
        metadata,
        redraw,
    };

    return scheduler.execute(command);
}

function subdivideNode(context, layer, node, cullingTest) {
    if (node.additiveRefinement) {
        // Additive refinement can only fetch visible children.
        _subdivideNodeAdditive(context, layer, node, cullingTest);
    } else {
        // Substractive refinement on the other hand requires to replace
        // node with all of its children
        _subdivideNodeSubstractive(context, layer, node);
    }
}

const tmpMatrix = new THREE.Matrix4();
function _subdivideNodeAdditive(context, layer, node, cullingTest) {
    for (const child of layer.tileIndex.index[node.tileId].children) {
        // child being downloaded => skip
        if (child.promise || child.loaded) {
            continue;
        }

        // 'child' is only metadata (it's *not* a THREE.Object3D). 'cullingTest' needs
        // a matrixWorld, so we compute it: it's node's matrixWorld x child's transform
        let overrideMatrixWorld = node.matrixWorld;
        if (child.transform) {
            overrideMatrixWorld = tmpMatrix.multiplyMatrices(node.matrixWorld, child.transform);
        }

        const isVisible = cullingTest ? !cullingTest(context.camera, child, overrideMatrixWorld) : true;

        // child is not visible => skip
        if (!isVisible) {
            continue;
        }
        child.promise = requestNewTile(context.view, context.scheduler, layer, child, node, true).then((tile) => {
            node.add(tile);
            tile.updateMatrixWorld();
            context.view.notifyChange(true);
            child.loaded = true;
            delete child.promise;
        });
    }
}

function _subdivideNodeSubstractive(context, layer, node) {
    if (!node.pendingSubdivision && node.children.filter(n => n.layer == layer).length == 0) {
        const childrenTiles = layer.tileIndex.index[node.tileId].children;
        if (childrenTiles === undefined || childrenTiles.length === 0) {
            return;
        }
        node.pendingSubdivision = true;

        const promises = [];
        for (let i = 0; i < childrenTiles.length; i++) {
            promises.push(
                requestNewTile(context.view, context.scheduler, layer, childrenTiles[i], node, false).then((tile) => {
                    childrenTiles[i].loaded = true;
                    node.add(tile);
                    tile.updateMatrixWorld();
                    if (node.additiveRefinement) {
                        context.view.notifyChange(true);
                    }
                    layer.tileIndex.index[tile.tileId].loaded = true;
                }));
        }
        Promise.all(promises).then(() => {
            node.pendingSubdivision = false;
            context.view.notifyChange(true);
        });
    }
}

export function $3dTilesCulling(camera, node, tileMatrixWorld) {
    // For viewer Request Volume https://github.com/AnalyticalGraphicsInc/3d-tiles-samples/tree/master/tilesets/TilesetWithRequestVolume
    if (node.viewerRequestVolume) {
        const nodeViewer = node.viewerRequestVolume;
        if (nodeViewer.region) {
            // TODO
            return true;
        }
        if (nodeViewer.box) {
            // TODO
            return true;
        }
        if (nodeViewer.sphere) {
            const worldCoordinateCenter = nodeViewer.sphere.center.clone();
            worldCoordinateCenter.applyMatrix4(tileMatrixWorld);
            // To check the distance between the center sphere and the camera
            if (!(camera.camera3D.position.distanceTo(worldCoordinateCenter) <= nodeViewer.sphere.radius)) {
                return true;
            }
        }
    }

    // For bounding volume
    if (node.boundingVolume) {
        const boundingVolume = node.boundingVolume;
        if (boundingVolume.region) {
            return !camera.isBox3Visible(boundingVolume.region.box3D,
                tileMatrixWorld.clone().multiply(boundingVolume.region.matrix));
        }
        if (boundingVolume.box) {
            return !camera.isBox3Visible(boundingVolume.box, tileMatrixWorld);
        }
        if (boundingVolume.sphere) {
            return !camera.isSphereVisible(boundingVolume.sphere, tileMatrixWorld);
        }
    }
    return false;
}

// Cleanup all 3dtiles|three.js starting from a given node n.
// n's children can be of 2 types:
//   - have a 'content' attribute -> it's a tileset and must
//     be cleaned with cleanup3dTileset()
//   - doesn't have 'content' -> it's a raw Object3D object,
//     and must be cleaned with _cleanupObject3D()
function cleanup3dTileset(layer, n, depth = 0) {
    // If this layer is not using additive refinement, we can only
    // clean a tile if all its neighbours are cleaned as well because
    // a tile can only be in 2 states:
    //   - displayed and no children displayed
    //   - hidden and all of its children displayed
    // So here we implement a conservative measure: if T is cleanable
    // we actually only clean its children tiles.
    const canCleanCompletely = n.additiveRefinement || depth > 0;

    for (let i = 0; i < n.children.length; i++) {
        // skip non-tiles elements
        if (!n.children[i].content) {
            if (canCleanCompletely) {
                n.children[i].traverse(_cleanupObject3D);
            }
        } else {
            cleanup3dTileset(layer, n.children[i], depth + 1);
        }
    }


    if (canCleanCompletely) {
        if (n.dispose) {
            n.dispose();
        }
        delete n.content;
        layer.tileIndex.index[n.tileId].loaded = false;
        n.remove(...n.children);

        // and finally remove from parent
        if (depth == 0 && n.parent) {
            n.parent.remove(n);
        }
    } else {
        const tiles = n.children.filter(n => n.tileId != undefined);
        n.remove(...tiles);
    }
}

// This function is used to cleanup a Object3D hierarchy.
// (no 3dtiles spectific code here because this is managed by cleanup3dTileset)
function _cleanupObject3D(n) {
    // all children of 'n' are raw Object3D
    for (const child of n.children) {
        _cleanupObject3D(child);
    }
    // free resources
    if (n.material) {
        n.material.dispose();
    }
    if (n.geometry) {
        n.geometry.dispose();
    }
    n.remove(...n.children);
}

export function pre3dTilesUpdate(context, layer) {
    if (!layer.visible) {
        return [];
    }

    // pre-sse
    const hypotenuse = Math.sqrt(context.camera.width * context.camera.width + context.camera.height * context.camera.height);
    const radAngle = context.camera.camera3D.fov * Math.PI / 180;

     // TODO: not correct -> see new preSSE
    // const HFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) / context.camera.ratio);
    const HYFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) * hypotenuse / context.camera.width);
    context.camera.preSSE = hypotenuse * (2.0 * Math.tan(HYFOV * 0.5));

    // once in a while, garbage collect
    if (Math.random() > 0.98) {
        // Make sure we don't clean root tile
        layer.root.cleanableSince = undefined;

        // Browse
        const now = Date.now();

        for (const elt of layer._cleanableTiles) {
            if ((now - elt.cleanableSince) > layer.cleanupDelay) {
                cleanup3dTileset(layer, elt);
            }
        }
        layer._cleanableTiles = layer._cleanableTiles.filter(n => (layer.tileIndex.index[n.tileId].loaded && n.cleanableSince));
    }

    return [layer.root];
}

const cameraLocalPosition = new THREE.Vector3();
const worldPosition = new THREE.Vector3();
function computeNodeSSE(camera, node) {
    node.distance = 0;
    if (node.boundingVolume.region) {
        worldPosition.setFromMatrixPosition(node.boundingVolume.region.matrixWorld);
        cameraLocalPosition.copy(camera.camera3D.position).sub(worldPosition);
        node.distance = node.boundingVolume.region.box3D.distanceToPoint(cameraLocalPosition);
    } else if (node.boundingVolume.box) {
        worldPosition.setFromMatrixPosition(node.matrixWorld);
        cameraLocalPosition.copy(camera.camera3D.position).sub(worldPosition);
        node.distance = node.boundingVolume.box.distanceToPoint(cameraLocalPosition);
    } else if (node.boundingVolume.sphere) {
        worldPosition.setFromMatrixPosition(node.matrixWorld);
        cameraLocalPosition.copy(camera.camera3D.position).sub(worldPosition);
        node.distance = Math.max(0.0, node.boundingVolume.sphere.distanceToPoint(cameraLocalPosition));
    } else {
        return Infinity;
    }
    if (node.distance === 0) {
        // This test is needed in case geometricError = distance = 0
        return Infinity;
    }
    return camera.preSSE * (node.geometricError / node.distance);
}

export function init3dTilesLayer(view, scheduler, layer) {
    return requestNewTile(view, scheduler, layer, layer.tileset.root, undefined, true).then(
            (tile) => {
                delete layer.tileset;
                layer.object3d.add(tile);
                tile.updateMatrixWorld();
                layer.tileIndex.index[tile.tileId].loaded = true;
                layer.root = tile;
            });
}

function setDisplayed(node, display) {
    // The geometry of the tile is not in node, but in node.content
    // To change the display state, we change node.content.visible instead of
    // node.material.visible
    if (node.content) {
        node.content.visible = display;
    }
}

function markForDeletion(layer, elt) {
    if (!elt.cleanableSince) {
        elt.cleanableSince = Date.now();
        layer._cleanableTiles.push(elt);
    }
}

export function process3dTilesNode(cullingTest, subdivisionTest) {
    return function _process3dTilesNodes(context, layer, node) {
        // early exit if parent's subdivision is in progress
        if (node.parent.pendingSubdivision && !node.parent.additiveRefinement) {
            node.visible = false;
            return undefined;
        }

        // do proper culling
        const isVisible = cullingTest ? (!cullingTest(context.camera, node, node.matrixWorld)) : true;
        node.visible = isVisible;


        if (isVisible) {
            node.cleanableSince = undefined;

            let returnValue;
            if (node.pendingSubdivision || subdivisionTest(context, layer, node)) {
                subdivideNode(context, layer, node, cullingTest);
                // display iff children aren't ready
                setDisplayed(node, node.pendingSubdivision || node.additiveRefinement);
                returnValue = node.children.filter(n => n.layer == layer);
            } else {
                setDisplayed(node, true);

                for (const n of node.children.filter(n => n.layer == layer)) {
                    n.visible = false;
                    markForDeletion(layer, n);
                }
            }
            // toggle wireframe
            if (node.content && node.content.visible) {
                node.content.traverse((o) => {
                    if (o.material) {
                        o.material.wireframe = layer.wireframe;
                    }
                });
            }
            return returnValue;
        }

        markForDeletion(layer, node);

        return undefined;
    };
}

export function $3dTilesSubdivisionControl(context, layer, node) {
    if (layer.tileIndex.index[node.tileId].children === undefined) {
        return false;
    }
    const sse = computeNodeSSE(context.camera, node);
    return sse > layer.sseThreshold;
}
