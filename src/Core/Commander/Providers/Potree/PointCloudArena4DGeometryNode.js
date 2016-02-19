define(['THREE'], 
function(THREE){

var PointCloudArena4DGeometryNode = function(){
	var scope = this;

	this.left = null;
	this.right = null;
	this.boundingBox = null;
	this.number = null;
	this.pcoGeometry = null;
	this.loaded = false;
	this.numPoints = 0;
	this.level = 0;
};

var nodesLoading = 0;

PointCloudArena4DGeometryNode.prototype.load = function(){

	if(this.loaded || this.loading){
		return;
	}
	
	if(PointCloudArena4DGeometryNode.nodesLoading >= 5){
		return;
	}
	
	this.loading = true;
	
	PointCloudArena4DGeometryNode.nodesLoading++;
	
	var url = this.pcoGeometry.url + "?node=" + this.number;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	
	var scope = this;
	
	xhr.onreadystatechange = function(){
		if(!(xhr.readyState === 4 && xhr.status === 200)){
			return;
		}
		
		var buffer = xhr.response;
		var view = new DataView(buffer);
		var numPoints = buffer.byteLength / 17;
		
		var positions = new Float32Array(numPoints*3);
		var colors = new Float32Array(numPoints*3);
		var indices = new Uint32Array(numPoints);
		
		for(var i = 0; i < numPoints; i++){
			var x = view.getFloat32(i*17 + 0, true) + scope.boundingBox.min.x;
			var y = view.getFloat32(i*17 + 4, true) + scope.boundingBox.min.y;
			var z = view.getFloat32(i*17 + 8, true) + scope.boundingBox.min.z;
			var r = view.getUint8(i*17 + 12, true) / 256;
			var g = view.getUint8(i*17 + 13, true) / 256;
			var b = view.getUint8(i*17 + 14, true) / 256;
			
			positions[i*3+0] = x;
			positions[i*3+1] = y;
			positions[i*3+2] = z;
			
			colors[i*3+0] = r;
			colors[i*3+1] = g;
			colors[i*3+2] = b;
			
			indices[i] = i;
		}
		
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.addAttribute("color", new THREE.BufferAttribute(colors, 3));
		geometry.addAttribute("indices", new THREE.BufferAttribute(indices, 1));
		geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
		
		scope.geometry = geometry;
		scope.loaded = true;
		nodesLoading--;
		
		geometry.boundingBox = scope.boundingBox;
		geometry.boundingSphere = scope.boundingSphere;
		
		scope.numPoints = numPoints;
		
		scope.loading = false;
	};
	
	xhr.send(null);
};

return PointCloudArena4DGeometryNode;

});