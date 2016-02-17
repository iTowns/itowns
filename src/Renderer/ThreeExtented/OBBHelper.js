/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var THREE = require('three');
require('three/examples/js/utils/FontUtils');
require('Renderer/Three/optimer_regular');

THREE.OBBHelper = function(OBB, text) {
    var indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);
    var positions = new Float32Array(8 * 3);

    var geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

    var color = new THREE.Color(Math.random(), Math.random(), Math.random());

    THREE.LineSegments.call(this, geometry, new THREE.LineBasicMaterial({
        color: color.getHex()
    }));

    if (OBB !== undefined)
        this.update(OBB);

    this.position.copy(OBB.position);
    this.rotation.copy(OBB.rotation);

    var box = OBB.box3D;
    var min = box.min;
    var max = box.max;

    var sizeX = max.x - min.x;
    var sizeY = max.y - min.y;
    var sizeZ = max.z - min.z;

    var parameters = {
        font: "optimer",
        size: sizeX * 0.0666,
        curveSegments: 0
    };

    var textShapes = THREE.FontUtils.generateShapes(text, parameters);
    //var geoShape    = new THREE.ShapeGeometry(textShapes);//new THREE.SphereGeometry(500000)

    var extrudeSettings = {
        amount: sizeZ * 0.001,
        bevelEnabled: false,
        steps: 0,
        curveSegments: 0,
        steps: 0
    };

    var geoShape = new THREE.ExtrudeGeometry(textShapes, extrudeSettings);

    this.textMesh = new THREE.Mesh(geoShape, new THREE.MeshBasicMaterial({
        color: new THREE.Color(1, 0, 0),
        side: THREE.DoubleSide
    }));

    this.textMesh.translateX(-sizeX * 0.45);
    this.textMesh.translateY(-sizeY * 0.45);
    this.textMesh.translateZ(sizeZ * 0.52);

    this.add(this.textMesh);

};

THREE.OBBHelper.prototype = Object.create(THREE.LineSegments.prototype);
THREE.OBBHelper.prototype.constructor = THREE.OBBHelper;

THREE.OBBHelper.prototype.setMaterialVisibility = function(show) {
    this.material.visible = show;
    this.textMesh.material.visible = show;
};

THREE.OBBHelper.prototype.update = function(OBB) {
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

    var sizeX = max.x - min.x;
    var sizeY = max.y - min.y;
    var sizeZ = max.z - min.z;

    if (this.textMesh) {
        this.textMesh.position.copy(new THREE.Vector3());
        this.textMesh.translateX(-sizeX * 0.45);
        this.textMesh.translateY(-sizeY * 0.45);
        this.textMesh.translateZ(sizeZ * 0.5);
    }
};
