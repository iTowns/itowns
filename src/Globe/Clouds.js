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
        
        this.providerWMS = new WMS_Provider({});
        this.loader = new THREE.TextureLoader();
        this.loader.crossOrigin = '';
        
        this.geometry       = new THREE.SphereGeometry( 6400000, 96, 96 ); 
        
        this.uniforms  = 
        {                        
           diffuse: { type: "t" , value: 
                       this.loader.load("http://realearth.ssec.wisc.edu/api/image?products=globalir&bounds=-85,-178,85,178&width=256&height=128") 
            }
        };
        
       
        this.material = new THREE.ShaderMaterial( {
	
            uniforms        : this.uniforms,
            vertexShader    : CloudsVS,
            fragmentShader  : CloudsFS,
         //   blending        : THREE.AdditiveBlending,
            transparent     : true,
            wireframe       : false

        } );
        
        this.rotation.y += Math.PI;
        
        this.generate();
   
    }
    
    Clouds.prototype = Object.create( NodeMesh.prototype );
    
    Clouds.prototype.constructor = Clouds;    
    
    
    Clouds.prototype.generate = function(){
      
      
        var coWMS = {latBound:  new THREE.Vector2(-85,85),
                     longBound: new THREE.Vector2(-178,178),
                     width:     8192,
                     height:    4096 };
                 

        var url = this.providerWMS.urlGlobalIR(coWMS, 0);
        this.loader.load(url, function ( texture ) {
	    this.material.uniforms.diffuse.value = texture;
            this.material.uniforms.diffuse.needsUpdate = true;
        }.bind(this));

        
    };
   
    return Clouds;

});
