/**
* Generated On: 2015-10-5
* Class: c3DEngine
* Description: 3DEngine est l'interface avec le framework webGL.
*/

define('Renderer/c3DEngine',['THREE','OrbitControls','Renderer/Camera'], function(THREE,OrbitControls,Camera){


    function c3DEngine(){
        //Constructor

        this.scene3D    = new THREE.Scene();       
        this.renderer   = new THREE.WebGLRenderer( { antialias: true,alpha: true } );
        
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        
        this.renderer.setClearColor( 0x000000 );
        this.renderer.autoClear = false;
        document.body.appendChild( this.renderer.domElement );
        
        var ratio   = window.innerWidth/window.innerHeight;        
        this.camera = new Camera(ratio);
        
        this.scene3D.add(this.camera.camera3D);
        
        this.controls = new THREE.OrbitControls( this.camera.camera3D,this.renderer.domElement );
        this.controls.damping       = 0.1;
        this.controls.noPan         = true;
        this.controls.rotateSpeed   = 0.8;
        this.controls.zoomSpeed     = 1.0;

        this.controls.minDistance   = 6.40;
        this.controls.maxDistance   = 50.0;
              
        var scope = this;
        
        this.renderScene = function(){
        
            scope.renderer.clear();
            scope.renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
            scope.renderer.render( scope.scene3D, scope.camera.camera3D);

        };
                
        this.controls.addEventListener( 'change', this.renderScene );
        
        
    }

    /**
    */
    c3DEngine.prototype.style2Engine = function(){
        //TODO: Implement Me 

    };

    /**
    */
  /* 
    c3DEngine.prototype.renderScene = function(){
        
        console.log(scope.renderer);
        
        scope.renderer.clear();
   
       
        scope.renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
        scope.renderer.render( scope.scene3D, scope.camera.camera3D);

    };
*/
    /**
    */
    c3DEngine.prototype.add3DScene = function(object){
        
        this.scene3D.add(object);                

    };
    

    /**
    */
    c3DEngine.prototype.precision = function(){
        //TODO: Implement Me 

    };

    return c3DEngine;

});