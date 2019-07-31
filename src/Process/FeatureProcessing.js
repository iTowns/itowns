import * as THREE from 'three';
import LayerUpdateState from 'Layer/LayerUpdateState';
import ObjectRemovalHelper from 'Process/ObjectRemovalHelper';
import handlingError from 'Process/handlerNodeError';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';

const _extent = new Extent('EPSG:4326', 0, 0, 0, 0);
const coord = new Coordinates('EPSG:4326', 0, 0, 0);
const vector = new THREE.Vector3();
const tmp = new THREE.Vector3();

function applyOffset(obj, offset, quaternion, offsetAltitude = 0) {
    if (obj.geometry) {
        if (obj.geometry.isBufferGeometry) {
            const count = obj.geometry.attributes.position.count * 3;
            for (let i = 0; i < count; i += 3) {
                vector.fromArray(obj.geometry.attributes.position.array, i);
                vector.add(offset).applyQuaternion(quaternion);
                vector.z -= offsetAltitude;
                vector.toArray(obj.geometry.attributes.position.array, i);
            }
            obj.geometry.attributes.position.needsUpdate = true;
        } else {
            for (const v of obj.geometry.vertices) {
                v.add(offset).applyQuaternion(quaternion);
                v.z -= offsetAltitude;
            }
            obj.geometry.verticesNeedUpdate = true;
        }
    }
    obj.children.forEach(c => applyOffset(c, offset, quaternion, offsetAltitude));
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
        (source.parsedData &&
        !source.parsedData.extent.isPointInside(extent.center(coord)));
}

const quaternion = new THREE.Quaternion();
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

        const extentsDestination = node.getExtentsByProjection(layer.source.projection) || [node.extent];

        extentsDestination.forEach((e) => { e.zoom = node.level; });

        const extentsSource = [];
        for (const extentDest of extentsDestination) {
            const ext = layer.source.projection == extentDest.crs ? extentDest : extentDest.as(layer.source.projection);
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
                // special case for FileSource, as it is not tiled and we need
                // to attach it to the correct node
                if (layer.source && layer.source.isFileSource) {
                    for (const extentSrc of extentsSource) {
                        const ext = extentSrc.crs == layer.source.projection ? extentSrc : extentSrc.as(layer.source.projection, _extent);
                        ext.zoom = extentSrc.zoom;
                        if (extentInsideSource(ext, layer.source)) {
                            node.layerUpdateState[layer.id].noMoreUpdatePossible();
                            return;
                        }
                    }
                }

                const isApplied = !result.layer;
                result.minAltitude = isNaN(result.minAltitude) ? 0 : result.minAltitude;
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
                    node.extent.center(coord).as(context.view.referenceCrs, coord).toVector3(tmp).negate();
                    quaternion.setFromRotationMatrix(node.matrixWorld).inverse();
                    // const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), node.extent.center().geodesicNormal).inverse();
                    applyOffset(result, tmp, quaternion, result.minAltitude);
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
