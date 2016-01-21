/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/DepthMaterial',
    [   'THREE',
        'Renderer/BasicMaterial',
        'Core/System/JavaTools',
        'text!Renderer/Shader/DepthVS.glsl',
        'text!Renderer/Shader/DepthFS.glsl'], function(
            THREE,
            BasicMaterial,
            JavaTools,
            DepthVS,
            DepthFS){
    
    var  DepthMaterial = function (){
        
        BasicMaterial.call( this );
       
        this.vertexShader    = DepthVS;
        this.fragmentShader  = DepthFS;
                         
        this.wireframe = false;
        //this.wireframe = true;
   
    };
    
    DepthMaterial.prototype = Object.create( BasicMaterial.prototype );
    DepthMaterial.prototype.constructor = DepthMaterial;
    
    return DepthMaterial;
});
  
  

