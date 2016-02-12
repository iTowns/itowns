/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Globe/Clouds',['Renderer/NodeMesh',
                       'THREE',
                       'Renderer/c3DEngine',
                       'Core/Commander/Providers/WMS_Provider',
                       'text!Renderer/Shader/CloudsFS.glsl',
                       'text!Renderer/Shader/CloudsVS.glsl'], function(NodeMesh, THREE, gfxEngine, WMS_Provider, CloudsFS, CloudsVS){

    function Clouds(size){
        
        NodeMesh.call( this );
        
        this.providerWMS = new WMS_Provider();
        this.sphereCloud = null;

        //this.sphereCloud = this.generate();
        
        var loader = new THREE.TextureLoader();
        loader.crossOrigin = '';
        
        this.uniforms  = 
        {                        
            atmoIN  : { type: "i" , value: 0 },
            screenSize: {type: "v2", value: new THREE.Vector2(window.innerWidth,window.innerHeight)}, // Should be updated on screen resize...
            diffuse: { type: "t" , value: 
                       loader.load("http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=1024&height=512") 
            }
        };
       
        this.material = new THREE.ShaderMaterial( {
	
            uniforms        : this.uniforms,
            vertexShader    : CloudsVS,
            fragmentShader  : CloudsFS,
          //  side            : THREE.BackSide,
          //  blending        : THREE.AdditiveBlending,
            transparent     : true,
            wireframe       : false

        } );
        
        
        this.generate();
    /*            
        this.geometry       = new THREE.SphereGeometry( size.x * 1.14 , 128, 128 );
        
        this.uniformsIn  = 
        {                        
            atmoIN  : { type: "i" , value: 1 },
            screenSize: {type: "v2", value: new THREE.Vector2(window.innerWidth,window.innerHeight)} // Should be updated on screen resize...
        };
        
        var materialAtmoIn = new THREE.ShaderMaterial( {
	
            uniforms        : this.uniformsIn,
            vertexShader    : GlowVS,
            fragmentShader  : GlowFS,
            side            : THREE.FrontSide,
            blending        : THREE.AdditiveBlending,
            transparent     : true

        } );
        
  
       var atmosphereIN    = new THREE.Mesh(new THREE.SphereGeometry( size.x * 1.002, 64, 64 ),materialAtmoIn);
        
       this.add(atmosphereIN);
              */
    }
    
    Clouds.prototype = Object.create( NodeMesh.prototype );
    
    Clouds.prototype.constructor = Clouds;    
    
    
    Clouds.prototype.generate = function(){
      
      
        var coWMS = {latBound:  new THREE.Vector2(-85,85),
                     longBound: new THREE.Vector2(-178,178),
                     width:     1024,
                     height:    512 };
                 
        var geometry = new THREE.SphereGeometry( 6490000, 32, 32 ); 
  /*      var mat = new THREE.MeshBasicMaterial(); 
        var url = "http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=2048&height=1024 ";//this.providerWMS.getTextureOrtho(coWMS,0);//"http://realearth.ssec.wisc.edu/api/image?products=globalir_20160211_170000&x=0&y=0&z=0&format=image/jpg";
        var loader = new THREE.TextureLoader();
        loader.crossOrigin = '';
        var texture = loader.load(url); //offset
       // texture.offset = 0
        var material = new THREE.MeshBasicMaterial( {map: texture, transparent: true, opacity:0.75});//this.providerWMS.getTextureOrtho(coWMS,0)) } );
 */       this.sphereCloud = new THREE.Mesh( geometry, this.material); //material);//erial );
        this.sphereCloud.rotation.y += Math.PI;
      //  this.add(this.sphereCloud); 
      //  gfxEngine.scene3D.add(this.sphereCloud);
                    
                    
                    
     /*               
        this.providerWMS.getTextureOrtho(coWMS,0).then
            (
                function(result)
                {                                                             
                    console.log(result);
                    var geometry = new THREE.SphereGeometry( 8000000, 32, 32 );
                    //var material = new THREE.MeshBasicMaterial( {map: result.texture} );
                    var material = new THREE.MeshBasicMaterial( {map: new THREE.TextureLoader().load( Clouds.providerWMS.getTextureOrtho(coWMS,0)) } );
                    this.sphereCloud = new THREE.Mesh( geometry, material );
                    this.add(this.sphereCloud); 
                    gfxEngine.scene3D.add(this.sphereCloud);
                    return sphereCloud;

                }.bind(this)
            );
    */
        
    };
   
    return Clouds;

});
