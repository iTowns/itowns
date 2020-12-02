import * as THREE from 'three';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import handlingError from 'Process/handlerNodeError';
import Coordinates from 'Core/Geographic/Coordinates';

const coord = new Coordinates('EPSG:4326', 0, 0, 0);
const mat4 = new THREE.Matrix4();

function applyMatrix4(obj, mat4) {
    if (obj.geometry) {
        obj.geometry.applyMatrix4(mat4);
    }
    obj.children.forEach(c => applyMatrix4(c, mat4));
}

function assignLayer(object, layer) {
    if (object) {
        object.layer = layer;
        if (object.material) {
            object.material.transparent = layer.opacity < 1.0;
            object.material.opacity = layer.opacity;
            object.material.wireframe = layer.wireframe;

            if (layer.size) {
                object.material.size = layer.size;
            }
            if (layer.linewidth) {
                object.material.linewidth = layer.linewidth;
            }
        }
        object.layers.set(layer.threejsLayer);
        for (const c of object.children) {
            assignLayer(c, layer);
        }
        return object;
    }
}

function extentInsideSource(extent, source) {
    return !source.extentInsideLimit(extent) ||
        (source.isFileSource && !extent.isPointInside(source.extent.center(coord)));
}

export default {
    update(context, layer, node) {
        if (!node.parent && node.children.length) {
            // if node has been removed dispose three.js resource
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, node);
            return;
        }
        if (!node.visible) {
            return;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();
        }

        if (!node.layerUpdateState[layer.id].canTryUpdate()) {
            return;
        }

        const features = node.children.filter(n => n.layer == layer);

        if (features.length > 0) {
            return features;
        }

        const extentsDestination = node.getExtentsByProjection(layer.source.crs) || [node.extent];

        const zoomDest = extentsDestination[0].zoom;

        if (zoomDest != layer.zoom.min) {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }

        const extentsSource = [];
        for (const extentDest of extentsDestination) {
            const ext = layer.source.crs == extentDest.crs ? extentDest : extentDest.as(layer.source.crs);
            ext.zoom = extentDest.zoom;
            if (extentInsideSource(ext, layer.source)) {
                node.layerUpdateState[layer.id].noMoreUpdatePossible();
                return;
            }
            extentsSource.push(extentDest);
        }

        node.layerUpdateState[layer.id].newTry();

        const command = {
            layer,
            extentsSource,
            view: context.view,
            threejsLayer: layer.threejsLayer,
            requester: node,
        };

        return context.scheduler.execute(command).then((result) => {
            // if request return empty json, WFSProvider.getFeatures return undefined
            result = result[0];
            if (result) {
                const isApplied = !result.layer;
                assignLayer(result, layer);
                // call onMeshCreated callback if needed
                if (layer.onMeshCreated) {
                    layer.onMeshCreated(result);
                }
                node.layerUpdateState[layer.id].success();
                if (!node.parent) {
                    ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, result);
                    return;
                }
                // We don't use node.matrixWorld here, because feature coordinates are
                // expressed in crs coordinates (which may be different than world coordinates,
                // if node's layer is attached to an Object with a non-identity transformation)
                if (isApplied) {
                    // NOTE: now data source provider use cache on Mesh
                    // TODO move transform in feature2Mesh
                    mat4.copy(node.matrixWorld).invert().elements[14] -= result.minAltitude;
                    applyMatrix4(result, mat4);
                }

                if (result.minAltitude) {
                    result.position.z = result.minAltitude;
                }
                result.layer = layer;
                node.add(result);
                node.updateMatrixWorld();
            } else {
                node.layerUpdateState[layer.id].failure(1, true);
            }
        },
        err => handlingError(err, node, layer, node.level, context.view));
    },
};
