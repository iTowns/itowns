define (['THREE',
         'Detector'
],function (THREE, 
           Detector
) {

  //gfx global objects
  var scene    = undefined;
  var renderer = undefined;
  var camera   = undefined;
  var controls = undefined;
  var light    = undefined;
  var clock    = new THREE.Clock();
  
  var globe = undefined;
  var domContainer = undefined;

  /** Resize renderer and camera using window size */  
  function resize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
  }

  function render() {
        ++renderer.renderCount;
        renderer.render(scene, camera);
  }


  function  run () {
		var delta = clock.getDelta();
		controls.update(delta);
                if(globe !== undefined) globe.update();

		requestAnimationFrame(run);
		render();
  }

  
  var GFX = function(options)
  {

  }; 	

  GFX.prototype.start = function () {
		domContainer = document.getElementById("canvas_container");

                /*********************************************************************************/
		// if browsers supports webgl   
		if (Detector.webgl) {
			this.startRenderer();

			// create a scene
        		scene = new THREE.Scene();
			// put a camera in the scene
                	camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 500000000);
									
                        //TODO: must be replace by automatic camera postion initialization
			//by using lon/lat
			camera.position.set(30000000.314245179,0,0);
			//change up to north/z
			//change up axis does not change orbitcontrol 
			//when we have threejs version under 67
			camera.up.set( 0, 0, 1 );
			scene.add(camera);

			this.configControls(camera,renderer,scene);

			//window.addEventListener('keydown', onKeyDown, false);
			window.addEventListener('resize', resize, false);

                        this.startGlobe();
                        // start animation frame and rendering
                        run();
                    return true;
		}
                // if browser doesn't support webgl, load this instead
                console.error('There was a problem loading WebGL');
		return false;
};

GFX.prototype.startGlobe = function() {
    
     
};



GFX.prototype.startRenderer = function(){
		var width = window.innerWidth;
		var height = window.innerHeight;
		console.log("width:" + width + " height:" + height);
        	renderer = new THREE.WebGLRenderer();
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		renderer.physicallyBasedShading = true;
		renderer.renderCount = 0;
		renderer.antialias  = true;
		renderer.preserveDrawingBuffer = true; //required to support .toDataURL()
		renderer.alpha  = true;
		renderer.logarithmicDepthBuffer = true;  

									
		renderer.setSize(width, height);
                // OES_standard_derivaties used to compute mip level on mega texturing
		renderer.context.getExtension("OES_standard_derivatives");
		renderer.context.getExtension("OES_texture_float");
		renderer.context.getExtension("OES_texture_float_linear");

		domContainer.appendChild(renderer.domElement);
};

GFX.prototype.configControls = function(camera,renderer,scene){
		
                //orbit camera control
		controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.rotateSpeed = 2;
		controls.zoomSpeed = 5.3;
		controls.panSpeed = 0.8;
		controls.enableZoom  = false;
		controls.enablePan  = false;
		controls.enableDamping  = false;
		controls.dampingFactor  = 0.3;
		controls.keys = [65, 83, 68];
		controls.minDistance = 0;
		controls.maxDistance = Infinity;
		//helper
		var axisHelper = new THREE.AxisHelper( 6366752 );
		scene.add( axisHelper );   
};


return GFX;

});