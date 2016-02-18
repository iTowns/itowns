define(['THREE'], function(THREE){

var PointCloudArena4DProxyNode = function(geometryNode){
	THREE.Object3D.call( this );
	
	this.geometryNode = geometryNode;
	this.pcoGeometry = geometryNode;
	this.boundingBox = geometryNode.boundingBox;
	this.boundingSphere = geometryNode.boundingSphere;
	this.number = geometryNode.name;
	this.numPoints = geometryNode.numPoints;
	this.level = geometryNode.level;
};

PointCloudArena4DProxyNode.prototype = Object.create(THREE.Object3D.prototype);

return PointCloudArena4DProxyNode;

});