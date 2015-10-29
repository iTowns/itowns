/**
* Generated On: 2015-10-5
* Class: Camera
* Description: La camera scene, interface avec la camera du 3DEngine.
*/


define('Renderer/Camera',['Scene/Node','THREE'], function(Node, THREE){

    function Camera(width,height,debug){
        //Constructor

        Node.call( this );
                
        this.ratio      = width/height;                
        this.FOV        = 30;
        this.camera3D   = new THREE.PerspectiveCamera( 30, this.ratio, 0.1, 1000 );
        this.direction  = new THREE.Vector3();        
        this.frustum    = new THREE.Frustum();
        this.width      = width;
        this.height     = height;
        
        var radAngle    = this.FOV * Math.PI / 180;
        this.HFOV       = 2.0 * Math.atan(Math.tan(radAngle*0.5) * this.ratio);        
        this.preSSE     = this.width * (2.0 * Math.tan(this.HFOV * 0.5));
        
        this.cameraHelper  = debug  ? new THREE.CameraHelper( this.camera3D ) : undefined;
        this.frustum       = new THREE.Frustum();

    }
 
    Camera.prototype = Object.create( Node.prototype );

    Camera.prototype.constructor = Camera;

    /**
    */
    Camera.prototype.position = function(){
        
        return this.camera3D.position;

    };
    
    Camera.prototype.camHelper = function(){
        
        return this.cameraHelper;

    };
   
    Camera.prototype.SSE = function(node)
    {
        
        var distance = this.camera3D.position.distanceTo(node.center())*100000;
        
        var levelMax = 11;
        
        var t   = Math.pow(2,levelMax - node.level);
        
        //var geometricError  = 8.0*t; //--> debug
        var geometricError  = 2.0*t;
        
        var SSE = this.preSSE * (geometricError/distance);
        console.log(SSE);
        return SSE;

    };
    
    Camera.prototype.update = function()
    {
                    
        var vector = new THREE.Vector3( 0, 0, 1 );

        this.direction = vector.applyQuaternion( this.camera3D.quaternion );
        
        this.frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse));

        
        
    };
    
    Camera.prototype.setPosition = function(position)
    {                    
        this.camera3D.position.copy(position);
    };
    
    Camera.prototype.setRotation = function(rotation)
    {                            
        this.camera3D.quaternion.copy(rotation);
    };
    
    Camera.prototype.getFrustum = function()
    {
                    
        this.camera3D.updateMatrix(); 
        this.camera3D.updateMatrixWorld(); 
        this.camera3D.matrixWorldInverse.getInverse( this.camera3D.matrixWorld );
        this.frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse));             
 
        return this.frustum;
    };
       
    return Camera;
    
});
