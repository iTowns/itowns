/**
 *
 * Class: GeometryProj
 */


import THREE from 'THREE';

function GeometryProj() {
    //Constructor

}

GeometryProj.prototype = Object.create(THREE.BufferGeometry.prototype);
GeometryProj.prototype.constructor = GeometryProj;

GeometryProj.prototype.enableRTC = function(enable) {
    this.material.enableRTC(enable);
};

GeometryProj.prototype.enablePickingRender = function(enable) {
    this.material.enablePickingRender(enable);
};

GeometryProj.prototype.setFog = function(fog) {
    this.material.setFogDistance(fog);
};

GeometryProj.prototype.setMatrixRTC = function(rtc) {
    this.material.setMatrixRTC(rtc);
};

GeometryProj.prototype.setDebug = function(enable) {
    this.material.setDebug(enable);
};

GeometryProj.prototype.setSelected = function(select) {
    this.material.setSelected(select);
};


export default GeometryProj;
