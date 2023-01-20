/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


// import * as THREE from 'three';
import { Mesh, SphereGeometry, Color, MeshBasicMaterial } from 'three';

function SphereHelper(radius) {
    Mesh.call(this);

    this.geometry = new SphereGeometry(radius, 8, 8);
    var color = new Color(Math.random(), Math.random(), Math.random());
    this.material = new MeshBasicMaterial({
        color: color.getHex(),
        wireframe: true,
    });
}

SphereHelper.prototype = Object.create(Mesh.prototype);
SphereHelper.prototype.constructor = SphereHelper;

SphereHelper.prototype.update = function update(radius) {
    this.geometry.dispose();
    this.geometry = new SphereGeometry(radius, 8, 8);
};

export default SphereHelper;
