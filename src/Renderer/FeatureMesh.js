/**
 * Generated On: 2016-05-27
 * Class: FeatureMesh
 * Description: Tuile correspondant à un layer à poser au dessus des tuiles de terrains.
 */

import NodeMesh from 'Renderer/NodeMesh';
import FeatureMaterial from 'Renderer/FeatureMaterial';
import * as THREE from 'three';

function FeatureMesh(params, builder) {
    NodeMesh.call(this);

    this.material = new FeatureMaterial();

    this.builder = builder;

    this.center = this.builder.Center(params);
    this.OBBParam = this.builder.OBB(params);

    this.bboxId = params.id;
    this.bbox 	= params.bbox;

    this.box3D 	= new THREE.Box3(new THREE.Vector3(this.bbox.west(), this.bbox.south(), this.bbox.bottom()),
								new THREE.Vector3(this.bbox.east(), this.bbox.north(), this.bbox.top()));
    this.centerSphere = new THREE.Vector3();
    this.level 	= params.level;

    this.geometry = new THREE.Geometry();
}

FeatureMesh.prototype = Object.create(NodeMesh.prototype);
FeatureMesh.prototype.constructor = FeatureMesh;

FeatureMesh.prototype.setSelected = function () {
};

FeatureMesh.prototype.OBB = function () {
    return this.OBBParam;
};

FeatureMesh.prototype.enablePickingRender = function (enable) {
    this.material.enablePickingRender(enable);
};

FeatureMesh.prototype.setMatrixRTC = function (rtc) {
    this.material.setMatrixRTC(rtc);
};

FeatureMesh.prototype.setFog = function (fog) {
    this.material.setFogDistance(fog);
};

FeatureMesh.prototype.setWireframed = function () {
    this.material.wireframe = true;
    this.material.wireframeLineWidth = 20;
    this.material.linewidth = 20;
};

export default FeatureMesh;
