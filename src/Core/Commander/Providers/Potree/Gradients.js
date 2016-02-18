define(['THREE'], function(THREE){


var Gradients = {
	RAINBOW: [
		[0, new THREE.Color(0.278, 0, 0.714)],
		[1/6, new THREE.Color(0, 0, 1)],
		[2/6, new THREE.Color(0, 1, 1)],
		[3/6, new THREE.Color(0, 1, 0)],
		[4/6, new THREE.Color(1, 1, 0)],
		[5/6, new THREE.Color(1, 0.64, 0)],
		[1, new THREE.Color(1, 0, 0)]
	],
	GRAYSCALE: [
		[0, new THREE.Color(0,0,0)],
		[1, new THREE.Color(1,1,1)]
	]
};

return Gradients;

});