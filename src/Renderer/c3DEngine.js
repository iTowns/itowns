/**
* Generated On: 2015-10-5
* Class: c3DEngine
* Description: 3DEngine est l'interface avec le framework webGL.
*/

define('Renderer/c3DEngine',['THREE','OrbitControls','Renderer/Camera','when'], function(THREE,OrbitControls,Camera,when){

    var instance3DEngine = null;

    function c3DEngine(scene){
        //Constructor
        
        if(instance3DEngine !== null){
            throw new Error("Cannot instantiate more than one c3DEngine");
        } 

        this.scene      = scene;
        this.scene3D    = new THREE.Scene();       
        this.renderer   = new THREE.WebGLRenderer( { antialias: true,alpha: true } );
        
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        
        this.renderer.setClearColor( 0xA568C2 );
        this.renderer.autoClear = false;
        document.body.appendChild( this.renderer.domElement );
        
        var ratio   = window.innerWidth/window.innerHeight;        
        this.camera = new Camera(ratio);        
                
        //this.camera.camera3D.position.x = Math.PI; 
        this.camera.camera3D.position.z = 30;      
        this.scene3D.add(this.camera.camera3D);
        
        this.controls = new THREE.OrbitControls( this.camera.camera3D,this.renderer.domElement );
        this.controls.target        = new THREE.Vector3(0,0,0);
        this.controls.damping       = 0.1;
        this.controls.noPan         = false;
        this.controls.rotateSpeed   = 0.8;
        this.controls.zoomSpeed     = 1.0;
        this.controls.minDistance   = 1.0;
        this.controls.maxDistance   = 30.0;
        
        this.controls.update();
                            
        this.renderScene = function(){
                  
            this.scene.wait();
            this.renderer.clear();
            this.renderer.setViewport( 0, 0, window.innerWidth, window.innerHeight );
            this.renderer.render( this.scene3D, this.camera.camera3D);

        }.bind(this);
                 
        this.controls.addEventListener( 'change', this.renderScene );
        
        this.renderScene();
                        
    }

    /**
    */
    c3DEngine.prototype.style2Engine = function(){
        //TODO: Implement Me 

    };
    
    /**
     * 
     * @param {type} mesh
     * @param {type} texture
     * @returns {undefined}
     */
    c3DEngine.prototype.setTexture = function(mesh,texture){
        //TODO: Implement Me         
        mesh.material = new THREE.MeshBasicMaterial( {color: 0xffffff, map: texture} );
    };

    /**
    */
    c3DEngine.prototype.add3DScene = function(object){
        
        this.scene3D.add(object);                

    };    
    
    c3DEngine.prototype.add3Cube = function(texture){
         
        var geometry = new THREE.BoxGeometry( 1, 1, 1 );                        
        var material = new THREE.MeshBasicMaterial( {color: 0xffffff, map: texture} );
        var cube     = new THREE.Mesh( geometry, material );   
                
        this.scene3D.add(cube);
        
    };

    /**
    */
    c3DEngine.prototype.precision = function(){
        //TODO: Implement Me 

    };

    return function(scene){
        instance3DEngine = instance3DEngine || new c3DEngine(scene);
        return instance3DEngine;
    };    

});