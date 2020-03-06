import * as THREE from 'three';
import RenderMode from 'Renderer/RenderMode';
import { unpack1K } from 'Renderer/LayeredMaterial';

function hideEverythingElse(view, object, threejsLayer = 0) {
    // We want to render only 'object' and its hierarchy.
    // So if it uses threejsLayer defined -> force it on the camera
    // (or use the default one: 0)
    const prev = view.camera.camera3D.layers.mask;

    view.camera.camera3D.layers.mask = 1 << threejsLayer;

    return () => {
        view.camera.camera3D.layers.mask = prev;
    };
}

const depthRGBA = new THREE.Vector4();
// TileMesh picking support function
function screenCoordsToNodeId(view, tileLayer, viewCoords, radius = 0) {
    const dim = view.mainLoop.gfxEngine.getWindowSize();

    viewCoords = viewCoords || new THREE.Vector2(Math.floor(dim.x / 2), Math.floor(dim.y / 2));

    const restore = tileLayer.level0Nodes.map(n => RenderMode.push(n, RenderMode.MODES.ID));

    const undoHide = hideEverythingElse(view, tileLayer.object3d, tileLayer.threejsLayer);

    const buffer = view.mainLoop.gfxEngine.renderViewToBuffer(
        { camera: view.camera, scene: tileLayer.object3d },
        {
            x: viewCoords.x - radius,
            y: viewCoords.y - radius,
            width: 1 + radius * 2,
            height: 1 + radius * 2,
        });

    undoHide();

    restore.forEach(r => r());

    const ids = [];

    traversePickingCircle(radius, (x, y) => {
        const idx = (y * 2 * radius + x) * 4;
        const data = buffer.slice(idx, (idx + 4) || undefined);
        depthRGBA.fromArray(data).divideScalar(255.0);
        const unpack = unpack1K(depthRGBA, 256 ** 3);

        const _id = Math.round(unpack);
        if (!ids.includes(_id)) {
            ids.push(_id);
        }
    });
    return ids;
}

function traversePickingCircle(radius, callback) {
    // iterate on radius so we get closer to the mouse
    // results first.
    // Result traversal order for radius=2
    // --3--
    // -323-
    // 32123
    // -323
    // --3--
    let prevSq;
    for (let r = 0; r <= radius; r++) {
        const sq = r * r;
        for (let x = -r; x <= r; x++) {
            const sqx = x * x;
            for (let y = -r; y <= r; y++) {
                const dist = sqx + y * y;
                // skip if too far
                if (dist > sq) {
                    continue;
                }
                // skip if belongs to previous
                if (dist <= prevSq) {
                    continue;
                }

                if (callback(x, y) === false) {
                    return;
                }
            }
        }
        prevSq = sq;
    }
}

function findLayerInParent(obj) {
    if (obj.layer) {
        return obj.layer;
    }
    if (obj.parent) {
        return findLayerInParent(obj.parent);
    }
}

const raycaster = new THREE.Raycaster();

/**
 * @module Picking
 *
 * Implement various picking methods for geometry layers.
 * These methods are not meant to be used directly, see View.pickObjectsAt
 * instead.
 *
 * All the methods here takes the same parameters:
 *   - the View instance
 *   - view coordinates (in pixels) where picking should be done
 *   - radius (in pixels) of the picking circle
 *   - layer: the geometry layer used for picking
 */
export default {
    pickTilesAt(view, viewCoords, radius, layer, results = []) {
        const _ids = screenCoordsToNodeId(view, layer, viewCoords, radius);

        const extractResult = (node) => {
            if (_ids.includes(node.id) && node.isTileMesh) {
                results.push({
                    object: node,
                    layer,
                });
            }
        };
        for (const n of layer.level0Nodes) {
            n.traverse(extractResult);
        }
        return results;
    },

    pickPointsAt(view, viewCoords, radius, layer, result = []) {
        if (!layer.root) {
            return;
        }

        // enable picking mode for points material
        layer.object3d.traverse((o) => {
            if (o.isPoints && o.baseId) {
                o.material.enablePicking(true);
            }
        });

        const undoHide = hideEverythingElse(view, layer.object3d, layer.threejsLayer);

        // render 1 pixel
        // TODO: support more than 1 pixel selection
        const buffer = view.mainLoop.gfxEngine.renderViewToBuffer(
            { camera: view.camera, scene: layer.object3d },
            {
                x: viewCoords.x - radius,
                y: viewCoords.y - radius,
                width: 1 + radius * 2,
                height: 1 + radius * 2,
            });

        undoHide();

        const candidates = [];

        traversePickingCircle(radius, (x, y) => {
            const idx = (y * 2 * radius + x) * 4;
            const data = buffer.slice(idx, idx + 4);

            // see PotreeProvider and the construction of unique_id
            const objId = (data[0] << 8) | data[1];
            const index = (data[2] << 8) | data[3];

            const r = { objId, index };

            for (let i = 0; i < candidates.length; i++) {
                if (candidates[i].objId == r.objId && candidates[i].index == r.index) {
                    return;
                }
            }
            candidates.push(r);
        });

        layer.object3d.traverse((o) => {
            if (o.isPoints && o.baseId) {
                // disable picking mode
                o.material.enablePicking(false);

                // if baseId matches objId, the clicked point belongs to `o`
                for (let i = 0; i < candidates.length; i++) {
                    if (candidates[i].objId == o.baseId) {
                        result.push({
                            object: o,
                            index: candidates[i].index,
                            layer,
                        });
                    }
                }
            }
        });

        return result;
    },

    /*
     * Default picking method. Uses THREE.Raycaster
     */
    pickObjectsAt(view, viewCoords, radius, object, target = [], threejsLayer) {
        if (threejsLayer !== undefined) {
            raycaster.layers.set(threejsLayer);
        } else {
            raycaster.layers.enableAll();
        }
        if (radius < 0) {
            const normalized = view.viewToNormalizedCoords(viewCoords);
            raycaster.setFromCamera(normalized, view.camera.camera3D);

            const intersects = raycaster.intersectObject(object, true);
            for (const inter of intersects) {
                inter.layer = findLayerInParent(inter.object);
                target.push(inter);
            }

            return target;
        }
        // Instead of doing N raycast (1 per x,y returned by traversePickingCircle),
        // we force render the zone of interest.
        // Then we'll only do raycasting for the pixels where something was drawn.
        const zone = {
            x: viewCoords.x - radius,
            y: viewCoords.y - radius,
            width: 1 + radius * 2,
            height: 1 + radius * 2,
        };
        const pixels = view.mainLoop.gfxEngine.renderViewToBuffer(
            { scene: object, camera: view.camera },
            zone);

        const clearColor = view.mainLoop.gfxEngine.renderer.getClearColor();
        const clearR = Math.round(255 * clearColor.r);
        const clearG = Math.round(255 * clearColor.g);
        const clearB = Math.round(255 * clearColor.b);

        // Raycaster use NDC coordinate
        const normalized = view.viewToNormalizedCoords(viewCoords);
        const tmp = normalized.clone();
        traversePickingCircle(radius, (x, y) => {
            // x, y are offset from the center of the picking circle,
            // and pixels is a square where 0, 0 is the top-left corner.
            // So we need to shift x,y by radius.
            const xi = x + radius;
            const yi = y + radius;
            const offset = (yi * (radius * 2 + 1) + xi) * 4;
            const r = pixels[offset];
            const g = pixels[offset + 1];
            const b = pixels[offset + 2];
            // Use approx. test to avoid rounding error or to behave
            // differently depending on hardware rounding mode.
            if (Math.abs(clearR - r) <= 1 &&
                Math.abs(clearG - g) <= 1 &&
                Math.abs(clearB - b) <= 1) {
                // skip because nothing has been rendered here
                return;
            }

            // Perform raycasting
            tmp.setX(normalized.x + x / view.camera.width)
                .setY(normalized.y + y / view.camera.height);
            raycaster.setFromCamera(
                tmp,
                view.camera.camera3D);

            const intersects = raycaster.intersectObject(object, true);
            for (const inter of intersects) {
                inter.layer = findLayerInParent(inter.object);
                target.push(inter);
            }

            // Stop at first hit
            return target.length == 0;
        });

        return target;
    },
};
