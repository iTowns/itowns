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
    if (!node.pendingSubdivision && node.children.filter(n => n.layer == layer.id).length == 0) {
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

export function pre3dTilesUpdate(context, layer) {
    // pre-sse
    const hypotenuse = Math.sqrt(context.camera.width * context.camera.width + context.camera.height * context.camera.height);
    const radAngle = context.camera.camera3D.fov * Math.PI / 180;

     // TODO: not correct -> see new preSSE
    // const HFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) / context.camera.ratio);
    const HYFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) * hypotenuse / context.camera.width);
    context.camera.preSSE = hypotenuse * (2.0 * Math.tan(HYFOV * 0.5));
    return [layer.root];
}

// Improved zoom geometry
function computeNodeSSE(camera, node) {
    if (node.boundingVolume.region) {
        const cameraLocalPosition = camera.camera3D.position.clone();
        cameraLocalPosition.x -= node.boundingVolume.region.matrixWorld.elements[12];
        cameraLocalPosition.y -= node.boundingVolume.region.matrixWorld.elements[13];
        cameraLocalPosition.z -= node.boundingVolume.region.matrixWorld.elements[14];
        const distance = node.boundingVolume.region.box3D.distanceToPoint(cameraLocalPosition);
        node.distance = distance;
        return camera.preSSE * (node.geometricError / distance);
    }
    if (node.boundingVolume.box) {
        const cameraLocalPosition = camera.camera3D.position.clone();
        cameraLocalPosition.x -= node.matrixWorld.elements[12];
        cameraLocalPosition.y -= node.matrixWorld.elements[13];
        cameraLocalPosition.z -= node.matrixWorld.elements[14];
        const distance = node.boundingVolume.box.distanceToPoint(cameraLocalPosition);
        node.distance = distance;
        return camera.preSSE * (node.geometricError / distance);
    }
    if (node.boundingVolume.sphere) {
        const cameraLocalPosition = camera.camera3D.position.clone();
        cameraLocalPosition.x -= node.matrixWorld.elements[12];
        cameraLocalPosition.y -= node.matrixWorld.elements[13];
        cameraLocalPosition.z -= node.matrixWorld.elements[14];
        const distance = node.boundingVolume.sphere.distanceToPoint(cameraLocalPosition);
        node.distance = distance;
        return camera.preSSE * (node.geometricError / distance);
    }
    return Infinity;
}

export function init3dTilesLayer(view, scheduler, layer) {
    return requestNewTile(view, scheduler, layer, layer.tileset.root, undefined, true).then(
            (tile) => {
                delete layer.tileset;
                layer.object3d.add(tile);
                tile.updateMatrixWorld();
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

        let returnValue;

        if (isVisible) {
            if (node.pendingSubdivision || subdivisionTest(context, layer, node)) {
                subdivideNode(context, layer, node, cullingTest);
                // display iff children aren't ready
                setDisplayed(node, node.pendingSubdivision || node.additiveRefinement);
                returnValue = node.children.filter(n => n.layer == layer.id);
            } else {
                setDisplayed(node, true);
            }

            if ((node.material === undefined || node.material.visible)) {
                for (const n of node.children.filter(n => n.layer == layer.id)) {
                    n.visible = false;
                }
            }

            return returnValue;
        }

        // TODO: cleanup tree
        return undefined;
    };
}

export function $3dTilesSubdivisionControl(context, layer, node) {
    const sse = computeNodeSSE(context.camera, node);
    return sse > layer.sseThreshold;
}
