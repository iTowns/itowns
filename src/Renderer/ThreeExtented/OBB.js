/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global THREE */

THREE.OBB = function (min, max,OObject, helper)
{
    THREE.Box3.call( this,min,max);
    
    this.OObject = OObject;
    
    this.helper  = helper;
};

THREE.OBB.prototype = Object.create( THREE.Geometry.prototype );
THREE.OBB.prototype.constructor = THREE.OBB;