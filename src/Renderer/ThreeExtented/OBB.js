/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global THREE */

THREE.OBB = function (min,max)
{
    THREE.Object3D.call( this);    
    this.box3D = new THREE.Box3(min,max);     
    
    this.quaInv = this.quaternion.clone().inverse();
    
};

THREE.OBB.prototype = Object.create( THREE.Object3D.prototype );
THREE.OBB.prototype.constructor = THREE.OBB;

THREE.OBB.prototype.update = function(){

    this.updateMatrix(); 
    this.updateMatrixWorld(); 
    
    this.quaInv = this.quaternion.clone().inverse();
};


THREE.OBB.prototype.quadInverse = function(){

    return this.quaInv;
};