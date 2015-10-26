/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/Material',['THREE'], function(THREE){
    
       
    var  Material = function (sourceVS,sourcePS){
       
        this.Textures = [];
        
        this.Textures.push(new THREE.Texture());
        
        this.uniforms  = 
        {                        
            dTextures       : { type: "tv", value: this.Textures },
            nbTextures      : { type: "f" , value: 0.0 }
        };
       
        this.shader = new THREE.ShaderMaterial( {

            uniforms        : this.uniforms,
            vertexShader    : sourceVS,
            fragmentShader  : sourcePS

         });
        
    };
    
    Material.prototype.setTexture = function(texture)
    {         
        this.Textures[0]                = texture;        
        this.uniforms.dTextures.value   = this.Textures;        
        this.uniforms.nbTextures.value  = 1.0;        
        this.shader.needsUpdate         = true;
    };
    
    return Material;
});
  
  

