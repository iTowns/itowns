import * as THREE from 'three';
import TileMesh from './TileMesh';
import RendererConstant from '../Renderer/RendererConstant';
import { unpack1K } from '../Renderer/LayeredMaterial';

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
function screenCoordsToNodeId(view, tileLayer, mouse, radius) {
    const dim = view.mainLoop.gfxEngine.getWindowSize();

    mouse = mouse || new THREE.Vector2(Math.floor(dim.x / 2), Math.floor(dim.y / 2));

    const restore = tileLayer.level0Nodes.map(n => n.pushRenderState(RendererConstant.ID));

    const undoHide = hideEverythingElse(view, tileLayer.object3d, tileLayer.threejsLayer);

    const buffer = view.mainLoop.gfxEngine.renderViewToBuffer(
        { camera: view.camera, scene: tileLayer.object3d },
        {
            x: mouse.x - radius,
            y: mouse.y - radius,
            width: 1 + radius * 2,
            height: 1 + radius * 2,
        });

    undoHide();

    restore.forEach(r => r());

    const ids = [];

    traversePickingCircle(radius, (x, y) => {
        const idx = (y * 2 * radius + x) * 4;
        const data = buffer.slice(idx, idx + 4);
        depthRGBA.fromArray(data).divideScalar(255.0);
        const unpack = unpack1K(depthRGBA, Math.pow(256, 3));

        const _id = Math.round(unpack);
        if (ids.indexOf(_id) < 0) {
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

                callback(x, y);
            }
        }
        prevSq = sq;
    }
}

function findLayerIdInParent(obj) {
    if (obj.layer) {
        return obj.layer;
    }
    if (obj.parent) {
        return findLayerIdInParent(obj.parent);
    }
}

const raycaster = new THREE.Raycaster();

export default {
    pickTilesAt: (_view, mouse, radius, layer) => {
        const results = [];
        const _ids = screenCoordsToNodeId(_view, layer, mouse, radius);

        const extractResult = (node) => {
            if (_ids.indexOf(node.id) >= 0 && node instanceof TileMesh) {
                results.push({
                    object: node,
                    layer: layer.id,
                });
            }
        };
        for (const n of layer.level0Nodes) {
            n.traverse(extractResult);
        }
        return results;
    },

    pickPointsAt: (view, mouse, radius, layer) => {
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
                x: mouse.x - radius,
                y: mouse.y - radius,
                width: 1 + radius * 2,
                height: 1 + radius * 2,
            });

        undoHide();

        const candidates = [];

        traversePickingCircle(radius, (x, y) => {
            const idx = (y * 2 * radius + x) * 4;
            const data = buffer.slice(idx, idx + 4);

            // see PointCloudProvider and the construction of unique_id
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

        const result = [];
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
                            layer: layer.id,
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
    pickObjectsAt(view, mouse, radius, object, target = []) {
        // raycaster use NDC coordinate
        const onscreen = view.viewToNormalizedCoords(mouse);
        const tmp = onscreen.clone();

        traversePickingCircle(radius, (x, y) => {
            tmp.setX(onscreen.x + x / view.camera.width)
                .setY(onscreen.y + y / view.camera.height);
            raycaster.setFromCamera(
                tmp,
                view.camera.camera3D);

            const intersects = raycaster.intersectObject(object, true);
            for (const inter of intersects) {
                inter.layer = findLayerIdInParent(inter.object);
                target.push(inter);
            }
        });

        return target;
    },
};
