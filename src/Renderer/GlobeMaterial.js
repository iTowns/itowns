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

    var GlobeMaterial = function(bbox, id, waterHeight) {

        BasicMaterial.call(this);

        this.Textures_00 = [];
        this.Textures_00.push(new THREE.Texture());
        this.Textures_01 = [];
        //this.textureNoise = new THREE.TextureLoader().load("data/textures/reflection.jpg"); 
        this.textureNoise = new THREE.TextureLoader().load("data/textures/water/water512.jpg"); 

        this.vertexShader = GlobeVS;
        this.fragmentShader = GlobeFS;
        
        this.animateWater = gfxEngine().animationOn;

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
        this.uniforms.pitScale = {
            type: "v3",
            value: new THREE.Vector3(0.0, 0.0, 1.0)
        };
        this.uniforms.pickingRender = {
            type: "i",
            value: 0
        };
        this.uniforms.time = {
            type: "f",
            value: gfxEngine().time
        };
        this.uniforms.textureNoise = {
            type: "t",
            value: this.textureNoise
        };
        this.uniforms.animateWater = {
            type: "i",
            value: this.animateWater
        };
        this.uniforms.waterHeight = {
            type: "f",
            value: waterHeight
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

        for (var i = 0, max = this.Textures_01.length; i < max; i++) {
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

    GlobeMaterial.prototype.setTexture = function(texture, layer, id, pitScale) {
        if (layer === 0 && texture !== -1) {
            this.Textures_00[0] = texture;
            this.nbTextures++;

            if (pitScale)
                this.uniforms.pitScale.value = pitScale;
        } else {
            this.Textures_01[id] = texture; // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11            
            this.nbTextures++;
        }
    };

    GlobeMaterial.prototype.update = function() {
        // Elevation
        for (var i = 0, max = this.Textures_00.length; i < max; i++)
            if (this.Textures_00[i].image !== undefined)
                this.Textures_00[i].needsUpdate = true;

        this.uniforms.dTextures_00.value = this.Textures_00;
        this.uniforms.nbTextures_00.value = 1.0;

        // Image texture (ortho, carto...)
        for (var i = 0, max = this.Textures_01.length; i < max; i++)
            if (this.Textures_01[i] && this.Textures_01[i].image !== undefined)
                this.Textures_01[i].needsUpdate = true;

        this.uniforms.dTextures_01.value = this.Textures_01; // Re-affect all the array each time a new texture is received -> NOT GOOD
        this.uniforms.nbTextures_01.value = this.Textures_01.length;; //this.nbTextures;// this.Textures_01.length;

    };

    GlobeMaterial.prototype.CheekNeedsUpdate = function() {
        for (var i = 0, max = this.Textures_01.length; i < max; i++)
            if (this.Textures_01[i] && this.Textures_01[i].image !== undefined) {
                if (this.Textures_01[i].needsUpdate === true)
                    return false;
            }

        return true;
    };

    GlobeMaterial.prototype.enablePickingRender = function(enable) {
        this.uniforms.pickingRender.value = enable === true ? 1 : 0;

    };
    

    return GlobeMaterial;
});
