/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import BasicMaterial from 'Renderer/BasicMaterial';

function MultiGeometryMaterial(color, id) {
    //Constructor
    BasicMaterial.call(this, color, id);
}

MultiGeometryMaterial.prototype = Object.create(BasicMaterial.prototype);
MultiGeometryMaterial.prototype.constructor = MultiGeometryMaterial;

MultiGeometryMaterial.prototype.setSelected = function(selected, index) {
    this.uniforms.selected.value = selected ? index + 1 : 0;
};

MultiGeometryMaterial.prototype.getSelectedIndex = function() {
    return this.uniforms.selected.value ? this.uniforms.selected.value - 1 : null;
};

export default MultiGeometryMaterial;
