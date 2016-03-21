/**
 * Generated On: 2015-10-5
 * Class: NodeProcess
 * Description: NodeProcess effectue une opération sur un Node.
 */

define('Scene/NodeProcess', ['Scene/BoundingBox', 'Renderer/Camera', 'Core/Math/MathExtented', 'THREE', 'Core/defaultValue'], function(BoundingBox, Camera, MathExt, THREE, defaultValue) {


    function NodeProcess(camera3D, size, bbox) {
        //Constructor
        this.camera = new Camera();
        this.camera.camera3D = camera3D.clone();

        this.bbox = defaultValue(bbox, new BoundingBox(MathExt.PI_OV_TWO + MathExt.PI_OV_FOUR, MathExt.PI + MathExt.PI_OV_FOUR, 0, MathExt.PI_OV_TWO));

        this.vhMagnitudeSquared = 1.0;

        this.r = defaultValue(size, new THREE.Vector3());
        this.cV = new THREE.Vector3();

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
     * @documentation: Cull node with frustrum
     * @param {type} node   : node to cull
     * @param {type} camera : camera for culling
     * @returns {unresolved}
     */
    NodeProcess.prototype.frustumCulling = function(node, camera) {
        var frustum = camera.frustum;

        return frustum.intersectsObject(node);
    };

    NodeProcess.prototype.checkSSE = function(node, camera) {

        return camera.SSE(node) > 6.0 || node.level <= 2;

    };

    /**
     * @documentation: Compute screen space error of node in function of camera
     * @param {type} node
     * @param {type} camera
     * @returns {Boolean}
     */
    NodeProcess.prototype.SSE = function(node, camera, params) {

        var sse = this.checkSSE(node, camera)

        if(params.withUp && node.material.visible && !node.wait )
        {
            if (sse) 
                // request level up 
                params.tree.up(node);                        
            else 
                // request level up other quadtree
                params.tree.upSubLayer(node);                        
        }
        else if (!sse) {
            // request level down
            params.tree.down(node);
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

        return node.setVisibility(this.camera.getFrustum().intersectsBox(node.OBB().box3D));
    };

    /**
     * @documentation: Cull node with frustrum and the bounding box of node
     * @param {type} node
     * @param {type} camera
     * @returns {unresolved}
     */
    NodeProcess.prototype.frustumBB = function(node/*, camera*/) {

        return node.setVisibility(node.bbox.intersect(this.bbox));

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
    NodeProcess.prototype.horizonCulling = function(node) {

        // horizonCulling Oriented bounding box
        var points = node.OBB().pointsWorld;
        var center = node.absoluteCenter;
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

        return node.setVisibility(isVisible);
        //      if(isVisible === false)
        //          node.tMat.setDebug(1);
        //      else
        //          node.tMat.setDebug(0);
        //   

    };


    return NodeProcess;

});
