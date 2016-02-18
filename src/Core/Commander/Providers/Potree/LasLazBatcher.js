define(['THREE','./workers'], function(THREE, workers){

var LasLazBatcher = function(node){	
	this.push = function(lasBuffer){
		var ww = workers.lasdecoder.getWorker();
		var mins = new THREE.Vector3(lasBuffer.mins[0], lasBuffer.mins[1], lasBuffer.mins[2]);
		var maxs = new THREE.Vector3(lasBuffer.maxs[0], lasBuffer.maxs[1], lasBuffer.maxs[2]);
		mins.add(node.pcoGeometry.offset);
		maxs.add(node.pcoGeometry.offset);
		
		ww.onmessage = function(e){
			var geometry = new THREE.BufferGeometry();
			var numPoints = lasBuffer.pointsCount;
			
			var endsWith = function(str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			}
			
			var positions = e.data.position;
			var colors = e.data.color;
			var intensities = e.data.intensity;
			var classifications = new Uint8Array(e.data.classification);
			var classifications_f = new Float32Array(classifications.byteLength);
			var returnNumbers = new Uint8Array(e.data.returnNumber);
			var numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			var returnNumbers_f = new Float32Array(returnNumbers.byteLength);
			var numberOfReturns_f = new Float32Array(numberOfReturns.byteLength);
			var pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			var pointSourceIDs_f = new Float32Array(pointSourceIDs.length);
			var indices = new ArrayBuffer(numPoints*4);
			var iIndices = new Uint32Array(indices);
			
			var box = new THREE.Box3();
			
			var fPositions = new Float32Array(positions);
			for(var i = 0; i < numPoints; i++){				
				classifications_f[i] = classifications[i];
				returnNumbers_f[i] = returnNumbers[i];
				numberOfReturns_f[i] = numberOfReturns[i];
				pointSourceIDs_f[i] = pointSourceIDs[i];
				iIndices[i] = i;
				
				box.expandByPoint(new THREE.Vector3(fPositions[3*i+0], fPositions[3*i+1], fPositions[3*i+2]));
			}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(intensities), 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(new Float32Array(classifications_f), 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(new Float32Array(returnNumbers_f), 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(new Float32Array(numberOfReturns_f), 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(new Float32Array(pointSourceIDs_f), 1));
			geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 1));
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
			
			var tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);
			
			geometry.boundingBox = new THREE.Box3(mins, maxs);
			//geometry.boundingBox = tightBoundingBox;
			//node.boundingBox = geometry.boundingBox;
			node.tightBoundingBox = tightBoundingBox;
			
			node.geometry = geometry;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;
			
			workers.lasdecoder.returnWorker(ww);
		};
		
		var message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: [node.pcoGeometry.boundingBox.min.x, node.pcoGeometry.boundingBox.min.y, node.pcoGeometry.boundingBox.min.z],
			maxs: [node.pcoGeometry.boundingBox.max.x, node.pcoGeometry.boundingBox.max.y, node.pcoGeometry.boundingBox.max.z],
			bbOffset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z]
		};
		ww.postMessage(message, [message.buffer]);
	}
};

return LasLazBatcher;


})