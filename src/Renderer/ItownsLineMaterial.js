/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/ItownsLineMaterial', ['THREE',
    'Renderer/BasicMaterial',
    'Core/System/JavaTools',
    'Renderer/Shader/LineVS.glsl',
    'Renderer/Shader/LineFS.glsl'
], function(
    THREE,
    BasicMaterial,
    JavaTools,
    LineVS,
    LineFS) {

    var ItownsLineMaterial = function(options) {
            BasicMaterial.call(this);
            
            if(options === undefined)
                         throw new Error("options is required");
            

            this.vertexShader = LineVS;
            this.fragmentShader = LineFS;

            this.wireframe = false;

            var texture = THREE.ImageUtils.loadTexture(options.texture);

            this.uniforms.time =  { value: options.time };
            this.uniforms.THICKNESS   = { value: options.linewidth};
            this.uniforms.MITER_LIMIT = { value: 1.0 };
            this.uniforms.WIN_SCALE = { value: new THREE.Vector2(window.innerWidth,window.innerHeight) }; // todo: vraie resolution
            this.uniforms.texture = { type: "t", value: texture };
            this.uniforms.useTexture = { value: options.useTexture};
            this.uniforms.opacity = { type: "f", value: options.opacity};
            this.uniforms.sizeAttenuation = { type: 'f', value: options.sizeAttenuation};
            this.uniforms.color = {type: 'v3', value: options.color};

            this.transparent = true;
    };

    ItownsLineMaterial.prototype = Object.create(BasicMaterial.prototype);
    ItownsLineMaterial.prototype.constructor = ItownsLineMaterial;

    return ItownsLineMaterial;
});
