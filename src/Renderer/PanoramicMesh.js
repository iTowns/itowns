/**
 * Generated On: 2015-10-5
 * Class: PanoramicMesh
 * PanoramicMesh is using projectiveTextureMaterial to texture geometryProj
 *
 */


import * as THREE from 'three';

const PanoramicMesh = function PanoramicMesh(geom, mat, absC) {
    THREE.Mesh.call(this);

    this.matrixAutoUpdate = false;
    this.rotationAutoUpdate = false;

    this.geometry = geom;
    this.material = mat;
    this.absoluteCenter = absC;
    this.position.copy(this.absoluteCenter);
    this.name = 'terrestrialMesh';

    this.frustumCulled = false;

    // console.log("this.absoluteCenter",this.absoluteCenter);
};

PanoramicMesh.prototype = Object.create(THREE.Mesh.prototype);
PanoramicMesh.prototype.constructor = PanoramicMesh;


PanoramicMesh.prototype.setGeometry = function setGeometry(geom) {
    this.geometry = geom;
};

PanoramicMesh.prototype.setMaterial = function setMaterial(mat) {
    this.material = mat;
};

PanoramicMesh.prototype.setMatrixRTC = function setMatrixRTC(rtc) {
    //  console.log(this.material);
    this.material.uniforms.mVPMatRTC.value = rtc;
};

PanoramicMesh.prototype.enableRTC = function enableRTC() {
    //  this.material.enableRTC(enable);
};

PanoramicMesh.prototype.setFog = function setFog() {
    //  this.material.setFogDistance(fog);
};

PanoramicMesh.prototype.setSelected = function setSelected() {
    //  this.material.setSelected(select);
};


export default PanoramicMesh;
