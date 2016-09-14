/**
 * Generated On: 2016-07-11
 * Class: FeatureMesh
 * Description: Materiel d'une tuile correspondant à un layer a poser au dessus des tuiles de terrains.
 */

import FeatureVS from 'Renderer/Shader/FeatureVS.glsl';
import FeatureFS from 'Renderer/Shader/FeatureFS.glsl';
import BasicMaterial from 'Renderer/BasicMaterial';

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

export default FeatureMaterial;
