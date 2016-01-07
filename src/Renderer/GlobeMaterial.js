/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/GlobeMaterial',
    [   'THREE',        
        'Core/System/JavaTools',
        'text!Renderer/Shader/GlobeVS.glsl',
        'text!Renderer/Shader/GlobeFS.glsl'], function(
            THREE,
            JavaTools,
            GlobeVS,
            GlobeFS){
    
    var  Material = function (bbox){
       
        this.Textures_00    = []; 
        this.Textures_00.push(new THREE.Texture()); 
        this.Textures_01    = [];        
        this.Textures_01.push(new THREE.Texture());
        
        this.bbox           = bbox;
        this.pitScale       = new THREE.Vector3(0.0,0.0,1.0);
   
    };
    
    Material.prototype.dispose = function()
    {         
        if(this.shader === undefined)
            return;
        
        this.shader.dispose();
        
        for (var i = 0, max = this.Textures_00.length; i < max; i++)        
        {
            if(this.Textures_00[i] instanceof THREE.Texture)                
                this.Textures_00[i].dispose();
        }
            
        for (var i = 0, max = this.Textures_01.length; i < max; i++)
        {
            if(this.Textures_01[i] instanceof THREE.Texture)
                this.Textures_01[i].dispose();
        }
        
        var jT = new JavaTools();
        
        jT.freeArray(this.Textures_00);
        jT.freeArray(this.Textures_01);
        
        jT.freeArray(this.uniforms.dTextures_00.value);
        jT.freeArray(this.uniforms.dTextures_01.value);
                
    };
    
    Material.prototype.setTexture = function(texture,layer,id,pitScale)
    {         
        if(layer === 0 && texture !== -1)
        {
            this.Textures_00[0] = texture;                  
            if(pitScale)
                this.pitScale   = pitScale;           
        }
        else
        {            
            this.Textures_01[id] = texture;                                              
        }                            
    };
    
    Material.prototype.setDebug = function(debug_value)
    {
        this.uniforms.debug.value   = debug_value;        
    };
    
    Material.prototype.setMatrixRTC = function(rtc)
    {
        if(this.uniforms)
            this.uniforms.mVPMatRTC.value  = rtc;    
    };
    
    Material.prototype.update = function()    
    {
      
        for (var i = 0, max = this.Textures_00.length; i < max; i++) 
            if(this.Textures_00[i].image !== undefined)
                this.Textures_00[i].needsUpdate = true;
        
        for (var i = 0, max = this.Textures_01.length; i < max; i++) 
            if(this.Textures_01[i].image !== undefined)
                this.Textures_01[i].needsUpdate = true;
                
        
        this.uniforms  = 
        {                        
            dTextures_00    : { type: "tv", value: this.Textures_00 },
            dTextures_01    : { type: "tv", value: this.Textures_01 },
            RTC             : { type: "i" , value: 1 },
            nbTextures_00   : { type: "i" , value: 1 },
            nbTextures_01   : { type: "i" , value: this.Textures_01.length },            
            bLatitude       : { type: "f",  value: this.bbox.minCarto.latitude},
            pitScale        : { type: "v3", value: this.pitScale},
            periArcLati     : { type: "f" , value: Math.abs(this.bbox.maxCarto.latitude - this.bbox.minCarto.latitude)},            
            mVPMatRTC       : { type: "m4", value: new THREE.Matrix4()},
            distanceFog     : { type: "f",  value: 1000000000.0},
            debug           : { type: "i" , value: false }
            
        };
        
        this.shader = new THREE.ShaderMaterial( {

            uniforms        : this.uniforms,
            vertexShader    : GlobeVS,
            fragmentShader  : GlobeFS

        });
        
        this.shader.wireframe = false;
        //this.shader.wireframe = true;
    };
    
    return Material;
});
  
  

