/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global THREE */

THREE.OBBHelper = function (OBB)
{
    THREE.Mesh.call(this);
    
    var lX = Math.abs(OBB.box3D.max.x- OBB.box3D.min.x); 
    var lY = Math.abs(OBB.box3D.max.y- OBB.box3D.min.y);
    var lZ = Math.abs(OBB.box3D.max.z- OBB.box3D.min.z); 
                
    this.geometry    = new THREE.BoxGeometry(lX,lY,lZ);        
    var color        = new THREE.Color(Math.random(),Math.random(),Math.random());
    this.material    = new THREE.MeshBasicMaterial( {color : color.getHex(),wireframe : true} );
    
    this.position.copy(OBB.position);    
    this.rotation.copy(OBB.rotation);
    
};

THREE.OBBHelper.prototype = Object.create( THREE.Mesh.prototype );
THREE.OBBHelper.prototype.constructor = THREE.OBBHelper;

THREE.OBBHelper.prototype.update = function (OBB)
{
    var lX = Math.abs(OBB.box3D.max.x- OBB.box3D.min.x); 
    var lY = Math.abs(OBB.box3D.max.y- OBB.box3D.min.y);
    var lZ = Math.abs(OBB.box3D.max.z- OBB.box3D.min.z); 
                
    this.geometry.dispose();    
    this.geometry    = new THREE.BoxGeometry(lX,lY,lZ);
    
    this.position.copy(OBB.position);    
    this.rotation.copy(OBB.rotation);
};
