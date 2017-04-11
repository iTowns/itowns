/**
 * Generated On: 2015-10-5
 * Class: NodeProcess
 * Description: NodeProcess effectue une opération sur un Node.
 */

import * as THREE from 'three';
import RendererConstant from '../Renderer/RendererConstant';
import { chooseNextLevelToFetch } from './LayerUpdateStrategy';
import { l_ELEVATION, l_COLOR } from '../Renderer/LayeredMaterial';
import LayerUpdateState from './LayerUpdateState';
import { CancelledCommandException } from '../Core/Commander/Scheduler';
import { ellipsoidSizes } from '../Core/Geographic/Coordinates';

export const SSE_SUBDIVISION_THRESHOLD = 6.0;

function NodeProcess(scene) {
    // TODO: consider removing this.scene + replacing scene.notifyChange by an event
    this.scene = scene;

    this.vhMagnitudeSquared = 1.0;

    this.r = ellipsoidSizes();
    this.cV = new THREE.Vector3();
}

/**
 * @documentation: Apply backface culling on node, change visibility; return true if the node is visible
 * @param {type} node   : node to cull
 * @param {type} camera : camera for the culling
 * @returns {Boolean}
 */
NodeProcess.prototype.backFaceCulling = function backFaceCulling(node, camera) {
    var normal = camera.direction;
    for (var n = 0; n < node.normals().length; n++) {
        var dot = normal.dot(node.normals()[n]);
        if (dot > 0) {
            node.visible = true;
            return true;
        }
    }

    // ??node.visible = true;

    return node.visible;
};

/**
 * @documentation:
 * @param  {type} node  : the node to try to cull
 * @param  {type} camera: the camera used for culling
 * @return {Boolean}      the culling attempt's result
 */
NodeProcess.prototype.isCulled = function isCulled(node, camera) {
    return !(this.frustumCullingOBB(node, camera) && this.horizonCulling(node, camera));
};

/**
 * @documentation: Cull node with frustrum
 * @param {type} node   : node to cull
 * @param {type} camera : camera for culling
 * @returns {unresolved}
 */
NodeProcess.prototype.frustumCulling = function frustumCulling(node, camera) {
    var frustum = camera.frustum;

    return frustum.intersectsObject(node);
};

NodeProcess.prototype.checkNodeSSE = function checkNodeSSE(node) {
    return SSE_SUBDIVISION_THRESHOLD < node.sse || node.level <= 2;
};

NodeProcess.prototype.subdivideNode = function subdivideNode(node, camera, params) {
    if (!node.pendingSubdivision && node.noChild()) {
        const bboxes = params.tree.subdivideNode(node);
        node.pendingSubdivision = true;

        for (var i = 0; i < bboxes.length; i++) {
            const quadtree = params.tree;
            const command = {
                /* mandatory */
                requester: node,
                layer: params.layersConfig.getGeometryLayers()[0],
                priority: 10000,
                /* specific params */
                bbox: bboxes[i],
                type: quadtree.type,
                redraw: false,
            };

            quadtree.scheduler.execute(command).then((child) => {
                child.setLightingParameters(params.layersConfig.lightingLayers[0]);

                // request layers (imagery/elevation) update
                this.refineNodeLayers(child, camera, params);

                if (__DEBUG__) {
                    const geometryLayer = params.layersConfig.getGeometryLayers()[0];
                    child.material.uniforms.showOutline = { value: geometryLayer.showOutline || false };
                    child.material.wireframe = geometryLayer.wireframe || false;
                }

                return 0;
            });
        }
    }
};

function refinementCommandCancellationFn(cmd) {
    if (!cmd.requester.parent || !cmd.requester.material) {
        return true;
    }
    // If node A is divided into A1, A2, A3, A4 and the user zooms fast enough on A2
    // We might end up in a situation where:
    //    - commands for A1, A3 or A4 are canceled because they're not visible anymore
    //    - A2 A2 cannot be displayed because A won't be hidden until all of its
    //      children are loaded.

    // allow cancellation of the command if the node isn't visible anymore
    return cmd.requester.parent.childrenLoaded() &&
        cmd.requester.visible === false &&
        cmd.requester.level >= 2;
}

NodeProcess.prototype.refineNodeLayers = function refineNodeLayers(node, camera, params) {
    // Elevation and Imagery updates require separate functions (for now):
    //   * a node can only have 1 elevation texture
    //   * a node inherits elevation texture from parent, even if tileInsideLimit(node)
    //     returns false
    //   * elevation uses a grouping strategy (see TileMesh.levelElevation)
    const layerFunctions = [
        updateNodeElevation,
        updateNodeImagery,
    ];

    for (let typeLayer = 0; typeLayer < 2; typeLayer++) {
        if (!node.loaded || node.isLayerTypeDownscaled(typeLayer)) {
            layerFunctions[typeLayer](this.scene, params.tree, node, params.layersConfig, !node.loaded);
        }
    }
};

NodeProcess.prototype.hideNodeChildren = function hideNodeChildren(node) {
    for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        child.setDisplayed(false);
    }
};

/**
 * Return an ancestor of node if it has a texture for this layer
 * that matches its level (not downsampled).
 * Returns null otherwise
 */
function findAncestorWithValidTextureForLayer(node, layerType, layer) {
    var parent = node.parent;
    if (parent && parent.material && parent.material.getLayerLevel) {
        var level = parent.material.getLayerLevel(layerType, layer ? layer.id : undefined);
        if (level >= 0) {
            return node.getNodeAtLevel(level);
        } else {
            return findAncestorWithValidTextureForLayer(parent, layerType, layer);
        }
    } else {
        return null;
    }
}

function nodeCommandQueuePriorityFunction(node) {
    // We know that 'node' is visible because commands can only be
    // issued for visible nodes.
    //
    if (!node.loaded) {
        // Prioritize lower-level (ie: bigger) non-loaded nodes
        // because we need them to be loaded to be able
        // to subdivide.
        return 1000 - node.level;
    } else if (node.isDisplayed()) {
        // Then prefer displayed() node over non-displayed one
        return 100;
    } else {
        return 10;
    }
}

function updateNodeImagery(scene, quadtree, node, layersConfig, force) {
    const promises = [];

    const ts = Date.now();
    const colorLayers = layersConfig.getColorLayers();
    for (let i = 0; i < colorLayers.length; i++) {
        const layer = colorLayers[i];

        // is tile covered by this layer?
        // We test early (rather than after chooseNextLevelToFetch like elevation)
        // because colorParams only exist for tiles where tileInsideLimit is true
        // (see `subdivideNode`)
        if (!layer.tileInsideLimit(node, layer)) {
            continue;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();
        }

        if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
            continue;
        }

        const material = node.materials[RendererConstant.FINAL];

        if (material.indexOfColorLayer(layer.id) === -1) {
            const texturesCount = layer.tileTextureCount ?
                layer.tileTextureCount(node, layer) : 1;

            const paramMaterial = {
                tileMT: layer.options.tileMatrixSet,
                texturesCount,
                visible: layersConfig.isColorLayerVisible(layer.id),
                opacity: layersConfig.getColorLayerOpacity(layer.id),
                fx: layer.fx,
                idLayer: layer.id,
            };

            material.pushLayer(paramMaterial);
            node.texturesNeeded += texturesCount;
        }

        if (!force) {
            // does this tile needs a new texture?
            if (!node.isColorLayerDownscaled(layer.id)) {
                continue;
            }
            // is fetching data from this layer disabled?
            if (!layersConfig.isColorLayerVisible(layer.id) ||
                layersConfig.isLayerFrozen(layer.id)) {
                continue;
            }
        }

        let ancestor = null;

        const currentLevel = material.getColorLayerLevelById(layer.id);
        // if this tile has no texture (level == -1), try use one from an ancestor
        if (currentLevel === -1) {
            ancestor = findAncestorWithValidTextureForLayer(node, l_COLOR, layer);
        } else {
            var targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node.level, currentLevel, layer.updateStrategy.options);
            if (targetLevel === currentLevel) {
                continue;
            }
            if (targetLevel < node.level) {
                ancestor = node.getNodeAtLevel(targetLevel);
            }
        }

        node.layerUpdateState[layer.id].newTry();

        const command = {
            /* mandatory */
            layer,
            requester: node,
            priority: nodeCommandQueuePriorityFunction(node),
            earlyDropFunction: refinementCommandCancellationFn,
            /* specific params */
            ancestor,
            /* redraw only if we're aren't using a texture from our parent */
            redraw: (ancestor == null),
        };

        promises.push(quadtree.scheduler.execute(command).then(
            (result) => {
                const level = ancestor ? ancestor.level : node.level;
                // Assign .level to texture
                if (Array.isArray(result)) {
                    for (let j = 0; j < result.length; j++) {
                        result[j].texture.level = level;
                    }

                    node.setTexturesLayer(result, l_COLOR, layer.id);
                } else if (result.texture) {
                    result.texture.level = level;
                    node.setTexturesLayer([result], l_COLOR, layer.id);
                } else {
                    // TODO: null texture is probably an error
                    // Maybe add an error counter for the node/layer,
                    // and stop retrying after X attempts.
                }

                node.layerUpdateState[layer.id].success();

                return result;
            },
            (err) => {
                if (err instanceof CancelledCommandException) {
                    node.layerUpdateState[layer.id].success();
                } else {
                    node.layerUpdateState[layer.id].failure(Date.now());
                    scene.notifyChange(node.layerUpdateState[layer.id].secondsUntilNextTry() * 1000, false);
                }
            }));
    }

    Promise.all(promises).then(() => {
        if (node.parent) {
            node.loadingCheck();
        }
    });
}

function updateNodeElevation(scene, quadtree, node, layersConfig, force) {
    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const ts = Date.now();
    const elevationLayers = layersConfig.getElevationLayers();
    let bestLayer = null;
    let ancestor = null;

    const material = node.materials[RendererConstant.FINAL];
    const currentElevation = material.getElevationLayerLevel();

    // Step 0: currentElevevation is -1 BUT material.loadedTexturesCount[l_ELEVATION] is > 0
    // means that we already tried and failed to download an elevation texture
    if (currentElevation == -1 && node.material.loadedTexturesCount[l_ELEVATION] > 0) {
        return;
    }

    // First step: if currentElevation is empty (level is -1), we *must* use the texture from
    // one of our parent. This allows for smooth transitions when subdividing
    // We don't care about layer status (isLayerFrozen) or limits (tileInsideLimit) because
    // we simply want to use ancestor's texture with a different pitch
    if (currentElevation == -1) {
        ancestor = findAncestorWithValidTextureForLayer(node, l_ELEVATION);
    }

    // We don't have a texture to reuse. This can happen in two cases:
    //   * no ancestor texture to use
    //   * we already have 1 texture (so currentElevation >= 0)
    // Again, LayeredMaterial's 1 elevation texture limitation forces us to `break` as soon
    // as one layer can supply a texture for this node. So ordering of elevation layers is important.
    // Ordering way of loop is important to find the best layer with tileInsideLimit
    for (let i = elevationLayers.length - 1; i >= 0; i--) {
        const layer = elevationLayers[i];

        if (!layer.tileInsideLimit(node, layer)) {
            continue;
        }

        if (layersConfig.isLayerFrozen(layer.id) && !force) {
            continue;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();
        }

        if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
            // If we'd use continue, we could have 2 parallel elevation layers updating
            // at the same time. So we're forced to break here.
            // TODO: if the first layer chosen ends up stalled in error we'll never try
            // the second one...
            break;
        }

        const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node.level, currentElevation, layer.updateStrategy.options);

        if (targetLevel <= currentElevation) {
            continue;
        }

        // ancestor is not enough: we also need to know from which layer we're going to request the elevation texture (see how this is done for color texture).
        // Right now this is done in the `for` loop below but this is hacky because there's no real warranty that bestLayer and ancestor really match.
        // FIXME: we need to be able to set both ancestor and bestLayer at the same time
        if (ancestor === null) {
            ancestor = node.getNodeAtLevel(targetLevel);
        }

        bestLayer = layer;
        break;
    }


    // If we found a usable layer, perform a query
    if (bestLayer !== null) {
        if (material.elevationLayersId.length === 0) {
            material.elevationLayersId.push(bestLayer.id);
            node.texturesNeeded++;
        }
        node.layerUpdateState[bestLayer.id].newTry();

        const command = {
            /* mandatory */
            layer: bestLayer,
            requester: node,
            priority: nodeCommandQueuePriorityFunction(node),
            earlyDropFunction: refinementCommandCancellationFn,
            /* specific params */
            ancestor,
            /* redraw only if we're aren't using a texture from our parent */
            redraw: (ancestor == null),
        };

        quadtree.scheduler.execute(command).then(
            (terrain) => {
                node.layerUpdateState[bestLayer.id].success();

                if (node.material === null) {
                    return;
                }

                if (terrain.texture) {
                    terrain.texture.level = (ancestor || node).level;
                }

                if (terrain.max === undefined) {
                    terrain.min = (ancestor || node).bbox.bottom();
                    terrain.max = (ancestor || node).bbox.top();
                }

                node.setTextureElevation(terrain);
            },
            (err) => {
                if (err instanceof CancelledCommandException) {
                    node.layerUpdateState[bestLayer.id].success();
                } else {
                    node.layerUpdateState[bestLayer.id].failure(Date.now());
                    scene.notifyChange(node.layerUpdateState[bestLayer.id].secondsUntilNextTry() * 1000, false);
                }
            });
    }
}


NodeProcess.prototype.processNode = function processNode(node, camera, params) {
    node.setDisplayed(false);
    node.setSelected(false);

    const isVisible = !this.isCulled(node, camera);

    node.setVisibility(isVisible);

    if (isVisible) {
        // update node's sse value
        node.sse = camera.computeNodeSSE(node);

        const sse = this.checkNodeSSE(node);
        const hidden = sse && node.childrenLoaded();

        if (sse && params.tree.canSubdivideNode(node)) {
            // big screen space error: subdivide node, display children if possible
            this.subdivideNode(node, camera, params);
        } else if (!hidden) {
            // node is going to be displayed (either because !sse or because children aren't ready),
            // so try to refine its textures
            this.refineNodeLayers(node, camera, params);
        }

        // display children if possible
        node.setDisplayed(!hidden);
        // todo uniformsProcess
    }

    return isVisible;
};

/**
 * @documentation: Cull node with frustrum and oriented bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {NodeProcess_L7.NodeProcess.prototype.frustumCullingOBB.node@pro;camera@call;getFrustum@call;intersectsBox}
 */

const frustum = new THREE.Frustum();
const obbViewMatrix = new THREE.Matrix4();

NodeProcess.prototype.frustumCullingOBB = function frustumCullingOBB(node, camera) {
    // Move camera in OBB local space
    obbViewMatrix.multiplyMatrices(camera.viewMatrix, node.OBB().matrixWorld);

    frustum.setFromMatrix(obbViewMatrix);

    return frustum.intersectsBox(node.OBB().box3D);
};

/**
 * @documentation: Pre-computing for the upcoming processes
 * @param  {type} camera
 */
NodeProcess.prototype.prepare = function prepare(camera) {
    this.preHorizonCulling(camera);
};

/**
 * @documentation:pre calcul for horizon culling
 * @param {type} camera
 * @returns {undefined}
 */
NodeProcess.prototype.preHorizonCulling = function preHorizonCulling(camera) {
    this.cV.copy(camera.position()).divide(this.r);
    this.vhMagnitudeSquared = this.cV.lengthSq() - 1.0;
};

/**
 * @documentation: return true if point is occuled by horizon
 * @param {type} pt
 * @returns {Boolean}
 */
NodeProcess.prototype.pointHorizonCulling = function pointHorizonCulling(pt) {
    var vT = pt.divide(this.r).sub(this.cV);

    var vtMagnitudeSquared = vT.lengthSq();

    var dot = -vT.dot(this.cV);

    var isOccluded =
        this.vhMagnitudeSquared < dot &&
        this.vhMagnitudeSquared < dot * dot / vtMagnitudeSquared;

    return isOccluded;
};

/**
 * @documentation: cull node with horizon
 * @param {type} node
 * @returns {Boolean}
 */
var point = new THREE.Vector3();

NodeProcess.prototype.horizonCulling = function horizonCulling(node) {
    // horizonCulling Oriented bounding box
    var points = node.OBB().pointsWorld;
    var isVisible = false;

    for (var i = 0, max = points.length; i < max; i++) {
        point = points[i].clone();
        if (!this.pointHorizonCulling(point)) {
            isVisible = true;
            break;
        }
    }

    return isVisible;
};


export default NodeProcess;
