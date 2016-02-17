/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'three';

THREE.StarGeometry = function() {
    THREE.Geometry.call(this);

    for (var i = 0; i < 10000; i++) {

        var vertex = new THREE.Vector3();
        vertex.x = THREE.Math.randFloatSpread(20000000000);
        vertex.y = THREE.Math.randFloatSpread(20000000000);
        vertex.z = THREE.Math.randFloatSpread(20000000000);

        this.vertices.push(vertex);

    }
};

THREE.StarGeometry.prototype = Object.create(THREE.Geometry.prototype);
THREE.StarGeometry.prototype.constructor = THREE.StarGeometry;
