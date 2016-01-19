/**
* Generated On: 2015-10-5
* Class: c3DEngine
* Description: 3DEngine est l'interface avec le framework webGL.
*/

define('Renderer/c3DEngine',[
    'THREE',
    'OrbitControls',
    'GlobeControls',
    'Renderer/Camera',
    'Globe/Atmosphere',
    'Renderer/DepthMaterial',
    'Renderer/BasicMaterial'], function(
        THREE,
        OrbitControls,
        GlobeControls,
        Camera,
        Atmosphere,
        DepthMaterial,
        BasicMaterial){

    var instance3DEngine = null;

    function c3DEngine(){
        //Constructor
        
        if(instance3DEngine !== null){
            throw new Error("Cannot instantiate more than one c3DEngine");
        } 
        
        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ];

        this.debug      = false;
        //this.debug      = true;
        this.scene      = undefined;
        this.scene3D    = new THREE.Scene();               
        this.width      = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
        this.height     = window.innerHeight;
        
        this.renderer   = undefined;
        this.controls   = undefined;                
        this.camera     = undefined;
        this.camDebug   = undefined;
        this.size       = 1.0;
        this.dnear      = 0.0;
        this.dfar       = 0.0;
        
        this.initCamera();
        
        var material    = new BasicMaterial(new THREE.Color(1,0,0));                       
        var geometry    = new THREE.CylinderGeometry(0.6, 0.01,2,32);          
        this.dummy      = new THREE.Mesh( geometry, material );        
        
        this.dummy.material.setRTC(0);
        
        this.scene3D.add(this.dummy);

        this.pickingTexture = new THREE.WebGLRenderTarget( this.width, this.height );
        this.pickingTexture.texture.minFilter        = THREE.LinearFilter;
        this.pickingTexture.texture.generateMipmaps  = false;
        this.pickingTexture.texture.type             = THREE.FloatType;        
        this.pickingTexture.depthBuffer              = true;
          
        this.renderScene = function(){
                  
            if(this.controls.click)
            {                                          
                this.controls.setPointGlobe(this.picking(this.controls.pointClick));                
                this.controls.click      = false;                
            }
            
            this.renderer.clear();            
            this.renderer.setViewport( 0, 0, this.width, this.height );            
            this.renderer.render( this.scene3D, this.camera.camera3D);                       
            
            if(this.debug)
            {
                this.setRTC(0);                
                this.camera.camHelper().visible = true;                
                this.renderer.setViewport( this.width, 0, this.width, this.height );
                this.renderer.render( this.scene3D, this.camDebug);                
                this.camera.camHelper().visible = false;                
                this.setRTC(1);
            }            
            
        }.bind(this);
        
        this.update = function(run)
        {
            this.camera.update();
            this.updateControl();            
            this.scene.wait(run);
            this.renderScene();
                        
        }.bind(this);
                
        this.onWindowResize = function(){

            this.width      = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
            this.height     = window.innerHeight;
            this.camera.resize(this.width,this.height);
            
            this.scene.updateCamera();
            
            if(this.camDebug)
            {
                this.camDebug.aspect = this.camera.ratio;        
                this.camDebug.updateProjectionMatrix(); 
            }   
                        
            this.renderer.setSize( window.innerWidth, window.innerHeight );
            this.update();
            this.renderScene();
        }.bind(this);        
                             
    };
    
    /**
     * Intialisation camera and debug camera
     * @returns {undefined}
     */
    c3DEngine.prototype.initCamera = function()
    {
        this.camera     = new Camera(this.width, this.height, this.debug);        
            
        this.scene3D.add(this.camera.camera3D);
                
        if(this.debug)
        {
            this.camDebug   = new THREE.PerspectiveCamera( 30, this.camera.ratio) ;                                
                             
        }        
    };
    
    /**
     * Initialisation renderer THREE.js
     * @returns {undefined}
     */
    c3DEngine.prototype.initRenderer = function()
    {
        this.renderer   = new THREE.WebGLRenderer( { antialias: true,alpha: true,logarithmicDepthBuffer : true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(window.innerWidth, window.innerHeight );        
        this.renderer.setClearColor( 0x030508 );
        this.renderer.autoClear = false;
        
        document.body.appendChild( this.renderer.domElement );
    };
    
    /**
     * 
     * @param {type} scene
     * @param {type} position
     * @returns {undefined}
     */
    c3DEngine.prototype.init = function(scene,position){
        
        this.scene  = scene;
        this.size    = this.scene.size().x;
        
        this.camera.setPosition(position);
        
        //this.camera.setPosition(new THREE.Vector3());
        
        // if near is too small --> bug no camera helper
        this.camera.camera3D.near = this.size * 2.333;//Math.max(15.0,0.000002352 * this.size);
        this.camera.camera3D.far  = this.size * 10;
        this.camera.camera3D.updateProjectionMatrix();
        
        if(this.debug)
        {
            //var pos = position.clone().multiplyScalar(0.203275);
            //var pos = position.clone().multiplyScalar(  0.203269);
           // var pos = position.clone().multiplyScalar(0.2033);
            
            //var pos = position.clone().multiplyScalar(  1.000001);
            //var pos = position.clone().multiplyScalar(  1.00001);
            
            this.camDebug.position.x = -this.size * 6;
            //this.camDebug.position.copy(pos);
            this.camDebug.lookAt(new THREE.Vector3(0,0,0));
            this.camDebug.near = this.size* 0.1;
            this.camDebug.far  = this.size * 10;
            this.camDebug.updateProjectionMatrix(); 
            this.camera.createCamHelper();
            this.scene3D.add(this.camera.camHelper());              
            var axisHelper = new THREE.AxisHelper( this.size*1.33 );
            this.scene3D.add( axisHelper );
        }
        
        this.camera.camera3D.near = Math.max(15.0,0.000002352 * this.size);                        
        this.camera.camera3D.updateProjectionMatrix();        
        this.initRenderer();        
        this.initControls(this.size);
        
        //this.controls.target        = target;        
        window.addEventListener( 'resize', this.onWindowResize, false );
        this.controls.addEventListener( 'change', this.update );
        
    };
        
    /**
     * TODO : temporaire
     * update control parameter in function of distance of globe
     * @returns {undefined}
     */
    c3DEngine.prototype.updateControl = function()
    {
        var len  = this.camera.position().length ();
        var lim  = this.size*1.3;
            
            if( len < lim )
            {
                var t = Math.pow(Math.cos((lim - len)/ (lim - this.size) * Math.PI * 0.5),1.5);                
                this.controls.zoomSpeed     = t*2.0;
                this.controls.rotateSpeed   = 0.8 *t;    
                var color = new THREE.Color( 0x93d5f8 );

                this.renderer.setClearColor( color.multiplyScalar(1.0-t) );
            }
            else if(len >= lim && this.controls.zoomSpeed !== 1.0) 
            {
                this.controls.zoomSpeed     = 1.0;
                this.controls.rotateSpeed   = 0.8;
                this.renderer.setClearColor( 0x030508 );
            }
    };
    
    c3DEngine.prototype.setRTC = function(rtc)
    {
         for (var x = 0; x < this.scene3D.children.length; x++)
         {
             var node = this.scene3D.children[x];
             
             if(node.setRTC)                
                node.traverseVisible(rtc === 1 ? this.rtcOn.bind(this) : this.rtcOff.bind(this));
             else if(node instanceof Atmosphere)                          
                node.visible  = (rtc === 1);
             
         }
        
    };
    
    c3DEngine.prototype.setPickingRender = function(depth)
    {        

        for (var x = 0; x < this.scene3D.children.length; x++)
        {
            var node = this.scene3D.children[x];
            
            if(node.setPickingRender)         
            {              
               node.traverseVisible(depth === 1 ? this.depthOn.bind(this) : this.depthOff.bind(this));
            }
            else if(node instanceof Atmosphere)                          
               node.visible  = (depth === 0);

        }        
    };
    
    c3DEngine.prototype.rtcOn = function(obj3D)
    {
          obj3D.setRTC(1);
    };
    
    c3DEngine.prototype.rtcOff = function(obj3D)
    {
          obj3D.setRTC(0);
    };
    
    c3DEngine.prototype.depthOn = function(obj3D)
    {
        
        obj3D.setPickingRender(1);
    };
    
    c3DEngine.prototype.depthOff = function(obj3D)
    {
        obj3D.setPickingRender(0);
    };
        
    /**
    */
    c3DEngine.prototype.style2Engine = function(){
        //TODO: Implement Me 

    };
    
    /**
     * @documentation Initialisation of controls camera
     * @param {type} size
     * @returns {undefined}
     */

    c3DEngine.prototype.initControls = function(size){
        
        //this.controls   = new THREE.OrbitControls( this.camera.camera3D,this.renderer.domElement );        
        this.controls   = new THREE.GlobeControls( this.camera.camera3D,this.renderer.domElement );
        
        this.controls.target        = new THREE.Vector3(0,0,0);
        this.controls.damping       = 0.1;
        this.controls.noPan         = false;
        this.controls.rotateSpeed   = 0.8;
        this.controls.zoomSpeed     = 1.0;
        this.controls.minDistance   = size * 0.1;        
        this.controls.maxDistance   = size * 8.0;    
        //this.controls.keyPanSpeed   = 1.0;
        this.controls.keyPanSpeed   = 0.01;
        this.controls.update();
    };
    
    /**
     * TODO : to delete
     * @param {type} mesh
     * @param {type} texture
     * @returns {undefined}
     */
    c3DEngine.prototype.setTexture = function(mesh,texture){
        //TODO: Implement Me         
        mesh.material = new THREE.MeshBasicMaterial( {color: 0xffffff, map: texture} );
    };

    /**
     * add nodeMesh in scene 3D
     * @param {type} node
     * @returns {undefined}
     */    
    c3DEngine.prototype.add3DScene = function(node){
           
        if(Array.isArray(node))                       
        
            this.scene3D.add.apply(this.scene3D,node);        
        
        else
            
            this.scene3D.add(node);
        
    };        

    /**
    */
    c3DEngine.prototype.precision = function(){
        //TODO: Implement Me 

    };
    
    /*
     * return 
     */
    c3DEngine.prototype.getWindowSize = function(){

        return new THREE.Vector2(this.width, this.height);
    };

    /**
     * return renderer THREE.js
     * @returns {undefined|c3DEngine_L7.THREE.WebGLRenderer}
     */
    c3DEngine.prototype.getRenderer = function(){

        return this.renderer;
    };
           
    c3DEngine.prototype.renderTobuffer = function(x,y, width, height) {
                
        // TODO Deallocate render texture    
        this.renderer.clear();            
        this.renderer.setViewport( 0, 0, this.width, this.height );
        this.renderer.render( this.scene3D, this.camera.camera3D, this.pickingTexture );
   
        var pixelBuffer = new Float32Array( width * height * 4 );
	
	this.renderer.readRenderTargetPixels(this.pickingTexture, x,y, width, height , pixelBuffer);
        
        return pixelBuffer;
    };
    
    c3DEngine.prototype.bufferToImage = function(pixelBuffer, width, height) {
        
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        // size the canvas to your desired image
        canvas.width    = width;
        canvas.height   = height;
        
        var imgData = ctx.getImageData(0, 0, width, height);
        imgData.data.set(pixelBuffer);

        ctx.putImageData(imgData, 0, 0);

        // create a new img object
        var image = new Image();

        // set the img.src to the canvas data url
        image.src = canvas.toDataURL();
        
        return image;
        
    };
    
    c3DEngine.prototype.picking = function(point) 
    {
    
        this.setPickingRender(1);        
        this.dummy.visible  = false;          
        this.camera.camera3D.updateMatrixWorld();
        
        var buffer          = this.renderTobuffer(point.x,this.height -  point.y,1,1);     
        var glslPosition    = new THREE.Vector3().fromArray(buffer);      

        this.scene.selectNodeId(buffer[3]);
        
        var worldPosition = glslPosition.applyMatrix4( this.camera.camera3D.matrixWorld); 

        this.dummy.position.copy(worldPosition);                
        var size = worldPosition.clone().sub(this.camera.camera3D.position).length()/200;                
        this.dummy.scale.copy(new THREE.Vector3(size,size,size));                
        this.dummy.lookAt(new THREE.Vector3());
        var quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 );
        this.dummy.quaternion.multiply(quaternion);
        this.dummy.translateY(size);
        this.dummy.updateMatrix();
        this.dummy.updateMatrixWorld();                

        this.setPickingRender(0);
        this.dummy.visible  = true;
        
        return worldPosition;
                
    };

    return function(scene){
        instance3DEngine = instance3DEngine || new c3DEngine(scene);
        return instance3DEngine;
    };    

});
