/**
 * Generated On: 2015-10-5
 * Class: NodeProcess
 * Description: NodeProcess effectue une opération sur un Node.
 */

import BoundingBox from 'Scene/BoundingBox';
import Camera from 'Renderer/Camera';
import MathExt from 'Core/Math/MathExtented';
import THREE from 'THREE';
import defaultValue from 'Core/defaultValue';
import Projection from 'Core/Geographic/Projection';


function NodeProcess(camera, ellipsoid, bbox) {
    //Constructor
    this.camera = new Camera();
    this.camera.camera3D = camera.camera3D.clone();

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

NodeProcess.prototype.updateCamera = function(camera) {
    this.camera = new Camera(camera.width, camera.height);
    this.camera.camera3D = camera.camera3D.clone();
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

                child.matrixSet = [];


                // update wmts
                var colorLayers = params.layersConfig.getColorLayers();
                for (j = 0; j < colorLayers.length; j++) {
                    layer = colorLayers[j];
                    var tileMatrixSet = layer.options.tileMatrixSet;

                    if (!child.matrixSet[tileMatrixSet]) {
                        child.matrixSet[tileMatrixSet] = this.projection.getCoordWMTS_WGS84(child.tileCoord, child.bbox, tileMatrixSet);
                    }

                    if (layer.tileInsideLimit(child, layer)) {

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
                updateNodeImagery(quadtree, child, colorLayers);

                // request elevation update
                updateNodeElevation(quadtree, child, params.layersConfig.getElevationLayers());

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

NodeProcess.prototype.refineNodeLayers = function(node, camera, params) {
    // find downscaled layer
    // TODO: update color layer at a time
    var id = node.getDownScaledLayer();

    if (id !== undefined) {
        // prevent multiple command creation
        if (node.pendingLayers[id] === undefined) {
            node.pendingLayers[id] = true;

            if (id === 0) {
                updateNodeElevation(params.tree, node, params.layersConfig.getElevationLayers()).
                then(function() {
                    node.pendingLayers[id] = undefined;
                });
            } else if (id === 1) {
                updateNodeImagery(params.tree, node, params.layersConfig.getColorLayers()).
                then(function() {
                    node.pendingLayers[id] = undefined;
                });
            } else {
                node.pendingLayers[id] = undefined;
            }
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

function updateNodeImagery(quadtree, node, colorLayers) {
    var promises = [];

    for (var i = 0; i < colorLayers.length; i++) {
        var layer = colorLayers[i];

        if (layer.tileInsideLimit(node, layer)) {
            var args = {
                layer: layer
            };

            var slot = node.material.getLayerTextureOffset(layer.id);
            let ancestor = null;

            // if this tile has no texture (level == -1), try use one from an ancestor
            if (0 <= slot &&
                node.material.getLevelLayerColor(1, slot) === -1) {
                ancestor = findAncestorWithValidTextureForLayer(node, layer.id);
                args.ancestor = ancestor;
            }

            promises.push(quadtree.interCommand.request(args, node, refinementCommandCancellationFn).then(
                function(result) {
                    let level = ancestor ? ancestor.level : node.level;

                    // Assign .level to texture
                    if (Array.isArray(result)) {
                        for (var j=0; j<result.length; j++) {
                            result[j].texture.level = level;
                        }
                    } else {
                        result.texture.level = level;
                    }
                    return result;
                }
            ));
        }
    }

    return Promise.all(promises).then(function(colorTextures) {
        // Make sure the node hasn't been destroyed
        if (node.material === null) {
            return;
        }
        var textures = [];
        for (var j = 0; j < colorTextures.length; j++) {
            textures = textures.concat(colorTextures[j]);
        }
        node.setTexturesLayer(textures, 1);
        return node;
    }).catch(function() {

    });
}

function updateNodeElevation(quadtree, node, elevationLayers) {
    // See TileMesh's groupelevation. Elevations level are mapped on 4 levels (14, 11, 7, 3).
    // For instance, if tile.level is 12, it'll use levelElevation == 11.
    // Here we only make sure that the tile with level == levelElevation == 11 has its elevation texture.
    // Also see TileMesh.setTextureElevation
    var tileNotDownscaled = (node.level === node.levelElevation) ?
        node :
        node.getParentLevel(node.levelElevation);

    // If tileNotDownscaled's elevation texture is not ready yet, fetch it
    if (tileNotDownscaled.downScaledLayer(0)) {
        for (var i = 0; i < elevationLayers.length; i++) {
            var layer = elevationLayers[i];

            if (layer.tileInsideLimit(tileNotDownscaled, layer)) {
                var args = {
                    layer: layer
                };

                return quadtree.interCommand.request(args, tileNotDownscaled, refinementCommandCancellationFn).then(function(terrain) {
                    if (tileNotDownscaled.material === null) {
                        return;
                    }

                    if (terrain !== -1 && terrain !== -2){
                        terrain.level = tileNotDownscaled.level;
                    }

                    tileNotDownscaled.setTextureElevation(terrain);
                    if (tileNotDownscaled != node && node.material !== null) {
                        node.setTextureElevation(2);
                    }
                    return node;
                })
                .catch(function(/*err*/) {
                    // Command has been canceled, no big deal, we just need to catch it
                });
            }
        }

        // No elevation texture available for this node, no need to wait for one.
        node.texturesNeeded -= 1;
        return Promise.resolve(node);
    } else if (node != tileNotDownscaled) {
        node.setTextureElevation(-2);
        return Promise.resolve(node);
    }
}

/**
 * @documentation: Compute screen space error of node in function of camera
 * @param {type} node
 * @param {type} camera
 * @returns {Boolean}
 */
NodeProcess.prototype.SSE = function(node, camera, params) {
    // update node's sse value
    node.sse = camera.computeNodeSSE(node);

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
    this.camera.setPosition(position);
    // rotation in local space
    quaternion.multiplyQuaternions(node.OBB().quadInverse(), camera.camera3D.quaternion);
    this.camera.setRotation(quaternion);

    return this.camera.getFrustum().intersectsBox(node.OBB().box3D);
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
