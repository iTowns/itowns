/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/LayeredMaterial', ['THREE',
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
    var nbLayer = 2;

    var LayeredMaterial = function(id) {

        BasicMaterial.call(this);

        this.vertexShader = GlobeVS;
        this.fragmentShader = GlobeFS;

        this.Textures = [];
        this.pitScale = [];
        this.nbTextures = [];
        this.paramLayers = [];

        this.nColorLayer = 1;

        // Uniform three js needs no empty array
        for (var l = 0; l < nbLayer; l++) {

            this.Textures[l] = [emptyTexture];
            this.pitScale[l] = [new THREE.Vector3(0.0, 0.0, 0.0)];
            this.nbTextures[l] = 0;
            this.paramLayers[l] = new THREE.Vector4(0.0, 1.0,1.0,1.0);
        }

        this.uniforms.dTextures_00 = {
            type: "tv",
            value: this.Textures[0]
        };
        this.uniforms.dTextures_01 = {
            type: "tv",
            value: this.Textures[1]
        };
        this.uniforms.nbTextures = {
            type: "iv1",
            value: this.nbTextures
        };
        this.uniforms.nColorLayer = {
            type: "i",
            value: this.nColorLayer
        };

        // PIT n Textures
        // Projection
        // Opacity
        // Visible

        this.uniforms.paramLayers = {
            type: "v4v",
            value: this.paramLayers
        };
        this.uniforms.pitScale_L00 = {
            type: "v3v",
            value: this.pitScale[0]
        };
        this.uniforms.pitScale_L01 = {
            type: "v3v",
            value: this.pitScale[1]
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

        this.setUuid(id || 0);
        this.wireframe = false;
        //this.wireframe = true;

    };

    LayeredMaterial.prototype = Object.create(BasicMaterial.prototype);
    LayeredMaterial.prototype.constructor = LayeredMaterial;

    LayeredMaterial.prototype.dispose = function() {

        this.dispatchEvent({
            type: 'dispose'
        });

        for (var l = 0; l < nbLayer; l++)
            for (var i = 0, max = this.Textures[l].length; i < max; i++)
                if (this.Textures[l][i] instanceof THREE.Texture)
                    this.Textures[l][i].dispose();

        var jT = new JavaTools();

        jT.freeArray(this.Textures[0]);
        jT.freeArray(this.Textures[1]);

        jT.freeArray(this.uniforms.dTextures_00.value);
        jT.freeArray(this.uniforms.dTextures_01.value);
    };

    LayeredMaterial.prototype.nbLoadedTextures = function() {

        return this.nbTextures[0] + this.nbTextures[1];
    };

    LayeredMaterial.prototype.setTexture = function(texture, layer, slot, pitScale) {


        if(this.Textures[layer][slot] === undefined || this.Textures[layer][slot].image === undefined)
            this.nbTextures[layer] += 1 ;

        this.Textures[layer][slot] = texture ? texture : emptyTexture; // BEWARE: array [] -> size: 0; array [10]="wao" -> size: 11

        this.pitScale[layer][slot] = pitScale ? pitScale : new THREE.Vector3(0.0,0.0,1.0);

    };

    LayeredMaterial.prototype.setTexturesLayer = function(textures, layer){

        for (var i = 0, max = textures.length; i < max; i++) {

            if(textures[i])
                this.setTexture(textures[i].texture,layer,i,textures[i].pitch);

        }
    };

    LayeredMaterial.prototype.enablePickingRender = function(enable) {
        this.uniforms.pickingRender.value = enable === true ? 1 : 0;

    };

    LayeredMaterial.prototype.setLightingOn = function (enable){
        this.uniforms.lightingOn.value = enable === true ? 1 : 0;
    };

    LayeredMaterial.prototype.setLayerOpacity = function (id,opacity){

        if(this.paramLayers[id])
        {
            this.paramLayers[id].w = opacity;
        }
    };

     LayeredMaterial.prototype.setLayerVibility = function (id,visible){

        if(this.paramLayers[id])
        {
            this.paramLayers[id].z = visible ? 1 : 0;
        }
    };

    return LayeredMaterial;
});
