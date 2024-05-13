import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import handlingError from 'Process/handlerNodeError';
import Coordinates from 'Core/Geographic/Coordinates';
import { geoidLayerIsVisible } from 'Layer/GeoidLayer';

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
            // toggle visibility features
            node.link[layer.id]?.forEach((f) => {
                f.layer.object3d.add(f);
                f.meshes.position.z = geoidLayerIsVisible(layer.parent) ? node.geoidHeight : 0;
                f.meshes.updateMatrixWorld();
            });
            return;
        }

        const extentsDestination = node.getExtentsByProjection(layer.source.crs) || [node.extent];

        const zoomDest = extentsDestination[0].zoom;

        // check if it's tile level is equal to display level layer.
        // TO DO updata at all level asked
        // if ((zoomDest < layer.zoom.min && zoomDest > layer.zoom.max) ||
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
            requester: node,
        };

        return context.scheduler.execute(command).then((featureMeshes) => {
            node.layerUpdateState[layer.id].noMoreUpdatePossible();

            featureMeshes.forEach((featureMesh) => {
                if (featureMesh) {
                    node.link[layer.id] = node.link[layer.id] || [];
                    featureMesh.as(context.view.referenceCrs);
                    featureMesh.meshes.position.z = geoidLayerIsVisible(layer.parent) ? node.geoidHeight : 0;
                    featureMesh.updateMatrixWorld();

                    if (layer.onMeshCreated) {
                        layer.onMeshCreated(featureMesh, context);
                    }

                    if (!node.parent) {
                        // TODO: Clean cache needs a refactory, because it isn't really efficient and used
                        ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer, featureMesh);
                    } else {
                        layer.object3d.add(featureMesh);
                        node.link[layer.id].push(featureMesh);
                    }
                    featureMesh.layer = layer;
                } else {
                    // TODO: verify if it's possible the featureMesh is undefined.
                    node.layerUpdateState[layer.id].failure(1, true);
                }
            });
        },
        err => handlingError(err, node, layer, node.level, context.view));
    },
};
