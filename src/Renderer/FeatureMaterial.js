/**
 * Generated On: 2016-07-11
 * Class: FeatureMesh
 * Description: Tuile correspondant à un layer à poser au dessus des tuiles de terrains.
 */


define('Renderer/FeatureMaterial', ['THREE',
    'Core/defaultValue',
    'Renderer/Shader/FeatureVS.glsl',
    'Renderer/Shader/FeatureFS.glsl',
    'Renderer/BasicMaterial'
], function(
    THREE,
    defaultValue,
    FeatureVS,
    FeatureFS,
    BasicMaterial) {

    function FeatureMaterial() {
        BasicMaterial.call(this);

        this.vertexShader = FeatureVS;
        this.fragmentShader = FeatureFS;

        this.uniforms.pickingRender = {
            type: "i",
            value: 0
        };
    }

    FeatureMaterial.prototype = Object.create(BasicMaterial.prototype);
    FeatureMaterial.prototype.constructor = FeatureMaterial;

    FeatureMaterial.prototype.enablePickingRender = function(enable) {
        this.uniforms.pickingRender.value = enable === true ? 1 : 0;
    };

    return FeatureMaterial;

});
