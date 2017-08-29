function requestNewTile(view, scheduler, geometryLayer, metadata, parent) {
    const command = {
        /* mandatory */
        view,
        requester: parent,
        layer: geometryLayer,
        priority: 10000,
        /* specific params */
        metadata,
        redraw: false,
    };

    return scheduler.execute(command);
}

function subdivideNode(context, layer, node) {
    if (!node.pendingSubdivision && node.children.filter(n => n.layer == layer.id).length == 0) {
        node.pendingSubdivision = true;

        const childrenTiles = layer.tileIndex.index[node.tileId].children;
        if (childrenTiles === undefined) {
            return;
        }

        const promises = [];
        for (let i = 0; i < childrenTiles.length; i++) {
            promises.push(
                requestNewTile(context.view, context.scheduler, layer, childrenTiles[i], node).then((tile) => {
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

export function $3dTilesCulling(node, camera) {
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
            worldCoordinateCenter.applyMatrix4(node.matrixWorld);
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
            return !camera.isBox3Visible(boundingVolume.region.box3D, boundingVolume.region.matrixWorld);
        }
        if (boundingVolume.box) {
            return !camera.isBox3Visible(boundingVolume.box, node.matrixWorld);
        }
        if (boundingVolume.sphere) {
            return !camera.isSphereVisible(boundingVolume.sphere, node.matrixWorld);
        }
    }
    return false;
}

let preSSE;
export function pre3dTilesUpdate(context, layer) {
    // pre-sse
    const hypotenuse = Math.sqrt(context.camera.width * context.camera.width + context.camera.height * context.camera.height);
    const radAngle = context.camera.camera3D.fov * Math.PI / 180;

     // TODO: not correct -> see new preSSE
    // const HFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) / context.camera.ratio);
    const HYFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) * hypotenuse / context.camera.width);
    preSSE = hypotenuse * (2.0 * Math.tan(HYFOV * 0.5));
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
        return preSSE * (node.geometricError / distance);
    }
    if (node.boundingVolume.box) {
        const cameraLocalPosition = camera.camera3D.position.clone();
        cameraLocalPosition.x -= node.matrixWorld.elements[12];
        cameraLocalPosition.y -= node.matrixWorld.elements[13];
        cameraLocalPosition.z -= node.matrixWorld.elements[14];
        const distance = node.boundingVolume.box.distanceToPoint(cameraLocalPosition);
        return preSSE * (node.geometricError / distance);
    }
    if (node.boundingVolume.sphere) {
        const cameraLocalPosition = camera.camera3D.position.clone();
        cameraLocalPosition.x -= node.matrixWorld.elements[12];
        cameraLocalPosition.y -= node.matrixWorld.elements[13];
        cameraLocalPosition.z -= node.matrixWorld.elements[14];
        const distance = node.boundingVolume.sphere.distanceToPoint(cameraLocalPosition);
        return preSSE * (node.geometricError / distance);
    }
    return Infinity;
}

export function init3dTilesLayer(view, scheduler, layer) {
    return requestNewTile(view, scheduler, layer, layer.tileset.root).then(
            (tile) => {
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
        const isVisible = cullingTest ? (!cullingTest(node, context.camera)) : true;
        node.visible = isVisible;

        let returnValue;

        if (isVisible) {
            if (node.pendingSubdivision || subdivisionTest(context, layer, node)) {
                subdivideNode(context, layer, node);
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
