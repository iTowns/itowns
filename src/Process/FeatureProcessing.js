import * as THREE from 'three';
import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import CancelledCommandException from '../Core/Scheduler/CancelledCommandException';
import ObjectRemovalHelper from './ObjectRemovalHelper';


const vector = new THREE.Vector3();
function applyOffset(obj, offset, quaternion, offsetAltitude) {
    if (obj.geometry) {
        if (obj.geometry instanceof THREE.BufferGeometry) {
            for (let i = 0; i < obj.geometry.attributes.position.count; i++) {
                const i3 = 3 * i;
                vector.fromArray(obj.geometry.attributes.position.array, i3);
                vector.add(offset).applyQuaternion(quaternion);
                if (offsetAltitude) {
                    vector.z -= offsetAltitude;
                }
                vector.toArray(obj.geometry.attributes.position.array, i3);
            }
            obj.geometry.attributes.position.needsUpdate = true;
        } else {
            for (const v of obj.geometry.vertices) {
                v.add(offset).applyQuaternion(quaternion);
                if (offsetAltitude) {
                    v.z -= offsetAltitude;
                }
            }
            obj.geometry.verticesNeedUpdate = true;
        }
    }
    obj.children.forEach(c => applyOffset(c, offset, quaternion, offsetAltitude));
}

const quaternion = new THREE.Quaternion();
export default {
    update(context, layer, node) {
        if (!node.parent && node.children.length) {
            // if node has been removed dispose three.js resource
            ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer.id, node);
            return;
        }
        if (!node.visible) {
            return;
        }

        const features = node.children.filter(n => n.layer == layer);
        for (const feat of features) {
            feat.traverse((o) => {
                if (o.material) {
                    o.material.transparent = layer.opacity < 1.0;
                    o.material.opacity = layer.opacity;
                    o.material.wireframe = layer.wireframe;

                    if (layer.size) {
                        o.material.size = layer.size;
                    }
                    if (layer.linewidth) {
                        o.material.linewidth = layer.linewidth;
                    }
                }
            });
        }
        if (features.length > 0) {
            return features;
        }

        if (!layer.tileInsideLimit(node, layer)) {
            return;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();
        }

        const ts = Date.now();

        if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
            return;
        }

        node.layerUpdateState[layer.id].newTry();

        const command = {
            layer,
            view: context.view,
            threejsLayer: layer.threejsLayer,
            requester: node,
        };

        context.scheduler.execute(command).then((result) => {
            // if request return empty json, WFSProvider.getFeatures return undefined
            if (result) {
                // call onMeshCreated callback if needed
                if (layer.onMeshCreated) {
                    layer.onMeshCreated(result);
                }
                node.layerUpdateState[layer.id].success();
                if (!node.parent) {
                    ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer.id, result);
                    return;
                }
                // We don't use node.matrixWorld here, because feature coordinates are
                // expressed in crs coordinates (which may be different than world coordinates,
                // if node's layer is attached to an Object with a non-identity transformation)
                const tmp = node.extent.center().as(context.view.referenceCrs).xyz().negate();
                quaternion.setFromRotationMatrix(node.matrixWorld).inverse();
                // const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), node.extent.center().geodesicNormal).inverse();
                applyOffset(result, tmp, quaternion, result.minAltitude);
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
        (err) => {
            if (err instanceof CancelledCommandException) {
                node.layerUpdateState[layer.id].success();
            } else if (err instanceof SyntaxError) {
                node.layerUpdateState[layer.id].failure(0, true);
            } else {
                node.layerUpdateState[layer.id].failure(Date.now());
                setTimeout(node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000,
                    () => {
                        context.view.notifyChange(false);
                    });
            }
        });
    },
};
