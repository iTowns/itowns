/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/* global Uint16Array Float32Array*/

import THREE from 'three';

// TODO regler le probleme glsl
import fontJS from './fonts/optimer_regular.glsl';
var font = new THREE.Font(JSON.parse(fontJS.substring(65, fontJS.length - 2)));

function OBBHelper(OBB, text) {
    var indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);
    var positions = new Float32Array(8 * 3);

    var geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

    var color = new THREE.Color(Math.random(), Math.random(), Math.random());

    THREE.LineSegments.call(this, geometry, new THREE.LineBasicMaterial({
        color: color.getHex()
    }));

    var size = OBB.box3D.size();

    var geometryText = new THREE.TextGeometry(text, {

        font: font,
        size: size.x * 0.0666,
        height: size.z * 0.001,
        curveSegments: 1

    });

    this.textMesh = new THREE.Mesh(geometryText, new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0, 0),
        side: THREE.DoubleSide
    }));

    this.add(this.textMesh);

    if (OBB !== undefined)
        this.update(OBB);

}

OBBHelper.prototype = Object.create(THREE.LineSegments.prototype);
OBBHelper.prototype.constructor = OBBHelper;

OBBHelper.prototype.setMaterialVisibility = function(show) {
    this.material.visible = show;
    this.textMesh.material.visible = show;
};

OBBHelper.prototype.update = function(OBB) {
    var box = OBB.box3D;
    var min = box.min;
    var max = box.max;
    var position = this.geometry.attributes.position;
    var array = position.array;

    array[0] = max.x;
    array[1] = max.y;
    array[2] = max.z;
    array[3] = min.x;
    array[4] = max.y;
    array[5] = max.z;
    array[6] = min.x;
    array[7] = min.y;
    array[8] = max.z;
    array[9] = max.x;
    array[10] = min.y;
    array[11] = max.z;
    array[12] = max.x;
    array[13] = max.y;
    array[14] = min.z;
    array[15] = min.x;
    array[16] = max.y;
    array[17] = min.z;
    array[18] = min.x;
    array[19] = min.y;
    array[20] = min.z;
    array[21] = max.x;
    array[22] = min.y;
    array[23] = min.z;

    position.needsUpdate = true;

    this.position.copy(OBB.position);
    this.rotation.copy(OBB.rotation);
    this.updateMatrix();
    this.updateMatrixWorld(true);

    var size = OBB.box3D.size();

    if (this.textMesh) {
        this.textMesh.position.set(0, 0, 0);
        this.textMesh.translateX(-size.x * 0.45);
        this.textMesh.translateY(-size.y * 0.45);
        this.textMesh.translateZ(size.z * 0.5);
    }
};

export default OBBHelper;
