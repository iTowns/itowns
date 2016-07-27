/**
 * Generated On: 2015-10-5
 * Class: NodeProcess
 * Description: NodeProcess effectue une opération sur un Node.
 */

import BoundingBox from 'Scene/BoundingBox';
import MathExt from 'Core/Math/MathExtented';
import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';
import Projection from 'Core/Geographic/Projection';
import RendererConstant from 'Renderer/RendererConstant';
import {chooseNextLevelToFetch} from 'Scene/LayerUpdateStrategy';

function NodeProcess(camera, ellipsoid, bbox) {
    //Constructor

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
NodeProcess.prototype.backFaceCulling = function(node, camera) {
    var normal = camera.direction;
    for (var n = 0; n < node.normals().length; n++) {

        var dot = normal.dot(node.normals()[n]);
        if (dot > 0) {
            node.visible = true;
            return true;
        }
    }

    //??node.visible = true;

    return node.visible;

};

/**
 * @documentation:
 * @param  {type} node  : the node to try to cull
 * @param  {type} camera: the camera used for culling
 * @return {Boolean}      the culling attempt's result
 */
NodeProcess.prototype.isCulled = function(node, camera) {
    return !(this.frustumCullingOBB(node, camera) && this.horizonCulling(node, camera));
};

/**
 * @documentation: Cull node with frustrum
 * @param {type} node   : node to cull
 * @param {type} camera : camera for culling
 * @returns {unresolved}
 */
NodeProcess.prototype.frustumCulling = function(node, camera) {
    var frustum = camera.frustum;

    return frustum.intersectsObject(node);
};

NodeProcess.prototype.checkNodeSSE = function(node) {
    return 6.0 < node.sse || node.level <= 2;
};

NodeProcess.prototype.subdivideNode = function(node, camera, params) {
    if (!node.pendingSubdivision && node.noChild()) {
        var bboxes = params.tree.subdivideNode(node);
        node.pendingSubdivision = true;

        for (var i = 0; i < bboxes.length; i++) {
            var args = {
                layer: params.layersConfig.getGeometryLayers()[0],
                bbox: bboxes[i]
            };
            var quadtree = params.tree;

            quadtree.interCommand.request(args, node).then(function(child) {
                var colorTextureCount = 0;
                var paramMaterial = [];
                var layer;
                var j;

                    // update wmts
                var colorLayers = params.layersConfig.getColorLayers();
                for (j = 0; j < colorLayers.length; j++) {
                    layer = colorLayers[j];

                    if (layer.tileInsideLimit(child, layer)) {
                        var tileMatrixSet = layer.options.tileMatrixSet;
                        var bcoord = child.matrixSet[tileMatrixSet];

                        paramMaterial.push({
                            tileMT: tileMatrixSet,
                            layerTexturesOffset: colorTextureCount,
                            visible: params.layersConfig.isColorLayerVisible(layer.id),
                            opacity: params.layersConfig.getColorLayerOpacity(layer.id),
                            fx: layer.fx,
                            idLayer: layer.id
                        });

                        colorTextureCount += bcoord[1].row - bcoord[0].row + 1;
                    }
                }

                child.setColorLayerParameters(paramMaterial);
                child.texturesNeeded = colorTextureCount + 1;

                // request imagery update
                // note: last param is true because we need to be sure that this request
                // will be run. See comment in refinementCommandCancellationFn
                this.refineNodeLayers(child, camera, params, true);

                return 0;
            }.bind(this));
        }
    }
};

function refinementCommandCancellationFn(cmd) {
    // If node A is divided into A1, A2, A3, A4 and the user zooms fast enough on A2
    // We might end up in a situation where:
    //    - commands for A1, A3 or A4 are canceled because they're not visible anymore
    //    - A2 A2 cannot be displayed because A won't be hidden until all of its
    //      children are loaded.

    // allow cancellation of the command if the node isn't visible anymore
    return cmd.requester.parent.childrenLoaded() &&
        cmd.requester.visible === false &&
        2 <= cmd.requester.level;
}

NodeProcess.prototype.refineNodeLayers = function(node, camera, params, force) {
    const layerFunctions = [
        updateNodeElevation,
        updateNodeImagery
    ];

    for (let i=0; i<2; i++) {
        if (node.pendingLayers[i] === undefined
            && (force || node.downScaledLayer(i))) {

            node.pendingLayers[i] = true;

            layerFunctions[i](params.tree, node, params.layersConfig, force).then(
                // reset the flag, regardless of the request success/failure
                function() { node.pendingLayers[i] = undefined; },
                function() { node.pendingLayers[i] = undefined; }
            );
        }
    }
};

NodeProcess.prototype.hideNodeChildren = function(node) {
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
function findAncestorWithValidTextureForLayer(node, layerId) {
    var parent = node.parent;
    if (parent && parent.material.getLayerTextureOffset) {
        var slot = parent.material.getLayerTextureOffset(layerId);
        if (slot < 0) {
            return null;
        } else {
            var level = parent.material.getLevelLayerColor(1, slot);
            if (level == parent.level) {
                return parent;
            } else {
                return findAncestorWithValidTextureForLayer(parent, layerId);
            }
        }
    } else {
        return null;
    }
}

function updateNodeImagery(quadtree, node, layersConfig, force) {
    let promises = [];

    const colorLayers = layersConfig.getColorLayers();
    for (let i = 0; i < colorLayers.length; i++) {
        let layer = colorLayers[i];

        // is tile covered by this layer?
        if (!layer.tileInsideLimit(node, layer)) {
            continue;
        }
        if (!force) {
            // does this tile needs a new texture?
            if (!node.downScaledColorLayer(layer.id)) {
                continue;
            }
            // is fetching data from this layer disabled?
            if (!layersConfig.isColorLayerVisible(layer.id) ||
                layersConfig.isLayerFrozen(layer.id)) {
                continue;
            }
        }

        let args = {
            layer: layer
        };

        let slot = node.materials[RendererConstant.FINAL].getLayerTextureOffset(layer.id);

        let currentLevel = node.materials[RendererConstant.FINAL].getLevelLayerColor(1, slot);
        // if this tile has no texture (level == -1), try use one from an ancestor
        if (currentLevel === -1) {
            args.ancestor = findAncestorWithValidTextureForLayer(node, layer.id);
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
            function(result) {
                let level = (args.ancestor ? args.ancestor.level : node.level) +
                    (layer.options.levelOffset || 0);

                // Assign .level to texture
                if (Array.isArray(result)) {
                    for (let j=0; j<result.length; j++) {
                        result[j].texture.level = level;
                    }

                    node.setTexturesLayer(result, 1, slot);
                } else if (result.texture) {
                    result.texture.level = level;
                    node.setTexturesLayer([result], 1, slot);
                } else {
                    // TODO: null texture is probably an error
                    // Maybe add an error counter for the node/layer,
                    // and stop retrying after X attempts.
                }

                return result;
            }
        ));
    }

    return Promise.all(promises).then(function() {
        node.loadingCheck();
        return node;
    }).catch(function() {

    });
}

function updateNodeElevation(quadtree, node, layersConfig, force) {
    let currentElevation = node.materials[RendererConstant.FINAL].getLevelLayerColor(0, 0);

    const elevationLayers = layersConfig.getElevationLayers();
    for (var i = 0; i < elevationLayers.length; i++) {
        let layer = elevationLayers[i];

        if (layersConfig.isLayerFrozen(layer.id) && !force) {
            continue;
        }

        // Decide which texture (level) to download
        let ancestor = null;
        if (currentElevation < 0) {
            // no texture: use elevation texture from 1st non-downscaled parent
            var n = node.getNodeAtLevel(node.level);
            while (n && n.materials[RendererConstant.FINAL].getLevelLayerColor(0, 0) < n.level) {
                n = n.parent;
                if (n && !n.materials) {
                    n = null;
                }
            }

            ancestor = n || node.getNodeAtLevel(node.level);
        } else {
            var targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node.level, currentElevation, layer.updateStrategy.options);

            if (targetLevel != currentElevation) {
                ancestor = node.getNodeAtLevel(targetLevel);
            } else {
                // all good
                return Promise.resolve(node);
            }
        }


        if (layer.tileInsideLimit(ancestor ? ancestor : node, layer)) {
            var args = { layer, ancestor };

            return quadtree.interCommand.request(args, node, refinementCommandCancellationFn).then(function(terrain) {
                if (node.material === null) {
                    return;
                }

                if (terrain && terrain.texture) {
                    terrain.texture.level = ancestor.level + (layer.options.levelOffset || 0);
                }

                node.setTextureElevation(terrain);

                return node;
            });
        }
    }

    // No elevation texture available for this node, no need to wait for one.
    node.texturesNeeded -= 1;
    return Promise.resolve(node);
}


NodeProcess.prototype.computeNodeSSE = function(node, camera) {
    var boundingSphere = node.geometry.boundingSphere;
    var distance = Math.max(0.0, (camera.camera3D.position.distanceTo(node.centerSphere) - boundingSphere.radius));
    // Added small oblique weight (distance is not enough, tile orientation is needed)
    var altiW = node.bbox.maxCarto.altitude === 10000 ? 0. : node.bbox.maxCarto.altitude / 10000.;
    var dotProductW = Math.min(altiW + Math.abs(camera.camera3D.getWorldDirection().dot(node.centerSphere.clone().normalize())), 1.);
    if (camera.camera3D.position.length() > 6463300) dotProductW = 1;
    var SSE = Math.sqrt(dotProductW) * camera.preSSE * (node.geometricError / distance);
    //var SSE = this.preSSE * (node.geometricError / distance);

    return SSE;
}

/**
 * @documentation: Compute screen space error of node in function of camera
 * @param {type} node
 * @param {type} camera
 * @returns {Boolean}
 */
NodeProcess.prototype.SSE = function(node, camera, params) {
    // update node's sse value
    node.sse = this.computeNodeSSE(node, camera);

    var sse = this.checkNodeSSE(node);

    if (params.withUp) {
        if (sse) {
            // big screen space error: subdivide node, display children if possible
            this.subdivideNode(node, camera, params);
        } else {
            // node is going to be displayed (either because !sse or because children aren't ready),
            // so try to refine its textures
            this.refineNodeLayers(node, camera, params);
        }
    }

    // display children if possible
    var hidden = sse && node.childrenLoaded();
    node.setDisplayed(!hidden);
};

/**
 * @documentation: Cull node with frustrum and oriented bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {NodeProcess_L7.NodeProcess.prototype.frustumCullingOBB.node@pro;camera@call;getFrustum@call;intersectsBox}
 */

var quaternion = new THREE.Quaternion();

NodeProcess.prototype.frustumCullingOBB = function(node, camera) {
    //position in local space
    var position = node.OBB().worldToLocal(camera.position().clone());
    position.z -= node.distance;

    quaternion.multiplyQuaternions( node.OBB().quadInverse(), camera.camera3D.quaternion);

    return camera.getFrustumLocalSpace(position, quaternion).intersectsBox(node.OBB().box3D);
};

/**
 * @documentation: Cull node with frustrum and the bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {unresolved}
 */
NodeProcess.prototype.frustumBB = function(node /*, camera*/ ) {
    return node.bbox.intersect(this.bbox);
};

/**
 * @documentation: Pre-computing for the upcoming processes
 * @param  {type} camera
 */
NodeProcess.prototype.prepare = function(camera) {
    this.preHorizonCulling(camera);
};

/**
 * @documentation:pre calcul for horizon culling
 * @param {type} camera
 * @returns {undefined}
 */
NodeProcess.prototype.preHorizonCulling = function(camera) {

    this.cV = MathExt.divideVectors(camera.position(), this.r);

    this.vhMagnitudeSquared = MathExt.lenghtSquared(this.cV) - 1.0;

};

/**
 * @documentation: return true if point is occuled by horizon
 * @param {type} point
 * @returns {Boolean}
 */
NodeProcess.prototype.pointHorizonCulling = function(point) {

    var t = MathExt.divideVectors(point, this.r);

    // Vector VT
    var vT = new THREE.Vector3();
    vT.subVectors(t, this.cV);

    var vtMagnitudeSquared = MathExt.lenghtSquared(vT);

    var dot = -vT.dot(this.cV);

    var isOccluded = dot > this.vhMagnitudeSquared &&
        dot * dot / vtMagnitudeSquared > this.vhMagnitudeSquared;

    return isOccluded;
};

/**
 * @documentation: cull node with horizon
 * @param {type} node
 * @returns {Boolean}
 */
var center = new THREE.Vector3();

NodeProcess.prototype.horizonCulling = function(node) {

    // horizonCulling Oriented bounding box
    var points = node.OBB().pointsWorld;
    center.setFromMatrixPosition(node.matrixWorld);
    var isVisible = false;
    for (var i = 0, max = points.length; i < max; i++) {
        var point = points[i].add(center);

        if (!this.pointHorizonCulling(point)) {
            isVisible = true;
            break;
        }
    }

    /*
     var points    = node.geometry.tops;
     var isVisible = false;
     for (var i = 0, max = points.length; i < max; i++)
     {
           if(!this.pointHorizonCulling(points[i]))
           {
               isVisible = true;
               break;
           }
     }
     */

    return isVisible;
    //      if(isVisible === false)
    //          node.tMat.setDebug(1);
    //      else
    //          node.tMat.setDebug(0);
    //

};


export default NodeProcess;
