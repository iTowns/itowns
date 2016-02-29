/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/BasicMaterial',
    [   'THREE',
        'Core/defaultValue',
        'Renderer/Shader/SimpleVS.glsl',
        'Renderer/Shader/SimpleFS.glsl',
        'Renderer/Shader/SimpleTextureVS.glsl',
        'Renderer/Shader/SimpleTextureFS.glsl'], function(
            THREE,
            defaultValue,            
            SimpleVS,
            SimpleFS,
            SimpleVTS,
            SimpleFTS)
    {
        
        function BasicMaterial(color){
            //Constructor
            
            THREE.ShaderMaterial.call( this );
            
            this.vertexShader    = SimpleVS;
            this.fragmentShader  = SimpleFS;
            
            this.uniforms  = 
            {                        
                diffuseColor    : { type: "c", value: defaultValue(color,new THREE.Color()) },
                RTC             : { type: "i" , value: 1 },
                mVPMatRTC       : { type: "m4", value: new THREE.Matrix4()},
                distanceFog     : { type: "f" , value: 1000000000.0},
                uuid            : { type: "i" , value: 0},
                debug           : { type: "i" , value: false },
                selected        : { type: "i" , value: false }

            };  
        }        
        
        BasicMaterial.prototype = Object.create( THREE.ShaderMaterial.prototype );
        BasicMaterial.prototype.constructor = BasicMaterial;
      
        BasicMaterial.prototype.enableRTC = function(enable)
        {
            this.uniforms.RTC.value   = enable === true ? 1 : 0;        
        };
                
        BasicMaterial.prototype.setDebug = function(debug_value)
        {
            this.uniforms.debug.value   = debug_value;        
        };

        BasicMaterial.prototype.setMatrixRTC = function(rtc)
        {
            this.uniforms.mVPMatRTC.value  = rtc;    
        };
        BasicMaterial.prototype.setUuid = function(uuid)
        {
            this.uniforms.uuid.value  = uuid;    
        };
       
        BasicMaterial.prototype.setFogDistance = function(df)
        {
            this.uniforms.distanceFog.value  = df;    
        };
        
        BasicMaterial.prototype.setSelected = function(selected)
        {
            this.uniforms.selected.value  = selected;    
        };

        BasicMaterial.prototype.setTexture = function(texture)
        {
            this.uniforms.texture = {
                type: "t",
                value: texture
            };
            texture.needsUpdate = true;
            this.vertexShader    = SimpleVTS;
            this.fragmentShader  = SimpleFTS;
            this.needsUpdate = true;
        };
        
        return BasicMaterial;

    });