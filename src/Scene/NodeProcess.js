/**
 * Generated On: 2015-10-5
 * Class: NodeProcess
 * Description: NodeProcess effectue une opération sur un Node.
 */

define('Scene/NodeProcess',
    ['Scene/BoundingBox',
     'Renderer/Camera',
     'Core/Math/MathExtented',
     'Core/Commander/InterfaceCommander',
     'THREE',
     'Core/defaultValue',
     'Core/Geographic/Projection',
     'when'
], function(BoundingBox, Camera, MathExt, InterfaceCommander, THREE, defaultValue, Projection, when) {


    function NodeProcess(camera, size, bbox) {
        //Constructor
        this.camera = new Camera();
        this.camera.camera3D = camera.camera3D.clone();

        this.bbox = defaultValue(bbox, new BoundingBox(MathExt.PI_OV_TWO + MathExt.PI_OV_FOUR, MathExt.PI + MathExt.PI_OV_FOUR, 0, MathExt.PI_OV_TWO));

        this.vhMagnitudeSquared = 1.0;

        this.r = defaultValue(size, new THREE.Vector3());
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
        return !( this.frustumCullingOBB(node, camera)&&this.horizonCulling(node, camera));
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

    NodeProcess.prototype.subdivideNode = function (node, camera, params) {
        if(!node.pendingSubdivision && node.noChild()) {
            var projection = this.projection;
            var bboxes = params.tree.subdivideNode(node);
            node.pendingSubdivision = true;

            for(i = 0; i < bboxes.length; i++) {
                args = {layer: params.tree.wgs84TileLayer, bbox: bboxes[i]};
                var quadtree = params.tree;


                quadtree.interCommand.request(args, node).then(function(child) {
                    var textureCount = 0;
                    var paramMaterial = [];

                    child.WMTSs = [];

                    // update wmts
                    for (var i = 0; i < quadtree.wmtsColorLayers.length; i++) {
                        var layer = quadtree.wmtsColorLayers[i];
                        var tileMatrixSet = layer.wmtsOptions.tileMatrixSet;

                        if(!child.matrixSet[tileMatrixSet]) {
                            child.matrixSet[tileMatrixSet] = projection.getCoordWMTS_WGS84(child.tileCoord, child.bbox, tileMatrixSet);
                        }

                        if (provider.tileInsideLimit(child, layerData)) {

                            var idProv = providersColor.indexOf(provider);
                            if(idProv<0)
                            {
                                providersColor.push(provider);
                                providerServices[providersColor.length-1] = [service];

                            }
                            else
                                providerServices[idProv].push(service);

                            var bcoord = child.matrixSet[tileMatrixSet];

                            paramMaterial.push({
                                tileMT: tileMatrixSet,
                                pit: textureCount,
                                visible: map.colorTerrain.children[i].visible ? 1 : 0,
                                opacity: map.colorTerrain.children[i].opacity || 1.0,
                                fx: layerData.fx,
                                idLayer: colorServices[i]
                            });

                            textureCount += bcoord[1].row - bcoord[0].row + 1;
                        }
                    }


                    child.setColorLayerParameters(paramMaterial);
                    child.texturesNeeded += textureCount;

                    // request imagery update
                    updateNodeImagery(quadtree, child);

                    // request elevation update
                    updateNodeElevation(quadtree, child);

                    return 0;
                });
            }
        }
    };


    function commandCancellationFn(cmd) {
        // allow cancellation of the command if the node isn't visible anymore
        return cmd.requester.visible === false && 2 <= cmd.requester.level;
    }

    NodeProcess.prototype.refineNodeLayers = function (node, camera, params) {
        // find downscaled layer
        var id = node.getDownScaledLayer();

        if (id === 0) {
            updateNodeElevation(params.tree, node);
        } else if (id === 1) {
            updateNodeImagery(params.tree, node);
        }
    };

    NodeProcess.prototype.hideNodeChildren = function(node) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            child.setDisplayed(false);
        }
    };

    function commandCancellationFn(cmd) {
        // allow cancellation of the command if the node isn't visible anymore
        return cmd.requester.visible === false && cmd.requester.level >= 2;
    }

    function updateNodeImagery(quadtree, node) {
        var services = quadtree.wmtsColorLayers.map(function(layer) { return layer.id; });

        var hackLayer = {
            protocol: 'wmts',
            services: services
        };
        var args = {layer: hackLayer, destination: 1 };

        return quadtree.interCommand.request(args, node, commandCancellationFn).then(function(colorTextures) {
                node.setTexturesLayer(colorTextures, 1);
                return 0;
            });
    }

    function updateNodeElevation(quadtree, tile) {
        // See TileMesh's groupelevation. Elevations level are mapped on 4 levels (14, 11, 7, 3).
        // For instance, if tile.level is 12, it'll use levelElevation == 11.
        // Here we only make sure that the tile with level == levelElevation == 11 has its elevation texture.
        // Also see TileMesh.setTextureElevation
        var tileNotDownscaled = (tile.level === tile.levelElevation) ?
            tile :
            tile.getParentLevel(tile.levelElevation);


        // If tileNotDownscaled's elevation texture is not ready yet, fetch it
        if (tileNotDownscaled.downScaledLayer(0)) {
            var services = quadtree.wmtsElevationLayers.map(function(layer) { return layer.id; });

            var hackLayer = {
                protocol: 'wmts',
                services: services
            };

            var args = {layer: hackLayer, destination: 0};

            return quadtree.interCommand.request(args, tileNotDownscaled, commandCancellationFn).then(function(terrain) {
                    tileNotDownscaled.setTextureElevation(terrain);
                    if (tileNotDownscaled != tile) {
                        tile.setTextureElevation(-2);
                    }
                    return 0;
                });
        } else {
            // TODO: check this
            tile.setTextureElevation(-2);
            return when();
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

        if (sse) {  // SSE too big: display or load children
            if (params.withUp) {
                // request level up
                this.subdivideNode(node, camera, params);
            }

            // Ideally we'd want to hide this node and display its children
            node.setDisplayed(!node.childrenLoaded());
        } else {    // SSE good enough: display node and put it to the right scale if necessary
            if (params.withUp) {
                this.refineNodeLayers(node, camera, params);
            }

            // display node and hide children
            this.hideNodeChildren(node);
            node.setDisplayed(true);
        }
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
        quaternion.multiplyQuaternions( node.OBB().quadInverse(), camera.camera3D.quaternion);
        this.camera.setRotation(quaternion);

        return this.camera.getFrustum().intersectsBox(node.OBB().box3D);
    };

    /**
     * @documentation: Cull node with frustrum and the bounding box of node
     * @param {type} node
     * @param {type} camera
     * @returns {unresolved}
     */
    NodeProcess.prototype.frustumBB = function(node/*, camera*/) {

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


    return NodeProcess;

});
