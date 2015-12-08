/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/Material',['THREE','Core/Math/MathExtented'], function(THREE,MathExt){
    
    // TODO Temp
    WGS84LatitudeClamp = function(latitude){
                
        var min = -86  / 180 * Math.PI;
        var max =  84  / 180 * Math.PI;

        latitude = Math.max(min,latitude);
        latitude = Math.min(max,latitude);

        return latitude;

    };
       
    var  Material = function (sourceVS,sourcePS,bbox){
       
        this.Textures_00 = [];        
        this.Textures_00.push(new THREE.Texture());        
        this.Textures_01 = [];        
        this.Textures_01.push(new THREE.Texture());
                
        this.uniforms  = 
        {                        
            dTextures_00    : { type: "tv", value: this.Textures_00 },
            dTextures_01    : { type: "tv", value: this.Textures_01 },
            RTC             : { type: "i" , value: 1 },
            nbTextures_00   : { type: "i" , value: 0 },
            nbTextures_01   : { type: "i" , value: 0 },            
            bLatitude       : { type: "f",  value: bbox.minCarto.latitude},
            pitScale        : { type: "v3", value: new THREE.Vector3(0.0,0.0,1.0)},
            periArcLati     : { type: "f" , value: Math.abs(bbox.maxCarto.latitude - bbox.minCarto.latitude)},            
            mVPMatRTC       : { type: "m4", value: new THREE.Matrix4()},
            debug           : { type: "i" , value: false }
            
        };
       
        this.shader = new THREE.ShaderMaterial( {

            uniforms        : this.uniforms,
            vertexShader    : sourceVS,
            fragmentShader  : sourcePS

         });
         
         this.shader.wireframe = false;
        
    };
    
    Material.prototype.setTexture = function(texture,layer,id,pitScale)
    {         
        if(layer === 0 && texture !== -1)
        {
            this.Textures_00[0]                 = texture;        
            this.uniforms.dTextures_00.value    = this.Textures_00;        
            this.uniforms.nbTextures_00.value   = 1.0;
            if(pitScale)
                this.uniforms.pitScale.value    = pitScale;
        }
        else
        {            
            this.Textures_01[id]                = texture;        
            this.uniforms.dTextures_01.value    = this.Textures_01;        
            this.uniforms.nbTextures_01.value   = this.Textures_01.length;                             
        }                            
    };
    
    Material.prototype.setDebug = function(debug_value)
    {
        this.uniforms.debug.value   = debug_value;        
    };
    
    Material.prototype.update = function()    
    {
        this.shader.needsUpdate         = true;               
        
        for (var i = 0, max = this.Textures_00.length; i < max; i++) 
            if(this.Textures_00[i].image !== undefined)
                this.Textures_00[i].needsUpdate = true;
        
        for (var i = 0, max = this.Textures_01.length; i < max; i++) 
            if(this.Textures_01[i].image !== undefined)
                this.Textures_01[i].needsUpdate = true;
                
    };
    
    return Material;
});
  
  

