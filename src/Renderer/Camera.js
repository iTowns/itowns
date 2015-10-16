/**
* Generated On: 2015-10-5
* Class: Camera
* Description: La camera scene, interface avec la camera du 3DEngine.
*/


define('Renderer/Camera',['Scene/Node','THREE'], function(Node, THREE){

    function Camera(ratio){
        //Constructor

        Node.call( this );
        this.camera3D = new THREE.PerspectiveCamera( 30, ratio, 0.1, 1000 );

        this.direction= new THREE.Vector3();
    }
 
    Camera.prototype = Object.create( Node.prototype );

    Camera.prototype.constructor = Camera;

    /**
    */
    Camera.prototype.position = function(){
        
        return this.renderCamera.position;

    };
    
    Camera.prototype.update = function(){
                    
        var vector = new THREE.Vector3( 0, 0, 1 );

        this.direction = vector.applyQuaternion( this.camera3D.quaternion );

    };
    
    return Camera;
    
});
