import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';

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

function getChildTiles(tile) {
    // only keep children that have the same layer and a valid tileId
    return tile.children.filter(n => n.layer == tile.layer && n.tileId);
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

const tmpBox3 = new THREE.Box3();
const tmpSphere = new THREE.Sphere();
function boundingVolumeToExtent(crs, volume, transform) {
    if (volume.region) {
        const box = tmpBox3.copy(volume.region.box3D)
            .applyMatrix4(volume.region.matrixWorld);
        return Extent.fromBox3(crs, box);
    } else if (volume.box) {
        const box = tmpBox3.copy(volume.box).applyMatrix4(transform);
        return Extent.fromBox3(crs, box);
    } else {
        const sphere = tmpSphere.copy(volume.sphere).applyMatrix4(transform);
        return new Extent(crs, {
            west: sphere.center.x - sphere.radius,
            east: sphere.center.x + sphere.radius,
            south: sphere.center.y - sphere.radius,
            north: sphere.center.y + sphere.radius,
        });
    }
}

const tmpMatrix = new THREE.Matrix4();
function _subdivideNodeAdditive(context, layer, node, cullingTest) {
    for (const child of layer.tileset.tiles[node.tileId].children) {
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

        const isVisible = cullingTest ? !cullingTest(layer, context.camera, child, overrideMatrixWorld) : true;

        // child is not visible => skip
        if (!isVisible) {
            continue;
        }
        child.promise = requestNewTile(context.view, context.scheduler, layer, child, node, true).then((tile) => {
            node.add(tile);
            tile.updateMatrixWorld();

            const extent = boundingVolumeToExtent(layer.extent.crs, tile.boundingVolume, tile.matrixWorld);
            tile.traverse((obj) => {
                obj.extent = extent;
            });
            layer.onTileContentLoaded(tile);

            context.view.notifyChange(child);
            child.loaded = true;
            delete child.promise;
        });
    }
}

function _subdivideNodeSubstractive(context, layer, node) {
    if (!node.pendingSubdivision && getChildTiles(node).length == 0) {
        const childrenTiles = layer.tileset.tiles[node.tileId].children;
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
                        context.view.notifyChange(node);
                    }
                    layer.tileset.tiles[tile.tileId].loaded = true;
                    layer.onTileContentLoaded(tile);
                }));
        }
        Promise.all(promises).then(() => {
            node.pendingSubdivision = false;
            context.view.notifyChange(node);
        });
    }
}

export function $3dTilesCulling(layer, camera, node, tileMatrixWorld) {
    // For viewer Request Volume
    // https://github.com/AnalyticalGraphicsInc/3d-tiles-samples/tree/master/tilesets/TilesetWithRequestVolume
    if (node.viewerRequestVolume && node.viewerRequestVolume.viewerRequestVolumeCulling(
        camera, tileMatrixWorld)) {
        return true;
    }

    // For bounding volume
    if (node.boundingVolume &&
        node.boundingVolume.boundingVolumeCulling(camera, tileMatrixWorld)) {
        return true;
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
        layer.tileset.tiles[n.tileId].loaded = false;
        n.remove(...n.children);

        // and finally remove from parent
        if (depth == 0 && n.parent) {
            n.parent.remove(n);
        }
    } else {
        const tiles = getChildTiles(n);
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
        // material can be either a THREE.Material object, or an array of
        // THREE.Material objects
        if (Array.isArray(n.material)) {
            for (const material of n.material) {
                material.dispose();
            }
        } else {
            n.material.dispose();
        }
    }
    if (n.geometry) {
        n.geometry.dispose();
    }
    n.remove(...n.children);
}

// this is a layer
export function pre3dTilesUpdate() {
    if (!this.visible) {
        return [];
    }

    // Elements removed are added in the layer._cleanableTiles list.
    // Since we simply push in this array, the first item is always
    // the oldest one.
    const now = Date.now();
    if (this._cleanableTiles.length
        && (now - this._cleanableTiles[0].cleanableSince) > this.cleanupDelay) {
        // Make sure we don't clean root tile
        this.root.cleanableSince = undefined;

        let i = 0;
        for (; i < this._cleanableTiles.length; i++) {
            const elt = this._cleanableTiles[i];
            if ((now - elt.cleanableSince) > this.cleanupDelay) {
                cleanup3dTileset(this, elt);
            } else {
                // later entries are younger
                break;
            }
        }
        // remove deleted elements from _cleanableTiles
        this._cleanableTiles.splice(0, i);
    }

    return [this.root];
}

const boundingVolumeBox = new THREE.Box3();
const boundingVolumeSphere = new THREE.Sphere();
export function computeNodeSSE(camera, node) {
    node.distance = 0;
    if (node.boundingVolume.region) {
        boundingVolumeBox.copy(node.boundingVolume.region.box3D);
        boundingVolumeBox.applyMatrix4(node.boundingVolume.region.matrixWorld);
        node.distance = boundingVolumeBox.distanceToPoint(camera.camera3D.position);
    } else if (node.boundingVolume.box) {
        // boundingVolume.box is affected by matrixWorld
        boundingVolumeBox.copy(node.boundingVolume.box);
        boundingVolumeBox.applyMatrix4(node.matrixWorld);
        node.distance = boundingVolumeBox.distanceToPoint(camera.camera3D.position);
    } else if (node.boundingVolume.sphere) {
        // boundingVolume.sphere is affected by matrixWorld
        boundingVolumeSphere.copy(node.boundingVolume.sphere);
        boundingVolumeSphere.applyMatrix4(node.matrixWorld);
        // TODO: see https://github.com/iTowns/itowns/issues/800
        node.distance = Math.max(0.0,
            boundingVolumeSphere.distanceToPoint(camera.camera3D.position));
    } else {
        return Infinity;
    }
    if (node.distance === 0) {
        // This test is needed in case geometricError = distance = 0
        return Infinity;
    }
    return camera._preSSE * (node.geometricError / node.distance);
}

export function init3dTilesLayer(view, scheduler, layer, rootTile) {
    return requestNewTile(view, scheduler, layer, rootTile, undefined, true).then(
        (tile) => {
            layer.object3d.add(tile);
            tile.updateMatrixWorld();
            layer.tileset.tiles[tile.tileId].loaded = true;
            layer.root = tile;
            layer.extent = boundingVolumeToExtent(layer.crs || view.referenceCrs,
                tile.boundingVolume, tile.matrixWorld);
            layer.onTileContentLoaded(tile);
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

export function process3dTilesNode(cullingTest = $3dTilesCulling, subdivisionTest = $3dTilesSubdivisionControl) {
    return function _process3dTilesNodes(context, layer, node) {
        // early exit if parent's subdivision is in progress
        if (node.parent.pendingSubdivision && !node.parent.additiveRefinement) {
            node.visible = false;
            return undefined;
        }

        // do proper culling
        const isVisible = cullingTest ? (!cullingTest(layer, context.camera, node, node.matrixWorld)) : true;
        node.visible = isVisible;

        if (isVisible) {
            if (node.cleanableSince) {
                layer._cleanableTiles.splice(layer._cleanableTiles.indexOf(node), 1);
                node.cleanableSince = undefined;
            }

            let returnValue;
            if (node.pendingSubdivision || subdivisionTest(context, layer, node)) {
                subdivideNode(context, layer, node, cullingTest);
                // display iff children aren't ready
                setDisplayed(node, node.pendingSubdivision || node.additiveRefinement);
                returnValue = getChildTiles(node);
            } else {
                setDisplayed(node, true);

                for (const n of getChildTiles(node)) {
                    n.visible = false;
                    markForDeletion(layer, n);
                }
            }
            return returnValue;
        }

        markForDeletion(layer, node);
    };
}

export function $3dTilesSubdivisionControl(context, layer, node) {
    if (layer.tileset.tiles[node.tileId].children === undefined) {
        return false;
    }
    if (layer.tileset.tiles[node.tileId].isTileset) {
        return true;
    }
    const sse = computeNodeSSE(context.camera, node);
    return sse > layer.sseThreshold;
}
