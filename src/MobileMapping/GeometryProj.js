/**
 *
 * Class: GeometryProj
 */


import * as THREE from 'three';

function GeometryProj() {
    // Constructor

}

GeometryProj.prototype = Object.create(THREE.BufferGeometry.prototype);
GeometryProj.prototype.constructor = GeometryProj;

GeometryProj.prototype.enableRTC = function enableRTC(enable) {
    this.material.enableRTC(enable);
};


GeometryProj.prototype.setFog = function setFog(fog) {
    this.material.setFogDistance(fog);
};

GeometryProj.prototype.setMatrixRTC = function setMatrixRTC(rtc) {
    this.material.setMatrixRTC(rtc);
};

GeometryProj.prototype.setDebug = function setDebug(enable) {
    this.material.setDebug(enable);
};

GeometryProj.prototype.setSelected = function setSelected(select) {
    this.material.setSelected(select);
};


export default GeometryProj;
