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
    
    NodeProcess.prototype.horizonCulling = function(node,camera)        
    {
        
        var cameraPosition = camera.position();
        
        var rX = 6.378137;
        var rY = 6.3567523142451793;
        var rZ = 6.378137;
        
        // Vector CV
        var cvX = cameraPosition.x / rX;
        var cvY = cameraPosition.y / rY;
        var cvZ = cameraPosition.z / rZ;

        var vhMagnitudeSquared = cvX * cvX + cvY * cvY + cvZ * cvZ - 1.0;
       
        var position;

        // Target position, transformed to scaled space
        var tX = position.x / rX;
        var tY = position.y / rY;
        var tZ = position.z / rZ;

        // Vector VT
        var vtX = tX - cvX;
        var vtY = tY - cvY;
        var vtZ = tZ - cvZ;
        var vtMagnitudeSquared = vtX * vtX + vtY * vtY + vtZ * vtZ;

        // VT dot VC is the inverse of VT dot CV
        var vtDotVc = -(vtX * cvX + vtY * cvY + vtZ * cvZ);

        var isOccluded = vtDotVc > vhMagnitudeSquared &&
                         vtDotVc * vtDotVc / vtMagnitudeSquared > vhMagnitudeSquared;
                 
        return isOccluded;

    };

    return NodeProcess;

});