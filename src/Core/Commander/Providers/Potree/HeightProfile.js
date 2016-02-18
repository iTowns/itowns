define(['THREE'], function(THREE){


var HeightProfile = function(){
	var scope = this;
	
	THREE.Object3D.call( this );

	this.points = [];
	this.spheres = [];
	this.edges = [];
	this.boxes = [];
	this.width = 1;
	this.height = 20;
	this._modifiable = true;
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	var lineColor = new THREE.Color( 0xff0000 );
	
	var createSphereMaterial = function(){
		var sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: 0xff0000, 
			ambient: 0xaaaaaa,
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};
	
	var moveEvent = function(event){
		event.target.material.emissive.setHex(0x888888);
	};
	
	var leaveEvent = function(event){
		event.target.material.emissive.setHex(0x000000);
	};
	
	var dragEvent = function(event){
	
		var tool = event.tool;
		var dragstart = tool.dragstart;
		var mouse = tool.mouse;
	
		if(event.event.ctrlKey){
		
			var mouseStart = new THREE.Vector3(dragstart.mousePos.x, dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(mouse.x, mouse.y, 0);
			var widthStart = dragstart.widthStart;
			
			var scale = 1 - 10 * (mouseStart.y - mouseEnd.y);
			scale = Math.max(0.01, scale);
			if(widthStart){
				scope.setWidth(widthStart *  scale);
			}
		
		}else{
	
			var I = tool.getMousePointCloudIntersection();
				
			if(I){
				var index = scope.spheres.indexOf(tool.dragstart.object);
				scope.setPosition(index, I);
			}
		}
		
		event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	this.addMarker = function(point){	
		
		this.points.push(point);

		// sphere
		var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
		sphere.addEventListener("mousemove", moveEvent);
		sphere.addEventListener("mouseleave", leaveEvent);
		sphere.addEventListener("mousedrag", dragEvent);
		sphere.addEventListener("drop", dropEvent);
		
		this.add(sphere);
		this.spheres.push(sphere);
		
		// edges & boxes
		if(this.points.length > 1){
		
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(lineColor, lineColor, lineColor);
			var lineMaterial = new THREE.LineBasicMaterial( { 
				vertexColors: THREE.VertexColors, 
				linewidth: 2, 
				transparent: true, 
				opacity: 0.4 
			});
			lineMaterial.depthTest = false;
			var edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = false;
			
			this.add(edge);
			this.edges.push(edge);
			
			
			var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			var boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.2});
			var box = new THREE.Mesh(boxGeometry, boxMaterial);
			box.visible = false;
			
			this.add(box);
			this.boxes.push(box);
			
		}

		
		var event = {
			"type": "marker_added",
			"profile": this
		};
		this.dispatchEvent(event);
		
		this.setPosition(this.points.length-1, point);
	};
	
	this.removeMarker = function(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		var edgeIndex = (index == 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		this.remove(this.boxes[edgeIndex]);
		this.boxes.splice(edgeIndex, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
		
		var event = {
			"type": "marker_removed",
			"profile": this
		};
		this.dispatchEvent(event);
	};
	
	/**
	 * see http://www.mathopenref.com/coordpolygonarea2.html
	 */
	this.getArea = function(){
		var area = 0;
		var j = this.points.length - 1;
		
		for(var i = 0; i < this.points.length; i++){
			var p1 = this.points[i];
			var p2 = this.points[j];
			area += (p2.x + p1.x) * (p1.z - p2.z);
			j = i;
		}
		
		return Math.abs(area / 2);
	};
	
	this.setPosition = function(index, position){
		var point = this.points[index];			
		point.copy(position);
		
		var event = {
			type: 		'marker_moved',
			profile:	this,
			index:		index,
			position: 	position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	};
	
	this.setWidth = function(width){
		this.width = width;
		
		this.update();
	};
	
	this.update = function(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			var point = this.points[0];
			this.spheres[0].position.copy(point);
			
			return;
		}
		
		var min = this.points[0].clone();
		var max = this.points[0].clone();
		var centroid = new THREE.Vector3();
		var lastIndex = this.points.length - 1;
		for(var i = 0; i <= lastIndex; i++){
			var point = this.points[i];
			var sphere = this.spheres[i];
			var leftIndex = (i === 0) ? lastIndex : i - 1;
			var rightIndex = (i === lastIndex) ? 0 : i + 1;
			var leftVertex = this.points[leftIndex];
			var rightVertex = this.points[rightIndex];
			var leftEdge = this.edges[leftIndex];
			var rightEdge = this.edges[i];
			var leftBox = this.boxes[leftIndex];
			var rightBox = this.boxes[i];
			
			var leftEdgeLength = point.distanceTo(leftVertex);
			var rightEdgeLength = point.distanceTo(rightVertex);
			var leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
			var rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);
			
			sphere.position.copy(point);
			
			if(this._modifiable){
				sphere.visible = true;
			}else{
				sphere.visible = false;
			}
			
			if(leftEdge){
				leftEdge.geometry.vertices[1].copy(point);
				leftEdge.geometry.verticesNeedUpdate = true;
				leftEdge.geometry.computeBoundingSphere();
			}
			
			if(rightEdge){
				rightEdge.geometry.vertices[0].copy(point);
				rightEdge.geometry.verticesNeedUpdate = true;
				rightEdge.geometry.computeBoundingSphere();
			}
			
			if(leftBox){
				var start = leftVertex;
				var end = point;
				var length = start.clone().setY(0).distanceTo(end.clone().setY(0));
				leftBox.scale.set(length, this.height, this.width);
				
				var center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				var diff = new THREE.Vector3().subVectors(end, start);
				var target = new THREE.Vector3(diff.z, 0, -diff.x);
				
				leftBox.position.set(0,0,0);
				leftBox.lookAt(target);
				leftBox.position.copy(center);
			}
			
			
			
			
			centroid.add(point);
			min.min(point);
			max.max(point);
		}
		centroid.multiplyScalar(1 / this.points.length);
		
		for(var i = 0; i < this.boxes.length; i++){
			var box = this.boxes[i];
			
			box.position.y = min.y + (max.y - min.y) / 2;
			//box.scale.y = max.y - min.y + 50;
			box.scale.y = 1000000;
		}
		
	};
	
	this.raycast = function(raycaster, intersects){
		
		for(var i = 0; i < this.points.length; i++){
			var sphere = this.spheres[i];
			
			sphere.raycast(raycaster, intersects);
		}
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(var i = 0; i < intersects.length; i++){
			var I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
	};
	
	
};

HeightProfile.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(HeightProfile.prototype, "modifiable", {
	get: function(){
		return this.modifiable;
	},
	set: function(value){
		this._modifiable = value;
		this.update();
	}
});

return HeightProfile;

});