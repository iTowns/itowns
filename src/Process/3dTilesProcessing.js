import Fetcher from '../Core/Scheduler/Providers/Fetcher';
import { $3dTilesIndex } from '../Core/Scheduler/Providers/3dTiles_Provider';

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
export function pre3dTilesUpdate(context) {
    // pre-sse
    const hypotenuse = Math.sqrt(context.camera.width * context.camera.width + context.camera.height * context.camera.height);
    const radAngle = context.camera.camera3D.fov * Math.PI / 180;

     // TODO: not correct -> see new preSSE
    // const HFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) / context.camera.ratio);
    const HYFOV = 2.0 * Math.atan(Math.tan(radAngle * 0.5) * hypotenuse / context.camera.width);
    preSSE = hypotenuse * (2.0 * Math.tan(HYFOV * 0.5));
}

// Improved zoom geometry
function computeNodeSSE(camera, node) {
    if (node.boundingVolume.region) {
        const worldCoordinateCenter = node.boundingVolume.region.centerWorld;
        worldCoordinateCenter.applyMatrix4(node.matrixWorld);
        const distance = camera.camera3D.position.distanceTo(worldCoordinateCenter);
        return preSSE * (node.geometricError / distance);
    }
    if (node.boundingVolume.box) {
        // TODO: compute proper distance
        const worldCoordinateCenter = node.boundingVolume.box.getCenter();
        worldCoordinateCenter.applyMatrix4(node.matrixWorld);
        const distance = camera.camera3D.position.distanceTo(worldCoordinateCenter);
        return preSSE * (node.geometricError / distance);
    } else if (node.boundingVolume.sphere) {
        const worldCoordinateCenter = node.boundingVolume.sphere.center.clone();
        worldCoordinateCenter.applyMatrix4(node.matrixWorld);
        const distance = Math.max(
            0.0,
            camera.camera3D.position.distanceTo(worldCoordinateCenter) - node.boundingVolume.sphere.radius);
        return preSSE * (node.geometricError / distance);
    }
    return Infinity;
}

export function init3dTilesLayer(context, layer) {
    if (layer.initialised) {
        return;
    }
    layer.initialised = true;

    Fetcher.json(layer.url, layer.networkOptions).then((tileset) => {
        const urlPrefix = layer.url.slice(0, layer.url.lastIndexOf('/') + 1);
        layer.tileIndex = new $3dTilesIndex(tileset, urlPrefix);
        layer.asset = tileset.asset;
        requestNewTile(context.view, context.scheduler, layer, tileset.root, undefined).then(
            (tile) => {
                layer.object3d.add(tile);
                tile.updateMatrixWorld();
                layer.root = tile;
            });
    });
}

export function process3dTilesNode(cullingTest, subdivisionTest) {
    return function _process3dTilesNodes(context, layer, node) {
        // early exit if parent' subdivision is in progress
        if (node.parent.pendingSubdivision && !node.parent.additiveRefinement) {
            node.visible = false;
            // TODO: node.setDisplayed(false)?
            if (node.material) {
                node.material.visible = false;
            }
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
                if (node.material) {
                    node.material.visible = node.pendingSubdivision || node.additiveRefinement;
                }
                returnValue = node.children.filter(n => n.layer == layer.id);
            } else if (node.material) {
                node.material.visible = true;
            }

            if ((node.material === undefined || node.material.visible)) {
                for (const n of node.children.filter(n => n.layer == layer.id)) {
                    n.visible = false;
                    if (n.material) {
                        n.material.visible = false;
                    }
                }
            }

            return returnValue;
        }

        if (node.material) {
            node.material.visible = false;
        }

        // TODO: cleanup tree
        return undefined;
    };
}

export function $3dTilesSubdivisionControl(context, layer, node) {
    const sse = computeNodeSSE(context.camera, node);

    return sse > 1.0;
}
