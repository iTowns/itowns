/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var THREE = require('three');

THREE.OBB = function(min, max,lookAt,translate) {
    THREE.Object3D.call(this);
    this.box3D = new THREE.Box3(min, max);
    
    this.natBox = this.box3D.clone();

    this.quaInv = this.quaternion.clone().inverse();
    
    
    if(lookAt)
        this.lookAt(lookAt);
    
    
    if(translate)
    {
        this.translateX(translate.x);
        this.translateY(translate.y);
        this.translateZ(translate.z);        
    }
    
    this.oPosition = new THREE.Vector3();
    
    this.update();
    
    this.oPosition = this.position.clone();

    this.pointsWorld;

};

THREE.OBB.prototype = Object.create(THREE.Object3D.prototype);
THREE.OBB.prototype.constructor = THREE.OBB;

THREE.OBB.prototype.update = function() {

    this.updateMatrix();
    this.updateMatrixWorld();

    this.quaInv = this.quaternion.clone().inverse();

    this.pointsWorld = this.cPointsWorld(this.points());
};

THREE.OBB.prototype.quadInverse = function() {

    return this.quaInv;
};

THREE.OBB.prototype.addHeight = function(bbox) {

    var depth = Math.abs(this.natBox.min.z - this.natBox.max.z);
    // 
    this.box3D.min.z = this.natBox.min.z + bbox.minCarto.altitude;
    this.box3D.max.z = this.natBox.max.z + bbox.maxCarto.altitude;

    // TODO à vérifier --->

    var nHalfSize = Math.abs(this.box3D.min.z - this.box3D.max.z) * 0.5;
    var translaZ = this.box3D.min.z + nHalfSize;
    this.box3D.min.z = -nHalfSize;
    this.box3D.max.z = nHalfSize;
        
    this.position.copy(this.oPosition);
//    this.updateMatrix();
//    this.updateMatrixWorld(true);

    this.translateZ(translaZ);

    this.update();

    return new THREE.Vector2(nHalfSize - depth * 0.5, translaZ);

    // TODO <---- à vérifier 
};

THREE.OBB.prototype.points = function() {

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

    points[0].set(this.box3D.min.x, this.box3D.min.y, this.box3D.min.z);
    points[1].set(this.box3D.min.x, this.box3D.min.y, this.box3D.max.z);
    points[2].set(this.box3D.min.x, this.box3D.max.y, this.box3D.min.z);
    points[3].set(this.box3D.min.x, this.box3D.max.y, this.box3D.max.z);
    points[4].set(this.box3D.max.x, this.box3D.min.y, this.box3D.min.z);
    points[5].set(this.box3D.max.x, this.box3D.min.y, this.box3D.max.z);
    points[6].set(this.box3D.max.x, this.box3D.max.y, this.box3D.min.z);
    points[7].set(this.box3D.max.x, this.box3D.max.y, this.box3D.max.z);

    return points;
};

THREE.OBB.prototype.cPointsWorld = function(points) {

    var m = this.matrixWorld;

    for (var i = 0, max = points.length; i < max; i++) {
        points[i].applyMatrix4(m);
    }

    return points;

};
