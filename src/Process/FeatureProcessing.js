import * as THREE from 'three';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import handlingError from 'Process/handlerNodeError';
import Coordinates from 'Core/Geographic/Coordinates';

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

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
        } else if (!node.layerUpdateState[layer.id].canTryUpdate()) {
            return;
        }

        const features = node.children.filter(n => n.layer == layer);

        if (features.length > 0) {
            return features;
        }

        const extentsDestination = node.getExtentsByProjection(layer.source.crs) || [node.extent];

        const zoomDest = extentsDestination[0].zoom;

        // check if it's tile level is equal to display level layer.
        if (zoomDest != layer.zoom.min ||
        // check if there's data in extent tile.
            !this.source.extentInsideLimit(node.extent, zoomDest) ||
        // In FileSource case, check if the feature center is in extent tile.
            (layer.source.isFileSource && !node.extent.isPointInside(layer.source.extent.center(coord)))) {
        // if not, there's not data to add at this tile.
            node.layerUpdateState[layer.id].noMoreUpdatePossible();
            return;
        }

        node.layerUpdateState[layer.id].newTry();

        const command = {
            layer,
            extentsSource: extentsDestination,
            view: context.view,
            threejsLayer: layer.threejsLayer,
            requester: node,
        };

        return context.scheduler.execute(command).then((result) => {
            // if request return empty json, WFSProvider.getFeatures return undefined
            result = result[0];
            if (result) {
                // call onMeshCreated callback if needed
                if (layer.onMeshCreated) {
                    layer.onMeshCreated(result);
                }
                node.layerUpdateState[layer.id].success();
                if (!node.parent) {
                    ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, result);
                    return;
                }
                // remove old group layer
                node.remove(...node.children.filter(c => c.layer && c.layer.id == layer.id));
                const group = new THREE.Group();
                group.layer = layer;
                group.matrixWorld.copy(node.matrixWorld).invert();
                group.matrixWorld.decompose(group.position, group.quaternion, group.scale);
                group.position.z += node.geoidHeight;
                node.add(group.add(result));
                group.updateMatrixWorld(true);
            } else {
                node.layerUpdateState[layer.id].failure(1, true);
            }
        },
        err => handlingError(err, node, layer, node.level, context.view));
    },
};
