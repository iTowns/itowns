/**
 * Generated On: 2015-10-5
 * Class: NodeProcess
 * Description: NodeProcess effectue une opération sur un Node.
 */

import BoundingBox from 'Scene/BoundingBox';
import MathExt from 'Core/Math/MathExtented';
import * as THREE from 'three';
import defaultValue from 'Core/defaultValue';
import Projection from 'Core/Geographic/Projection';
import RendererConstant from 'Renderer/RendererConstant';
import { chooseNextLevelToFetch } from 'Scene/LayerUpdateStrategy';
import { l_ELEVATION, l_COLOR } from 'Renderer/LayeredMaterial';

export const SSE_SUBDIVISION_THRESHOLD = 6.0;

function NodeProcess(camera, ellipsoid, bbox) {
    // Constructor

    this.bbox = defaultValue(bbox, new BoundingBox(MathExt.PI_OV_TWO + MathExt.PI_OV_FOUR, MathExt.PI + MathExt.PI_OV_FOUR, 0, MathExt.PI_OV_TWO));

    this.vhMagnitudeSquared = 1.0;

    this.r = defaultValue(ellipsoid.size, new THREE.Vector3());
    this.cV = new THREE.Vector3();
    this.projection = new Projection();
}

/**
 * @documentation: Apply backface culling on node, change visibility; return true if the node is visible
 * @param {type} node   : node to cull
 * @param {type} camera : camera for the culling
 * @returns {Boolean}
 */
NodeProcess.prototype.backFaceCulling = function (node, camera) {
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
NodeProcess.prototype.isCulled = function (node, camera) {
    return !(this.frustumCullingOBB(node, camera) && this.horizonCulling(node, camera));
};

/**
 * @documentation: Cull node with frustrum
 * @param {type} node   : node to cull
 * @param {type} camera : camera for culling
 * @returns {unresolved}
 */
NodeProcess.prototype.frustumCulling = function (node, camera) {
    var frustum = camera.frustum;

    return frustum.intersectsObject(node);
};

NodeProcess.prototype.checkNodeSSE = function (node) {
    return SSE_SUBDIVISION_THRESHOLD < node.sse || node.level <= 2;
};

NodeProcess.prototype.subdivideNode = function (node, camera, params) {
    if (!node.pendingSubdivision && node.noChild()) {
        var bboxes = params.tree.subdivideNode(node);
        node.pendingSubdivision = true;

        for (var i = 0; i < bboxes.length; i++) {
            var args = {
                layer: params.layersConfig.getGeometryLayers()[0],
                bbox: bboxes[i],
            };
            var quadtree = params.tree;

            quadtree.interCommand.request(args, node).then((child) => {
                var colorTextureCount = 0;
                var paramMaterial = [];
                var layer;
                var j;

                child.matrixSet = [];

                // update wmts
                var colorLayers = params.layersConfig.getColorLayers();

                // update Imagery wmts
                for (j = 0; j < colorLayers.length; j++) {
                    layer = colorLayers[j];
                    const tileMatrixSet = layer.options.tileMatrixSet;

                    if (tileMatrixSet && !child.matrixSet[tileMatrixSet]) {
                        child.matrixSet[tileMatrixSet] = this.projection.getCoordWMTS_WGS84(child.tileCoord, child.bbox, tileMatrixSet);
                    }

                    if (layer.tileInsideLimit(child, layer)) {
                        let texturesCount;
                        if (tileMatrixSet) {
                            var bcoord = child.matrixSet[tileMatrixSet];
                            texturesCount = bcoord[1].row - bcoord[0].row + 1;
                        } else {
                            texturesCount = 1;
                        }

                        paramMaterial.push({
                            tileMT: tileMatrixSet,
                            texturesCount,
                            visible: params.layersConfig.isColorLayerVisible(layer.id),
                            opacity: params.layersConfig.getColorLayerOpacity(layer.id),
                            fx: layer.fx,
                            idLayer: layer.id,
                        });

                        colorTextureCount += texturesCount;
                    }
                }

                // update Imagery wmts
                var elevationLayers = params.layersConfig.getElevationLayers();
                var canHaveElevation = false;
                for (j = 0; j < elevationLayers.length; j++) {
                    layer = elevationLayers[j];
                    const tileMatrixSet = layer.options.tileMatrixSet;

                    if (tileMatrixSet && !child.matrixSet[tileMatrixSet]) {
                        child.matrixSet[tileMatrixSet] = this.projection.getCoordWMTS_WGS84(child.tileCoord, child.bbox, tileMatrixSet);
                    }
                    canHaveElevation |= layer.tileInsideLimit(child, layer);
                }

                child.setColorLayerParameters(paramMaterial);
                child.texturesNeeded = colorTextureCount + canHaveElevation;

                // request layers (imagery/elevation) update
                this.refineNodeLayers(child, camera, params);

                // request feature update
                updateNodeFeature(quadtree, child, params.layersConfig.getGeometryLayers());

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

NodeProcess.prototype.refineNodeLayers = function (node, camera, params) {
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
        if (node.pendingLayers[typeLayer] === undefined && (!node.loaded || node.isLayerTypeDownscaled(typeLayer))) {
            node.pendingLayers[typeLayer] = true;
            layerFunctions[typeLayer](params.tree, node, params.layersConfig, !node.loaded)
        // reset the flag, regardless of the request success/failure
        .then(() => { node.pendingLayers[typeLayer] = undefined; },
              () => { node.pendingLayers[typeLayer] = undefined; });
        }
    }
};

NodeProcess.prototype.hideNodeChildren = function (node) {
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


function updateNodeFeature(quadtree, node, featureLayers) {
    for (var i = 0; i < featureLayers.length; i++) {
        var layer = featureLayers[i];
        var protocol = layer.protocol;
        if (protocol.toLowerCase() == 'wfs') {
            if (layer.tileInsideLimit(node, layer) && !node.content) {
                var args = {
                    layer,
                };

                quadtree.interCommand.request(args, node, refinementCommandCancellationFn).then((result) => {
                    // if request return empty json, WFS_Provider.getFeatures return undefined
                    if (result.feature !== undefined && result.feature != null) {
                        // var layer = quadtree.parent.features.children[0];
                        var map = quadtree.parent;
                        var layerid = result.feature.layer.id;
                        var layer = map.getFeatureLayerByName(layerid);

                        if (layer !== undefined) {
                            layer.children[0].add(result.feature);
                        }
                        node.content = result.feature;
                    }
                })
                .catch(() => {
                // Command has been canceled, no big deal, we just need to catch it
                });
            }
        }
    }
}

function updateNodeImagery(quadtree, node, layersConfig, force) {
    const promises = [];

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

        const args = {
            layer,
        };

        const currentLevel = node.materials[RendererConstant.FINAL].getColorLayerLevelById(layer.id);
        // if this tile has no texture (level == -1), try use one from an ancestor
        if (currentLevel === -1) {
            args.ancestor = findAncestorWithValidTextureForLayer(node, l_COLOR, layer);
        } else {
            var targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node.level, currentLevel, layer.updateStrategy.options);
            if (targetLevel === currentLevel) {
                continue;
            }
            if (targetLevel < node.level) {
                args.ancestor = node.getNodeAtLevel(targetLevel);
            }
        }

        promises.push(quadtree.interCommand.request(args, node, refinementCommandCancellationFn).then(
            (result) => {
                const level = args.ancestor ? args.ancestor.level : node.level;
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

                return result;
            }));
    }

    return Promise.all(promises).then(() => {
        if (node.parent) {
            node.loadingCheck();
        }
        return node;
    });
}

function updateNodeElevation(quadtree, node, layersConfig, force) {
    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const elevationLayers = layersConfig.getElevationLayers();
    let bestLayer = null;
    let ancestor = null;

    const currentElevation = node.materials[RendererConstant.FINAL].getElevationLayerLevel();

    // Step 0: currentElevevation is -1 BUT material.loadedTexturesCount[l_ELEVATION] is > 0
    // means that we already tried and failed to download an elevation texture
    if (currentElevation == -1 && node.material.loadedTexturesCount[l_ELEVATION] > 0) {
        return Promise.resolve(node);
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
        const args = { layer: bestLayer, ancestor };

        return quadtree.interCommand.request(args, node, refinementCommandCancellationFn).then((terrain) => {
            if (node.material === null) {
                return;
            }

            if (terrain && terrain.texture) {
                terrain.texture.level = (ancestor || node).level;
            }

            if (terrain && terrain.max === undefined) {
                terrain.min = (ancestor || node).bbox.bottom();
                terrain.max = (ancestor || node).bbox.top();
            }

            node.setTextureElevation(terrain);

            return node;
        });
    }

    // No elevation texture available for this node, no need to wait for one.
    return Promise.resolve(node);
}


NodeProcess.prototype.processNode = function (node, camera, params) {
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

var quaternion = new THREE.Quaternion();

NodeProcess.prototype.frustumCullingOBB = function (node, camera) {
    // position in local space
    var position = node.OBB().worldToLocal(camera.position().clone());
    position.z -= node.distance;

    quaternion.multiplyQuaternions(node.OBB().quadInverse(), camera.camera3D.quaternion);

    return camera.getFrustumLocalSpace(position, quaternion).intersectsBox(node.OBB().box3D);
};

/**
 * @documentation: Cull node with frustrum and the bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {unresolved}
 */
NodeProcess.prototype.frustumBB = function (node /* , camera*/) {
    return node.bbox.intersect(this.bbox);
};

/**
 * @documentation: Pre-computing for the upcoming processes
 * @param  {type} camera
 */
NodeProcess.prototype.prepare = function (camera) {
    this.preHorizonCulling(camera);
};

/**
 * @documentation:pre calcul for horizon culling
 * @param {type} camera
 * @returns {undefined}
 */
NodeProcess.prototype.preHorizonCulling = function (camera) {
    this.cV.copy(camera.position()).divide(this.r);
    this.vhMagnitudeSquared = this.cV.lengthSq() - 1.0;
};

/**
 * @documentation: return true if point is occuled by horizon
 * @param {type} pt
 * @returns {Boolean}
 */
NodeProcess.prototype.pointHorizonCulling = function (pt) {
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

NodeProcess.prototype.horizonCulling = function (node) {
    // horizonCulling Oriented bounding box
    var points = node.OBB().pointsWorld;
    var isVisible = false;

    var nodePosition = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
    for (var i = 0, max = points.length; i < max; i++) {
        point.addVectors(nodePosition, points[i]);
        if (!this.pointHorizonCulling(point)) {
            isVisible = true;
            break;
        }
    }

    return isVisible;
};


export default NodeProcess;
