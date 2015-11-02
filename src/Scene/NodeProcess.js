/**
* Generated On: 2015-10-5
* Class: NodeProcess
* Description: NodeProcess effectue une opération sur un Node.
*/

define('Scene/NodeProcess',['Scene/BoudingBox','Renderer/Camera','Core/Math/MathExtented'], function(BoudingBox,Camera,MathExt){


    function NodeProcess(camera3D){
        //Constructor
        this.camera = new Camera();        
        this.camera.camera3D  = camera3D.clone();
        
        this.bbox = new BoudingBox(MathExt.PI_OV_TWO+MathExt.PI_OV_FOUR,MathExt.PI+MathExt.PI_OV_FOUR,0,MathExt.PI_OV_TWO);
        
        this.vhMagnitudeSquared = 1.0;        
        this.rX = 6.378137;
        this.rY = 6.3567523142451793;
        this.rZ = 6.378137;
        
        this.cvX = 0.0;
        this.cvY = 0.0;
        this.cvZ = 0.0;
        
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
        var cameraPosition = camera.position();
        
        // Vector CV
        this.cvX = cameraPosition.x / this.rX;
        this.cvY = cameraPosition.y / this.rY;
        this.cvZ = cameraPosition.z / this.rZ;

        this.vhMagnitudeSquared = this.cvX * this.cvX + this.cvY * this.cvY + this.cvZ * this.cvZ - 1.0;
        
        //console.log(this.vhMagnitudeSquared);
    };
    
    NodeProcess.prototype.pointHorizonCulling = function(point)
    {
        var position = point;

        

        // Target position, transformed to scaled space
        var tX = position.x / this.rX;
        var tY = position.y / this.rY;
        var tZ = position.z / this.rZ;

        // Vector VT
        var vtX = tX - this.cvX;
        var vtY = tY - this.cvY;
        var vtZ = tZ - this.cvZ;
        var vtMagnitudeSquared = vtX * vtX + vtY * vtY + vtZ * vtZ;

        // VT dot VC is the inverse of VT dot CV
        var vtDotVc = -(vtX * this.cvX + vtY * this.cvY + vtZ * this.cvZ);

        var isOccluded = vtDotVc > this.vhMagnitudeSquared &&
                         vtDotVc * vtDotVc / vtMagnitudeSquared > this.vhMagnitudeSquared;
                 
        return isOccluded;
    };
    
    NodeProcess.prototype.horizonCulling = function(node)
    {
      var points = node.OBB().pointsWorld;
      
      //console.log(points);
      
      var isVisible = false;
      for (var i = 0, max = points.length; i < max; i++) 
      {          
            if(!this.pointHorizonCulling(points[i]))
                isVisible = true;            
      }
      
      node.visible = isVisible;
      
      return node.visible;
      
    };

    return NodeProcess;

});