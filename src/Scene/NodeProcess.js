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
        
        this.r  = new THREE.Vector3(6.378137,6.3567523142451793,6.378137);
        this.cV  = new THREE.Vector3();
        
    }

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
        
        return node.visible;
              
    };
    
    NodeProcess.prototype.setCamera = function(camera)
    {        
        this.camera = camera;
    };
    
    
    NodeProcess.prototype.frustumCulling = function(node,camera)
    {        
        var frustum = camera.frustum;
        
        return frustum.intersectsObject(node);   
    };
    
    NodeProcess.prototype.SSE = function(node,camera)
    {                                        
        return camera.SSE(node) > 1.0;            
    };
    
    NodeProcess.prototype.frustumCullingOBB = function(node,camera)        
    {        
        var obb     = node.geometry.OBB;
        var quadInv = obb.quadInverse().clone();            

        this.camera.setPosition(obb.worldToLocal(camera.position().clone()));
        this.camera.setRotation(quadInv.multiply(camera.camera3D.quaternion));
        
        node.visible = this.camera.getFrustum().intersectsBox(obb.box3D);
        
        return node.visible;
        
    };
    
    /**
     * 
     * @param {type} node
     * @param {type} camera
     * @returns {unresolved}
     */
    NodeProcess.prototype.frustumBB = function(node,camera)        
    { 
        
        node.visible = node.bbox.intersect(this.bbox);
        
        return node.visible;
    };
    
    NodeProcess.prototype.preHorizonCulling = function(camera)
    {
 
        this.cV  = MathExt.divideVectors(camera.position(),this.r);
        
        this.vhMagnitudeSquared = MathExt.lenghtSquared(this.cV) - 1.0;
  
    };
    
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
    
    NodeProcess.prototype.horizonCulling = function(node)
    {
      var points = node.OBB().pointsWorld;
      
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