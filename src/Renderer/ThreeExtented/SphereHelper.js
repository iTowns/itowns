/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var THREE = require('three');

THREE.SphereHelper = function(radius) {
    THREE.Mesh.call(this);

    this.geometry = new THREE.SphereGeometry(radius, 8, 8);
    var color = new THREE.Color(Math.random(), Math.random(), Math.random());
    this.material = new THREE.MeshBasicMaterial({
        color: color.getHex(),
        wireframe: true
    });

};

THREE.SphereHelper.prototype = Object.create(THREE.Mesh.prototype);
THREE.SphereHelper.prototype.constructor = THREE.SphereHelper;

THREE.SphereHelper.prototype.update = function(radius) {
    this.geometry.dispose();
    this.geometry = new THREE.SphereGeometry(radius, 8, 8);
};
