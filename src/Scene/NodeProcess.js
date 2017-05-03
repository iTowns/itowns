/**
 * Generated On: 2015-10-5
 * Class: NodeProcess
 * Description: NodeProcess effectue une opération sur un Node.
 */

import * as THREE from 'three';
import RendererConstant from '../Renderer/RendererConstant';
import { chooseNextLevelToFetch } from './LayerUpdateStrategy';
import { l_ELEVATION, l_COLOR, EMPTY_TEXTURE_ZOOM } from '../Renderer/LayeredMaterial';
import LayerUpdateState from './LayerUpdateState';
import { CancelledCommandException } from '../Core/Commander/Scheduler';
import { ellipsoidSizes } from '../Core/Geographic/Coordinates';
import OGCWebServiceHelper from '../Core/Commander/Providers/OGCWebServiceHelper';

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

const MIN_ZOOM_DISPLAYED_TILE = 2;

NodeProcess.prototype.checkNodeSSE = function checkNodeSSE(node) {
    return SSE_SUBDIVISION_THRESHOLD < node.sse || node.level < MIN_ZOOM_DISPLAYED_TILE;
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
                if (child.material.elevationLayersId.length) {
                    // need to force update elevation when delta is important
                    if (child.level - child.material.getElevationLayerLevel() > 6) {
                        updateNodeElevation(this.scene, params.tree, child, params.layersConfig, true);
                    }
                }
                this.fetchContentLayers(child, camera, params);
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
    if (cmd.force) {
        return false;
    }

    return !cmd.requester.isDisplayed();
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

    // Priorize color layer
    for (let typeLayer = 1; typeLayer >= 0; typeLayer--) {
        // node.layerUpdateState.length === 0 means Layers haven't been never refined
        if (!node.layerUpdateState.length || node.isLayerTypeDownscaled(typeLayer)) {
            layerFunctions[typeLayer](this.scene, params.tree, node, params.layersConfig);
        }
    }
};

NodeProcess.prototype.fetchContentLayers = function fetchContentLayers(node, camera, params) {
    if ((node.content.size < params.layersConfig.getGeometryLayers().length)) {
        updateNodeFeature(this.scene, params.tree, node, params.layersConfig, !node.loaded);
    }
};

NodeProcess.prototype.hideNodeChildren = function hideNodeChildren(node) {
    for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        child.setDisplayed(false);
    }
};

function nodeCommandQueuePriorityFunction(node) {
    // We know that 'node' is visible because commands can only be
    // issued for visible nodes.

    // TODO: need priorization of displayed nodes
    if (node.isDisplayed()) {
        // Then prefer displayed() node over non-displayed one
        return 100;
    } else {
        return 10;
    }
}

const nullMesh = new THREE.Mesh();

function updateNodeFeature(scene, quadtree, node, layersConfig) {
    const featureLayers = layersConfig.getGeometryLayers();
    const promises = [];
    const ts = Date.now();
    for (let i = 0; i < featureLayers.length; i++) {
        const layer = featureLayers[i];
        const protocol = layer.protocol;
        if (protocol.toLowerCase() == 'wfs') {
            if (layer.tileInsideLimit(node, layer) && !node.content.get(layer.id)) {
                if (node.layerUpdateState[layer.id] === undefined) {
                    node.layerUpdateState[layer.id] = new LayerUpdateState();
                }

                if (!node.layerUpdateState[layer.id].canTryUpdate(ts)) {
                    continue;
                }

                node.layerUpdateState[layer.id].newTry();

                const command = {
                    /* mandatory */
                    layer,
                    requester: node,
                    priority: nodeCommandQueuePriorityFunction(node),
                    earlyDropFunction: refinementCommandCancellationFn,
                };

                promises.push(quadtree.scheduler.execute(command).then((result) => {
                    // if request return empty json, WFS_Provider.getFeatures return undefined
                    if (result && result.feature) {
                        result.feature.layer.root.add(result.feature);
                        node.content.set(layer.id, result.feature);
                    }
                    else {
                        node.content.set(layer.id, nullMesh);
                    }
                    node.layerUpdateState[layer.id].success();
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
        }
    }
    return Promise.all(promises).then(() => node);
}

function updateNodeImagery(scene, quadtree, node, layersConfig, force) {
    const promises = [];

    const ts = Date.now();
    const colorLayers = layersConfig.getColorLayers();
    for (let i = 0; i < colorLayers.length; i++) {
        const layer = colorLayers[i];

        OGCWebServiceHelper.computeTileMatrixSetCoordinates(node, layer.options.tileMatrixSet);
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

        const currentLevel = node.materials[RendererConstant.FINAL].getColorLayerLevelById(layer.id);

        if (currentLevel > EMPTY_TEXTURE_ZOOM) {
            const zoom = node.wmtsCoords[layer.options.tileMatrixSet || 'WGS84G'][1].zoom;
            var targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, zoom, currentLevel, layer.updateStrategy.options);
            if (targetLevel <= currentLevel) {
                continue;
            }
        }

        node.layerUpdateState[layer.id].newTry();
        const command = {
            /* mandatory */
            layer,
            requester: node,
            priority: nodeCommandQueuePriorityFunction(node),
            earlyDropFunction: refinementCommandCancellationFn,
        };

        promises.push(quadtree.scheduler.execute(command).then(
            (result) => {
                if (Array.isArray(result)) {
                    node.setTexturesLayer(result, l_COLOR, layer.id);
                } else if (result.texture) {
                    if (!result.texture.coordWMTS) {
                        result.texture.coordWMTS = node.wmtsCoords[layer.options.tileMatrixSet || 'WGS84G'][0];
                    }
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

    const featuresLayers = layersConfig.getGeometryLayers().filter(l => l.protocol === 'kml');

    for (let i = 0; i < featuresLayers.length; i++) {
        const layer = featuresLayers[i];

        if (!layersConfig.isColorLayerVisible(layer.id) ||
            layersConfig.isLayerFrozen(layer.id)) {
            continue;
        }

        const command = {
            /* mandatory */
            layer,
            requester: node,
            // priority: nodeCommandQueuePriorityFunction(node),
            // FIXME why refinementCommandCancellationFn crash
            // earlyDropFunction: refinementCommandCancellationFn,
        };

        promises.push(quadtree.scheduler.execute(command).then(
            (texture) => {
                node.setTextureFeatures(texture);
            }));
    }

    Promise.all(promises);
}

function updateNodeElevation(scene, quadtree, node, layersConfig, force) {
    // Elevation is currently handled differently from color layers.
    // This is caused by a LayeredMaterial limitation: only 1 elevation texture
    // can be used (where a tile can have N textures x M layers)
    const ts = Date.now();
    const elevationLayers = layersConfig.getElevationLayers();
    let bestLayer = null;

    const material = node.materials[RendererConstant.FINAL];
    const currentElevation = material.getElevationLayerLevel();

    // Step 0: currentElevevation is EMPTY_TEXTURE_ZOOM BUT material.loadedTexturesCount[l_ELEVATION] is > 0
    // means that we already tried and failed to download an elevation texture
    if (currentElevation == EMPTY_TEXTURE_ZOOM && node.material.loadedTexturesCount[l_ELEVATION] > 0) {
        return;
    }

    // We don't have a texture to reuse. This can happen in two cases:
    //   * no ancestor texture to use
    //   * we already have 1 texture (so currentElevation >= 0)
    // Again, LayeredMaterial's 1 elevation texture limitation forces us to `break` as soon
    // as one layer can supply a texture for this node. So ordering of elevation layers is important.
    // Ordering way of loop is important to find the best layer with tileInsideLimit
    let targetLevel;
    for (let i = elevationLayers.length - 1; i >= 0; i--) {
        const layer = elevationLayers[i];

        OGCWebServiceHelper.computeTileMatrixSetCoordinates(node, layer.options.tileMatrixSet);

        if (!layer.tileInsideLimit(node, layer)) {
            continue;
        }

        if (layersConfig.isLayerFrozen(layer.id) && !force) {
            continue;
        }

        if (node.layerUpdateState[layer.id] === undefined) {
            node.layerUpdateState[layer.id] = new LayerUpdateState();
        }

        if (!node.layerUpdateState[layer.id].canTryUpdate(ts) && !force) {
            // If we'd use continue, we could have 2 parallel elevation layers updating
            // at the same time. So we're forced to break here.
            // TODO: if the first layer chosen ends up stalled in error we'll never try
            // the second one...
            break;
        }


        const zoom = node.wmtsCoords[layer.options.tileMatrixSet][1].zoom;
        targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, zoom, currentElevation, layer.updateStrategy.options);

        if (targetLevel <= currentElevation || layer.options.zoom.max < targetLevel) {
            continue;
        }

        bestLayer = layer;
        break;
    }


    // If we found a usable layer, perform a query
    if (bestLayer !== null) {
        if (material.elevationLayersId.length === 0) {
            material.elevationLayersId.push(bestLayer.id);
        }
        node.layerUpdateState[bestLayer.id].newTry();

        const command = {
            /* mandatory */
            layer: bestLayer,
            requester: node,
            targetLevel,
            priority: nodeCommandQueuePriorityFunction(node),
            earlyDropFunction: refinementCommandCancellationFn,
            force,
        };

        quadtree.scheduler.execute(command).then(
            (terrain) => {
                node.layerUpdateState[bestLayer.id].success();

                if (node.material === null) {
                    return;
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

        // display children if possible
        node.setDisplayed(!hidden);

        if (sse && params.tree.canSubdivideNode(node)) {
            // big screen space error: subdivide node, display children if possible
            this.subdivideNode(node, camera, params);
        } else if (!hidden) {
            // node is going to be displayed (either because !sse or because children aren't ready),
            // so try to refine its textures
            this.refineNodeLayers(node, camera, params);
        }

        // Content needs to be fetched even if the tile is hidden.
        // Because content is always visible and is same for superior level.
        this.fetchContentLayers(node, camera, params);
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
