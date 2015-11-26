/**
* Generated On: 2015-10-5
* Class: NodeProcess
* Description: NodeProcess effectue une opération sur un Node.
*/

define('Scene/NodeProcess',['Scene/BoudingBox','Renderer/Camera','Core/Math/MathExtented','THREE'], function(BoudingBox,Camera,MathExt,THREE){


    function NodeProcess(camera3D){
        //Constructor
        this.camera = new Camera();        
        this.camera.camera3D  = camera3D.clone();
        
        this.bbox = new BoudingBox(MathExt.PI_OV_TWO+MathExt.PI_OV_FOUR,MathExt.PI+MathExt.PI_OV_FOUR,0,MathExt.PI_OV_TWO);
        
        this.vhMagnitudeSquared = 1.0;  
        
        this.r      = new THREE.Vector3(6378137,6356752.3142451793,6378137);
        this.cV    = new THREE.Vector3();
        
    }

/**
 * @documentation: Apply backface culling on node, change visibility; return true if the node is visible
 * @param {type} node   : node to cull
 * @param {type} camera : camera for the culling
 * @returns {Boolean}
 */
    NodeProcess.prototype.backFaceCulling = function(node,camera)
    {
        var normal  = camera.direction;
        for(var n = 0; n < node.normals().length; n ++ ) 
        {
            
            var dot = normal.dot(node.normals()[n]);
            if( dot > 0 )
            {
                node.visible    = true;                
                return true;
            }
        };              
      
      node.visible = true;
        
       return node.visible;
              
    };
    
    
    NodeProcess.prototype.setCamera = function(camera)
    {        
        this.camera = camera;
    };
    
    /**
     * @documentation: Cull node with frustrum
     * @param {type} node   : node to cull
     * @param {type} camera : camera for culling
     * @returns {unresolved}
     */
    NodeProcess.prototype.frustumCulling = function(node,camera)
    {        
        var frustum = camera.frustum;
        
        return frustum.intersectsObject(node);   
    };
    
    /**
     * @documentation: Compute screen space error of node in function of camera
     * @param {type} node
     * @param {type} camera
     * @returns {Boolean}
     */
    NodeProcess.prototype.SSE = function(node,camera)
    {                                        
        return camera.SSE(node) > 1.0;            
    };
    
    /**
    * @documentation: Cull node with frustrum and oriented bounding box of node
     * @param {type} node
     * @param {type} camera
     * @returns {NodeProcess_L7.NodeProcess.prototype.frustumCullingOBB.node@pro;camera@call;getFrustum@call;intersectsBox}
     */
    NodeProcess.prototype.frustumCullingOBB = function(node,camera)        
    {        
        //var center  = node.absoluteCenter;
        var obb     = node.OBB();
        var quadInv = obb.quadInverse().clone();            

        this.camera.setPosition(obb.worldToLocal(camera.position().clone()));
        this.camera.setRotation(quadInv.multiply(camera.camera3D.quaternion));
        
        node.visible = this.camera.getFrustum().intersectsBox(obb.box3D);
        
        return node.visible;
        
    };
    
    /**
     * @documentation: Cull node with frustrum and the bounding box of node
     * @param {type} node
     * @param {type} camera
     * @returns {unresolved}
     */
    NodeProcess.prototype.frustumBB = function(node,camera)        
    { 
        
        node.visible = node.bbox.intersect(this.bbox);
        
        return node.visible;
    };
    
    /**
     * @documentation:pre calcul for horizon culling
     * @param {type} camera
     * @returns {undefined}
     */
    NodeProcess.prototype.preHorizonCulling = function(camera)
    {
 
        this.cV  = MathExt.divideVectors(camera.position(),this.r);
        
        this.vhMagnitudeSquared = MathExt.lenghtSquared(this.cV) - 1.0;
  
    };
    
    /**
     * @documentation: return true if point is occuled by horizon 
     * @param {type} point
     * @returns {Boolean}
     */
    NodeProcess.prototype.pointHorizonCulling = function(point)
    {
        
        var t = MathExt.divideVectors(point,this.r);

        // Vector VT
        var vT = new THREE.Vector3();
        vT.subVectors(t,this.cV);
        
        var vtMagnitudeSquared = MathExt.lenghtSquared(vT);

        var dot = - vT.dot(this.cV);

        var isOccluded = dot > this.vhMagnitudeSquared &&
                         dot * dot / vtMagnitudeSquared > this.vhMagnitudeSquared;
                 
        return isOccluded;
    };
    
    /**
     * @documentation: cull node with horizon 
     * @param {type} node
     * @returns {Boolean}
     */
    NodeProcess.prototype.horizonCulling = function(node)
    {
      var points = node.OBB().pointsWorld;
      var center  = node.absoluteCenter;
      var isVisible = false;
      for (var i = 0, max = points.length; i < max; i++) 
      {          
            if(!this.pointHorizonCulling(points[i]))
                isVisible = true;            
      }
      
      node.visible = isVisible;
//      if(isVisible === false)
//          node.tMat.setDebug(1);
//      else
//          node.tMat.setDebug(0);
//      
      
      return node.visible;
      
    };

    return NodeProcess;

});