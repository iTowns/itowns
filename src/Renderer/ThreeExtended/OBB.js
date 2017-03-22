/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import * as THREE from 'three';

function OBB(min, max, lookAt, translate) {
    THREE.Object3D.call(this);
    this.box3D = new THREE.Box3(min, max);

    this.natBox = this.box3D.clone();

    this.quaInv = this.quaternion.clone().inverse();


    if (lookAt)
        { this.lookAt(lookAt); }


    if (translate) {
        this.translateX(translate.x);
        this.translateY(translate.y);
        this.translateZ(translate.z);
    }

    this.oPosition = new THREE.Vector3();

    this.update();

    this.oPosition = this.position.clone();
}

OBB.prototype = Object.create(THREE.Object3D.prototype);
OBB.prototype.constructor = OBB;

OBB.prototype.update = function update() {
    this.updateMatrix();
    this.updateMatrixWorld(true);

    this.quaInv = this.quaternion.clone().inverse();

    this.pointsWorld = this.cPointsWorld(this.points());
};

OBB.prototype.inverseQuaternion = function inverseQuaternion() {
    return this.quaInv;
};

OBB.prototype.addHeight = function addHeight(bbox) {
    var depth = Math.abs(this.natBox.min.z - this.natBox.max.z);
    //
    this.box3D.min.z = this.natBox.min.z + bbox.bottom();
    this.box3D.max.z = this.natBox.max.z + bbox.top();

    // TODO à vérifier --->

    var nHalfSize = Math.abs(this.box3D.min.z - this.box3D.max.z) * 0.5;
    var translaZ = this.box3D.min.z + nHalfSize;
    this.box3D.min.z = -nHalfSize;
    this.box3D.max.z = nHalfSize;

    this.position.copy(this.oPosition);
    //    this.updateMatrix();
    //    this.updateMatrixWorld(true);

    this.translateZ(translaZ);

    this.update();

    return new THREE.Vector2(nHalfSize - depth * 0.5, translaZ);

    // TODO <---- à vérifier
};

OBB.prototype.points = function points() {
    var points = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
    ];

    points[0].set(this.box3D.min.x, this.box3D.min.y, this.box3D.min.z);
    points[1].set(this.box3D.min.x, this.box3D.min.y, this.box3D.max.z);
    points[2].set(this.box3D.min.x, this.box3D.max.y, this.box3D.min.z);
    points[3].set(this.box3D.min.x, this.box3D.max.y, this.box3D.max.z);
    points[4].set(this.box3D.max.x, this.box3D.min.y, this.box3D.min.z);
    points[5].set(this.box3D.max.x, this.box3D.min.y, this.box3D.max.z);
    points[6].set(this.box3D.max.x, this.box3D.max.y, this.box3D.min.z);
    points[7].set(this.box3D.max.x, this.box3D.max.y, this.box3D.max.z);

    return points;
};

OBB.prototype.cPointsWorld = function cPointsWorld(points) {
    var m = this.matrixWorld;

    for (var i = 0, max = points.length; i < max; i++) {
        points[i].applyMatrix4(m);
    }

    return points;
};

export default OBB;
