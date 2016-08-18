/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'THREE';
import BasicMaterial from 'Renderer/BasicMaterial';
import MultiGeometryFS from 'Renderer/Shader/MultiGeometryFS.glsl';

function MultiGeometryMaterial(color, id, geometryCount) {
    //Constructor
    BasicMaterial.call(this, color, id);

	this.fragmentShader = this.fragmentShaderHeader +
        "#define GEOMETRY_COUNT " + geometryCount + "\n" + MultiGeometryFS;

    var colors = [];
    for(var i = 0; i < geometryCount; i++) {
        colors[i] = new THREE.Vector3(1,1,1);
    }

    this.uniforms.colors = {
        type: "v3v",
        value: colors
    };
}

MultiGeometryMaterial.prototype = Object.create(BasicMaterial.prototype);
MultiGeometryMaterial.prototype.constructor = MultiGeometryMaterial;

MultiGeometryMaterial.prototype.setSelected = function(selected, index) {
    this.uniforms.selected.value = selected ? index + 1 : 0;
};

MultiGeometryMaterial.prototype.getSelectedIndex = function() {
    return this.uniforms.selected.value ? this.uniforms.selected.value - 1 : null;
};

MultiGeometryMaterial.prototype.updateColors = function(colorArray) {
    this.uniforms.colors.value = colorArray;
}

export default MultiGeometryMaterial;
