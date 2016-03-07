/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/GlobeMaterial', ['THREE',
    'Renderer/BasicMaterial',
    'Renderer/c3DEngine',
    'Core/System/JavaTools',
    'Renderer/Shader/GlobeVS.glsl',
    'Renderer/Shader/GlobeFS.glsl'
], function(
    THREE,
    BasicMaterial,
    gfxEngine,
    JavaTools,
    GlobeVS,
    GlobeFS) {

    var emptyTexture = new THREE.Texture();

    var GlobeMaterial = function(id) {

        BasicMaterial.call(this);

        this.Textures_00 = [];
        this.Textures_00.push(emptyTexture);
        this.Textures_01 = [];
        this.Textures_01.push(emptyTexture);

        this.vertexShader = GlobeVS;
        this.fragmentShader = GlobeFS;
        
        this.pitScale_L01 = [];
        this.pitScale_L01.push(new THREE.Vector3(0.0, 0.0, 0.0));

        this.uniforms.dTextures_00 = {
            type: "tv",
            value: this.Textures_00
        };
        this.uniforms.dTextures_01 = {
            type: "tv",
            value: this.Textures_01
        };
        this.uniforms.nbTextures_00 = {
            type: "i",
            value: 0
        };
        this.uniforms.nbTextures_01 = {
            type: "i",
            value: 0
        };
        this.uniforms.pitScale_L00 = {
            type: "v3",
            value: new THREE.Vector3(0.0, 0.0, 0.0)
        };
        this.uniforms.pitScale_L01 = {
            type: "v3v",
            value: this.pitScale_L01
        };
        this.uniforms.pickingRender = {
            type: "i",
            value: 0
        };
        this.uniforms.lightingOn = {
             type: "i",
             value: gfxEngine().lightingOn
        },
        this.uniforms.lightPosition = {
            type: "v3",
            value: new THREE.Vector3(-0.5, 0.0, 1.0)
        };

        this.setUuid(id);
        this.nbTextures = 0;
        this.wireframe = false;
        //this.wireframe = true;

    };

    GlobeMaterial.prototype = Object.create(BasicMaterial.prototype);
    GlobeMaterial.prototype.constructor = GlobeMaterial;

    GlobeMaterial.prototype.dispose = function() {

        this.dispatchEvent({
            type: 'dispose'
        });

        for (var i = 0, max = this.Textures_00.length; i < max; i++) {
            if (this.Textures_00[i] instanceof THREE.Texture)
                this.Textures_00[i].dispose();
        }

        for (i = 0, max = this.Textures_01.length; i < max; i++) {
            if (this.Textures_01[i] instanceof THREE.Texture)
                this.Textures_01[i].dispose();
        }

        var jT = new JavaTools();

        jT.freeArray(this.Textures_00);
        jT.freeArray(this.Textures_01);

        jT.freeArray(this.uniforms.dTextures_00.value);
        jT.freeArray(this.uniforms.dTextures_01.value);
        this.nbTextures = 0;
    };

    GlobeMaterial.prototype.setTexture = function(texture, layer, slot, pitScale) {
 
            // BUG #59
            
            if (layer === 0 ) {
                this.Textures_00[0] = texture ? texture : emptyTexture ;                
                this.nbTextures++;
                if (pitScale)
                    this.uniforms.pitScale_L00.value = pitScale;
            } else if (layer === 0 ){
                this.Textures_01[slot] = texture ? texture : emptyTexture; // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11                 
                this.pitScale_L01[slot] = pitScale ? pitScale : new THREE.Vector3(0.0,0.0,1.0);                                             
                this.nbTextures++;
            }
 
    };
    
    GlobeMaterial.prototype.setTexturesLayer = function(textures, layer){
                        
        for (var i = 0, max = textures.length; i < max; i++) {
            
            if(textures[i])
            {                    
                if (layer === 0) {
                    this.Textures_00[i] = textures[i].texture ? textures[i].texture : emptyTexture;                    

                    if (textures[i].pitch)
                        this.uniforms.pitScale_L00.value = textures[i].pitch;
                }
                else if (layer === 1 )
                {
                    this.Textures_01[i] = textures[i].texture ? textures[i].texture : emptyTexture; // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11                
                    this.pitScale_L01[i] = textures[i].pitch ? textures[i].pitch : new THREE.Vector3(0.0,0.0,1.0);                                                                             
                }
            }   
        }
        
        this.nbTextures+= textures.length;
    };
    
    
    GlobeMaterial.prototype.update = function() {
        
        var nTexture = 0;
        // Layer 0 -> elevatio
        for (var i = 0, max = this.Textures_00.length; i < max; i++)
            if (this.Textures_00[i] && this.Textures_00[i].image)
            {             
                nTexture++;
                this.Textures_00[i].needsUpdate = true;
            }
       
        this.uniforms.nbTextures_00.value = nTexture;
        
        // Layer 1 -> Image texture (ortho, carto...)
        nTexture = 0;
        for (i = 0, max = this.Textures_01.length; i < max; i++)
            if (this.Textures_01[i] && this.Textures_01[i].image)
            {
                nTexture++;
                this.Textures_01[i].needsUpdate = true;
            }
      
        this.uniforms.nbTextures_01.value = nTexture++; //this.nbTextures;// this.Textures_01.length;

    };

    GlobeMaterial.prototype.enablePickingRender = function(enable) {
        this.uniforms.pickingRender.value = enable === true ? 1 : 0;

    };
    
    GlobeMaterial.prototype.setLightingOn = function (enable){
        this.uniforms.lightingOn.value = enable === true ? 1 : 0;
    };

    return GlobeMaterial;
});
