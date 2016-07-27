/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import NodeMesh from 'Renderer/NodeMesh';
import StarGeometry from 'StarGeometry';
import THREE from 'three';



var Star = function() {


    NodeMesh.call(this);

    var geom = new StarGeometry();

    var particles = new THREE.Points(geom, new THREE.PointsMaterial({
        color: 0xAAAACC
    }));
    this.add(particles);

};

Star.prototype = Object.create(NodeMesh.prototype);

Star.prototype.constructor = Star;


export default Star;
