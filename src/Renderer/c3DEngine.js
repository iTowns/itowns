/**
* Generated On: 2015-10-5
* Class: c3DEngine
* Description: 3DEngine est l'interface avec le framework webGL.
*/

define('Renderer/c3DEngine',['THREE','OrbitControls','Renderer/Camera','when'], function(THREE,OrbitControls,Camera,when){

    var instance3DEngine = null;

    function c3DEngine(){
        //Constructor
        
        if(instance3DEngine !== null){
            throw new Error("Cannot instantiate more than one c3DEngine");
        } 
        
        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ];

        this.debug      = false;
        this.scene      = undefined;
        this.scene3D    = new THREE.Scene();               
        this.width      = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
        this.height     = window.innerHeight;
        
        this.renderer   = undefined ;
        this.controls   = undefined ;                
        this.camera     = undefined;
        this.camDebug   = undefined;
        
        this.initCamera();
                       
        if(this.debug)
        {
            var axisHelper = new THREE.AxisHelper( 8 );
            this.scene3D.add( axisHelper );
        }
                        
        this.renderScene = function(){
                                    
            this.renderer.clear();            
            this.renderer.setViewport( 0, 0, this.width, this.height );
            this.renderer.render( this.scene3D, this.camera.camera3D);                       
            
            if(this.debug)
            {
                this.camera.camHelper().visible = true;
                this.renderer.setViewport( this.width, 0, this.width, this.height );
                this.renderer.render( this.scene3D, this.camDebug);
                this.camera.camHelper().visible = false;                
            }
            
        }.bind(this);
        
        this.update = function()
        {
            this.camera.update();
            this.updateControl();            
            this.scene.wait();
            this.renderScene();
            
        }.bind(this);
        
        
        this.onWindowResize = function(){

            this.width      = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
            this.height     = window.innerHeight;
            this.camera.resize(this.width,this.height);
            this.renderer.setSize( window.innerWidth, window.innerHeight );
            this.renderScene();
        }.bind(this);
        
                             
    };
    
    c3DEngine.prototype.initCamera = function()
    {
        this.camera     = new Camera(this.width, this.height, this.debug);        
        this.camera.camera3D.position.z = 30000000;      
        this.scene3D.add(this.camera.camera3D);
                
        if(this.debug)
        {
            this.camDebug   = new THREE.PerspectiveCamera( 30, this.camera.ratio, 1, 1000000000) ;
            this.camDebug.position.x = -10000000;
            this.camDebug.position.y =  10000000;            
            this.camDebug.lookAt(new THREE.Vector3(0,0,0));
            this.scene3D.add(this.camera.camHelper());                        
        }
        
    };
    
    c3DEngine.prototype.initRenderer = function()
    {
        this.renderer   = new THREE.WebGLRenderer( { antialias: true,alpha: true,logarithmicDepthBuffer : true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(window.innerWidth, window.innerHeight );        
        this.renderer.setClearColor( 0x030508 );
        this.renderer.autoClear = false;
        
        document.body.appendChild( this.renderer.domElement );
    };
        
    

    
        
    c3DEngine.prototype.init = function(scene){
        
        this.scene  = scene;
        this.initRenderer();        
        this.initControls();
        window.addEventListener( 'resize', this.onWindowResize, false );
        this.controls.addEventListener( 'change', this.update );
        
    };
        
    c3DEngine.prototype.updateControl = function()
    {
        var len  = this.camera.position().length ();
                
        if( len < 8000000 )
        {
            var t = Math.pow(Math.cos((8000000 - len)/ (8000000 - 6378137) * Math.PI * 0.5),1.5);                
            this.controls.zoomSpeed     = t;
            this.controls.rotateSpeed   = 0.8 *t;                         
        }
        else if(len >= 8000000 && this.controls.zoomSpeed !== 1.0) 
        {
            this.controls.zoomSpeed     = 1.0;
            this.controls.rotateSpeed   = 0.8;                
        }   
    };
       
       
    /**
    */
    c3DEngine.prototype.style2Engine = function(){
        //TODO: Implement Me 

    };
    
    c3DEngine.prototype.initControls = function(){
        
        this.controls   = new THREE.OrbitControls( this.camera.camera3D,this.renderer.domElement );
        
        this.controls.target        = new THREE.Vector3(0,0,0);
        this.controls.damping       = 0.1;
        this.controls.noPan         = false;
        this.controls.rotateSpeed   = 0.8;
        this.controls.zoomSpeed     = 1.0;
        this.controls.minDistance   = 500000;
        this.controls.maxDistance   = 200000000.0;        
        this.controls.update();
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
    
    

     c3DEngine.prototype.getWindowSize = function(){
         
         return new THREE.Vector2(this.width, this.height);
     };
     
     c3DEngine.prototype.getRenderer = function(){
         
         return this.renderer;
     }
         

    return function(scene){
        instance3DEngine = instance3DEngine || new c3DEngine(scene);
        return instance3DEngine;
    };    

});
