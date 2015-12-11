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
    
    this.pointsWorld ;
    
};

THREE.OBB.prototype = Object.create( THREE.Object3D.prototype );
THREE.OBB.prototype.constructor = THREE.OBB;

THREE.OBB.prototype.update = function(){

    this.updateMatrix(); 
    this.updateMatrixWorld();
    
    this.quaInv = this.quaternion.clone().inverse();
    
    this.pointsWorld = this.cPointsWorld(this.points());
};

//THREE.OBB.prototype.clone = function(){
//
//    var obb = THREE.OBB();
//    
//    return obb;
//    
//};

THREE.OBB.prototype.quadInverse = function(){

    return this.quaInv;
};

THREE.OBB.prototype.addHeight = function(bbox)
{    

    this.box3D.min.z += bbox.minCarto.altitude;
    this.box3D.max.z += bbox.maxCarto.altitude;
    /*
    var nHalfSize   = Math.abs(this.box3D.min.z + this.box3D.max.z)*0.5;
    
    var translaZ    = this.box3D.min.z + nHalfSize;
    
    this.box3D.min.z = -nHalfSize;
    this.box3D.max.z =  nHalfSize;
    
    this.translateZ(translaZ);
    */
};

THREE.OBB.prototype.points = function(){

    var points = [
                    new THREE.Vector3(),
                    new THREE.Vector3(),
                    new THREE.Vector3(),
                    new THREE.Vector3(),
                    new THREE.Vector3(),
                    new THREE.Vector3(),
                    new THREE.Vector3(),
                    new THREE.Vector3()
		];

    points[ 0 ].set( this.box3D.min.x, this.box3D.min.y, this.box3D.min.z );
    points[ 1 ].set( this.box3D.min.x, this.box3D.min.y, this.box3D.max.z );
    points[ 2 ].set( this.box3D.min.x, this.box3D.max.y, this.box3D.min.z );
    points[ 3 ].set( this.box3D.min.x, this.box3D.max.y, this.box3D.max.z );
    points[ 4 ].set( this.box3D.max.x, this.box3D.min.y, this.box3D.min.z );
    points[ 5 ].set( this.box3D.max.x, this.box3D.min.y, this.box3D.max.z );
    points[ 6 ].set( this.box3D.max.x, this.box3D.max.y, this.box3D.min.z );
    points[ 7 ].set( this.box3D.max.x, this.box3D.max.y, this.box3D.max.z );

    return points;
};

THREE.OBB.prototype.cPointsWorld = function(points){

    var m = this.matrixWorld;

    for (var i = 0, max = points.length; i < max; i++) {
        points[ i ].applyMatrix4(m);
    }
        
    return points;

};