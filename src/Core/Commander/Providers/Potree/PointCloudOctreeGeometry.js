define(['./LRU'], function(LRU){

var nodesLoadTimes = {};

var PointCloudOctreeGeometry = function(){
        
        //ATENTION: scope PointCloudOctreeGeometry
        this.lru = this.lru || new LRU();

	this.url = null;
	this.octreeDir = null;
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.numNodesLoading = 0;
	this.nodes = null;
	this.pointAttributes = null;
	this.hierarchyStepSize = -1;
	this.loader = null;
}.bind(this);

return PointCloudOctreeGeometry;

});