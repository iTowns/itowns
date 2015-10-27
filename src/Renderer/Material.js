/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/Material',['THREE'], function(THREE){
    
       
    var  Material = function (sourceVS,sourcePS,bbox,zoom){
       
        this.Textures_00 = [];
        
        this.Textures_00.push(new THREE.Texture());
        
        this.Textures_01 = [];        
        this.Textures_01.push(new THREE.Texture());
        
        
        this.uniforms  = 
        {                        
            dTextures_00    : { type: "tv", value: this.Textures_00 },
            dTextures_01    : { type: "tv", value: this.Textures_01 },
            nbTextures_00   : { type: "f" , value: 0.0 },
            nbTextures_01   : { type: "f" , value: 0.0 },
            bLongitude      : { type: "v2", value: new THREE.Vector2(bbox.minCarto.longitude,bbox.maxCarto.longitude)}, 
            bLatitude       : { type: "v2", value: new THREE.Vector2(bbox.minCarto.latitude,bbox.maxCarto.latitude)},
            zoom            : { type: "f" , value: zoom }
        };
       
        this.shader = new THREE.ShaderMaterial( {

            uniforms        : this.uniforms,
            vertexShader    : sourceVS,
            fragmentShader  : sourcePS

         });
        
    };
    
    Material.prototype.setTexture = function(texture,layer,id)
    {         
        if(layer === 0)
        {
            this.Textures_00[0]                = texture;        
            this.uniforms.dTextures_00.value   = this.Textures_00;        
            this.uniforms.nbTextures_00.value  = 1.0;        
         
        }
        else
        {
            this.Textures_01[id]               = texture;        
            this.uniforms.dTextures_01.value   = this.Textures_01;        
            this.uniforms.nbTextures_01.value  = this.Textures_01.length;                 
        }
            
        this.shader.needsUpdate         = true;
    };
    
    return Material;
});
  
  

