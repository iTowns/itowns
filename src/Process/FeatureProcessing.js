import * as THREE from 'three';
import LayerUpdateState from '../Core/Layer/LayerUpdateState';
import { CancelledCommandException } from '../Core/Scheduler/Scheduler';
import ObjectRemovalHelper from './ObjectRemovalHelper';

function applyOffset(obj, offset) {
    if (obj.geometry) {
        if (obj.geometry instanceof THREE.BufferGeometry) {
            for (let i = 0; i < obj.geometry.attributes.position.count; i++) {
                obj.geometry.attributes.position.array[3 * i] += offset.x;
                obj.geometry.attributes.position.array[3 * i + 1] += offset.y;
                obj.geometry.attributes.position.array[3 * i + 2] += offset.z;
            }
            obj.geometry.attributes.position.needsUpdate = true;
        } else {
            for (const v of obj.geometry.vertices) {
                v.add(offset);
            }
            obj.geometry.verticesNeedUpdate = true;
        }
    }
    obj.children.forEach(c => applyOffset(c, offset));
}

export default {
    update(colorFunction) {
        return function _(context, layer, node) {
            if (!node.parent && node.children.length) {
                // if node has been removed dispose three.js resource
                ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer.id, node);
                return;
            }
            if (!node.visible) {
                return;
            }

            const features = node.children.filter(n => n.layer == layer.id);
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
                // if request return empty json, WFS_Provider.getFeatures return undefined
                if (result) {
                    node.layerUpdateState[layer.id].success();
                    if (!node.parent) {
                        ObjectRemovalHelper.removeChildrenAndCleanupRecursively(layer.id, result);
                        return;
                    }
                    // We don't use node.matrixWorld here, because feature coordinates are
                    // expressed in crs coordinates (which may be different than world coordinates,
                    // if node's layer is attached to an Object with a non-identity transformation)
                    const tmp = node.extent.center().as(context.view.referenceCrs).xyz().negate();
                    applyOffset(result, tmp);
                    if (colorFunction) {
                        colorFunction(layer, node, result);
                    }

                    result.layer = layer.id;
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
        };
    },

    assignColorsToFeatureCollection(featureCollection, mesh, colors) {
        // add color attribute to the merged mesh
        const colorAttribute = new Uint8Array(mesh.geometry.attributes.position.count * 3);
        // if mesh is extruded, there is twice as many vertices.
        const numVerticesMultiplier = mesh.isExtruded ? 2 : 1;

        for (let i = 0; i < featureCollection.features.length; i++) {
            const featureProperties = featureCollection.features[i].properties;

            const featureVertices = mesh.featureVertices[featureProperties._idx];
            if (featureVertices) {
                // compute the number of vertices
                const numVertices = featureVertices.count * numVerticesMultiplier;
                for (let j = 0; j < numVertices; j++) {
                    const baseIdx = 3 * (featureVertices.offset * numVerticesMultiplier + j);
                    // if mesh is extruded, we make the bottom vertices darker than top vertices to create a pretty shadow effect.
                    // and the bottom vertices are positionned after the top vertices.
                    const brightness = (mesh.isExtruded && j >= featureVertices.count) ? 150 : 255;

                    colorAttribute[baseIdx + 0] = colors[i].r * brightness;
                    colorAttribute[baseIdx + 1] = colors[i].g * brightness;
                    colorAttribute[baseIdx + 2] = colors[i].b * brightness;
                }
            }
        }

        mesh.geometry.addAttribute('color', new THREE.BufferAttribute(colorAttribute, 3, true));
        mesh.material.vertexColors = THREE.VertexColors;
        mesh.material.color = new THREE.Color(0xffffff);
    },
};
