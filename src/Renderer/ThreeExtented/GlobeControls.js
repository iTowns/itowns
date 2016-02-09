
/*global THREE, console, Infinity */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

THREE.GlobeControls = function ( object, domElement,engine ) {

	this.object         = object;        
        this.cloneObject    = object.clone();
      
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target           = new THREE.Vector3();        
       
        this.engine           = engine;
    
	// center is old, deprecated; use "target" instead
	this.center = this.target;

	// This option actually enables dollying in and out; left as "zoom" for
	// backwards compatibility
	this.noZoom = false;
	this.zoomSpeed = 1.0;

	// Limits to how far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// Limits to how far you can zoom in and out ( OrthographicCamera only )
	this.minZoom = 0;
	this.maxZoom = Infinity;

	// Set to true to disable this control
	this.noRotate = false;
	this.rotateSpeed = 1.0;

	// Set to true to disable this control
	this.noPan = false;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// Set to true to automatically rotate around the target
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians
        
        this.radius = null;
        this.theta  = null;
        this.phi    = null;
        
        this.localPhi = 0;
        this.localTheta = 0;
        
        this.pointClickOnScreen = new THREE.Vector2();
        var pickOnGlobe       = new THREE.Vector3();
        var rayonPointGlobe   = 6378137;
        var raycaster         = new THREE.Raycaster();

        this.pickOnSphere = new THREE.Vector3();
        
	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40, SPACE:32, CTRL:17, SHIFT:16};

	// Mouse buttons
	this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };
        
        this.globeTargetX = new THREE.Vector3(1000,1000,1000);
        
        this.keyCtrl = false;
        this.keyShift = false;
	////////////
	// internals
        
        
        var space = false;

	var scope = this;

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	var theta   = null;
	var phi     = null;
	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();
 
	var lastPosition = new THREE.Vector3();
	var lastQuaternion = new THREE.Quaternion();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5,MOVE_GLOBE : 6, ROTATEONITSELF : 7 };

	var state = STATE.NONE;
  
	// for reset

	this.target0 = this.target.clone();
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	// so camera.up is the orbit axis

	var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
	var quatInverse = quat.clone().inverse();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };
          
    
        this.getPointGlobe = function ()         
        { 
            return pickOnGlobe;
        };
        
	this.setPointGlobe = function ( point ) 
        {                      
            if(point === undefined)
                pickOnGlobe = undefined;
            else
            {
                pickOnGlobe = new THREE.Vector3().copy(point);                  
                rayonPointGlobe = pickOnGlobe.length();            
            }
        };
        
        this.intersectSphere = function ( ray )   
        {
            
         
           var c    = new THREE.Vector3(); 
           var pc   = ray.closestPointToPoint(c);
           var r    = rayonPointGlobe;           
           var a    = pc.length();
           
           if(a>r)
              return new THREE.Vector3();
           
           var d    = ray.direction.clone();                      
           var b    = Math.sqrt(r*r -a*a);
           
           d.negate().setLength(b);
           
           return new THREE.Vector3().addVectors(pc,d);
      
       };
      
        this.toSpherical = function ( point )   
        {        
            var pTheta  = Math.atan2( point.x, point.z );
            var pPhi    = Math.atan2( Math.sqrt( point.x * point.x + point.z * point.z ), point.y );

            return new THREE.Vector2(pTheta,pPhi);
            
        };

	this.rotateLeft = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		thetaDelta -= angle;

	};

	this.rotateUp = function ( angle ) {

		if ( angle === undefined ) {

			angle = getAutoRotationAngle();

		}

		phiDelta -= angle;

	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );

		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );

		pan.add( panOffset );

	};

	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object instanceof THREE.PerspectiveCamera ) {

			// perspective
			var position = scope.object.position;
			var offset = position.clone().sub( scope.target );
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

		} else if ( scope.object instanceof THREE.OrthographicCamera ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: GlobeControls.js encountered an unknown camera type - pan disabled.' );

		}

	};

	this.dollyIn = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		if ( scope.object instanceof THREE.PerspectiveCamera ) {

			scale /= dollyScale;

		} else if ( scope.object instanceof THREE.OrthographicCamera ) {

			scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
			scope.object.updateProjectionMatrix();
			scope.dispatchEvent( changeEvent );

		} else {

			console.warn( 'WARNING: GlobeControls.js encountered an unknown camera type - dolly/zoom disabled.' );

		}

	};

	this.dollyOut = function ( dollyScale ) {

		if ( dollyScale === undefined ) {

			dollyScale = getZoomScale();

		}

		if ( scope.object instanceof THREE.PerspectiveCamera ) {

			scale *= dollyScale;

		} else if ( scope.object instanceof THREE.OrthographicCamera ) {

			scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
			scope.object.updateProjectionMatrix();
			scope.dispatchEvent( changeEvent );

		} else {

			console.warn( 'WARNING: GlobeControls.js encountered an unknown camera type - dolly/zoom disabled.' );

		}

	};
        
        
        this.updateTarget = function () 
        {
            if(!space)
            {
                this.target = new THREE.Vector3();
                //this.object.lookAt( this.target );
            }
            else
            {
                var target = this.object.position.clone().setLength(2);

                this.target  = new THREE.Vector3().subVectors(this.object.position,target);                                

                this.object.lookAt( this.target );
                
//                this.object.rotation.x = 0.0;
//                this.object.rotation.y = 0.0;
//                this.object.rotation.z = 0.0;
                
            }
        };
        
        this.rot = function (point,lscale)         
        {
            

            // angle from z-axis around y-axis

            theta = Math.atan2( point.x, point.z );

            // angle from y-axis

            phi = Math.atan2( Math.sqrt( point.x * point.x + point.z * point.z ), point.y );

            if ( this.autoRotate && state === STATE.NONE ) {

                    this.rotateLeft( getAutoRotationAngle() );

            }
  
            theta += thetaDelta;
            phi += phiDelta;

            // restrict theta to be between desired limits
            theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

            // restrict phi to be between desired limits
            phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

            // restrict phi to be betwee EPS and PI-EPS
            phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

            var radius = point.length() * lscale;

            // restrict radius to be between desired limits
            radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

            // move target to panned location
            //this.target.add( pan );

            point.x = radius * Math.sin( phi ) * Math.sin( theta );
            point.y = radius * Math.cos( phi );
            point.z = radius * Math.sin( phi ) * Math.cos( theta );

           
        };
        
	this.update = function () {

            if(pickOnGlobe === undefined)
            {                
                thetaDelta  = 0;
                phiDelta    = 0;
                return;
            }
            
            var position = ( state === STATE.MOVE_GLOBE ) ? this.cloneObject.position : this.object.position;                    
            
            if(state === STATE.MOVE_GLOBE)
            {                
                offset.copy( position );
            }
            else
            {                
                offset.copy(this.globeTarget.worldToLocal(position.clone()));
            }
          
            //if(state !== STATE.MOVE_GLOBE)
           //     offset.applyQuaternion( quat );
            
            this.rot(offset,scale);
            // rotate point back to "camera-up-vector-is-up" space
            
            //if(state !== STATE.MOVE_GLOBE)
             //   offset.applyQuaternion( quatInverse );   
            
            
            var offGT = this.globeTarget.position.clone();   
             
            if(state === STATE.MOVE_GLOBE)                
            {           
                this.rot(offGT,1);
                this.object.position.copy(offset);            
            }
            else if(state !== STATE.ROTATEONITSELF)  
            { 
                this.object.position.copy( this.globeTarget.localToWorld(offset.clone())); 
                
            }
                
            if(state === STATE.ROTATEONITSELF)  {
             
             
                this.localPhi += phiDelta;
                this.localTheta += thetaDelta;
                
                var cameraPos = this.object.position;
      
                var normal = cameraPos.clone().normalize();
                var quaternion  = new THREE.Quaternion();
                quaternion.setFromAxisAngle( new THREE.Vector3(1, 0 ,0 ), Math.PI/2 );

                var child = new THREE.Object3D();
                var localTarget = new THREE.Vector3().addVectors ( cameraPos.clone(), normal );
                child.lookAt(localTarget);
                child.quaternion.multiply(quaternion );                
                child.updateMatrix();

                var quaternionTHETA = new THREE.Quaternion();
                quaternionTHETA.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), this.localTheta );
                child.quaternion.multiply(quaternionTHETA);
                
                var quaternionPHI = new THREE.Quaternion();
                quaternionPHI.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), this.localPhi );
                child.quaternion.multiply(quaternionPHI);
  
                var rotationALL = new THREE.Euler().setFromQuaternion( child.quaternion);//, eulerOrder ); 
                
                this.object.rotation.set(rotationALL.x,rotationALL.y,rotationALL.z);
                
            }else
                 this.object.lookAt( offGT );   // Usual CASE (not rotating around camera axe)

            thetaDelta = 0;
            phiDelta = 0;
            scale = 1;
            pan.set( 0, 0, 0 );

            // update condition is:
            // min(camera displacement, camera rotation in radians)^2 > EPS
            // using small-angle approximation cos(x/2) = 1 - x^2 / 8

            if ( lastPosition.distanceToSquared( this.object.position ) > EPS
                || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ) {

                    this.dispatchEvent( changeEvent );

                    lastPosition.copy( this.object.position );
                    lastQuaternion.copy (this.object.quaternion );

            }
	};

        this.getSpace = function () {
            return space;
        };

	this.reset = function () {

		state = STATE.NONE;

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );
		this.object.zoom = this.zoom0;

		this.object.updateProjectionMatrix();
		this.dispatchEvent( changeEvent );

		this.update();

	};

	this.getPolarAngle = function () {

		return phi;

	};

	this.getAzimuthalAngle = function () {

		return theta;

	};

	function getAutoRotationAngle() {

		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

	}

	function getZoomScale() {

		return Math.pow( 0.95, scope.zoomSpeed );

	}

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === scope.mouseButtons.ORBIT ) {
			if ( scope.noRotate === true ) return;

                        if(scope.keyCtrl)
                        {
                            state = STATE.ROTATE;  
                        }else
                            if(scope.keyShift)
                        {
                            state = STATE.ROTATEONITSELF;  
                        }
                        else{                                                        
                            computeTarget(scope.engine.picking());
                            scope.engine.renderScene(); // TODO debug to remove white screen, but why?                            
                            state = STATE.MOVE_GLOBE;
                        }
                            
			rotateStart.set( event.clientX, event.clientY );
                        
                        if(pickOnGlobe !== undefined)
                        {
                            scope.setPointGlobe(undefined); 
                            scope.pointClickOnScreen.x = event.clientX;
                            scope.pointClickOnScreen.y = event.clientY;
                            scope.cloneObject          = scope.object.clone();                            
                        }
                        

		} else if ( event.button === scope.mouseButtons.ZOOM ) {
			if ( scope.noZoom === true ) return;

			state = STATE.DOLLY;

			dollyStart.set( event.clientX, event.clientY );

		} else if ( event.button === scope.mouseButtons.PAN ) {
			if ( scope.noPan === true ) return;

			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );

		}
                

		if ( state !== STATE.NONE ) {
			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( startEvent );
		}

	}

	function onMouseMove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
                                
		if ( state === STATE.ROTATE ) {

			if ( scope.noRotate === true ) return;

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
                        if(!space)
                        {
                            scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed  );                                                

			// rotating up and down along whole screen attempts to go 360, but limited to 180
                            scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );
        
                        }
                        else
                        {
                            
                            
                            scope.rotateLeft( rotateDelta.x );
                          
			// rotating up and down along whole screen attempts to go 360, but limited to 180
                            scope.rotateUp(   rotateDelta.y );
                        }
                                                

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.ROTATEONITSELF ) {   
                    
                    if ( scope.noRotate === true ) return;
                   
                    rotateEnd.set( event.clientX, event.clientY );
		    rotateDelta.subVectors( rotateEnd, rotateStart );
                    
                    scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed  );                                                
                    scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );
                    rotateStart.copy( rotateEnd );       
                    
                }else if ( state === STATE.DOLLY ) {

			if ( scope.noZoom === true ) return;

			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				scope.dollyIn();

			} else if ( dollyDelta.y < 0 ) {

				scope.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {

			if ( scope.noPan === true ) return;

			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );

			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

		}
                else if ( state === STATE.MOVE_GLOBE ) {
                    
                    
                            if(pickOnGlobe === undefined)
                            {
                                thetaDelta = 0.0;
                                phiDelta   = 0.0;
                            }
                            else
                            {                                
                                var mouse   = new THREE.Vector2();
  
                                mouse.x =   ( event.clientX / window.innerWidth )   * 2 - 1;
                                mouse.y = - ( event.clientY / window.innerHeight )  * 2 + 1;	

                                raycaster.setFromCamera( mouse, scope.cloneObject);
                                var ray = raycaster.ray;
                                    
                               // var target = scope.globeTarget.clone();                                
                               // target.position.copy(new THREE.Vector3());
                                
                               // target.updateMatrixWorld();
                                
                               // console.log(target.worldToLocal(scope.cloneObject.position.clone()));
                                
                                scope.pickOnSphere = scope.intersectSphere(ray);
                                
                                var centerGlobeCam = new THREE.Vector3().applyMatrix4(scope.cloneObject.matrixWorldInverse);                                   
                                var pickOnGlobeCam = pickOnGlobe.clone().applyMatrix4(scope.cloneObject.matrixWorldInverse).sub(centerGlobeCam);
                                var pickOnSpherCam = scope.pickOnSphere.clone().applyMatrix4(scope.cloneObject.matrixWorldInverse).sub(centerGlobeCam);
                                
                                var a  = scope.toSpherical(pickOnGlobeCam);
                                var b  = scope.toSpherical(pickOnSpherCam);                                
                                var c  = scope.toSpherical(pickOnGlobe);
                               
                                phiDelta   =  (a.y - b.y);
                                thetaDelta =  (a.x - b.x)/(Math.cos(Math.PI * 0.5 - c.y));

                            }
                }

		if ( state !== STATE.NONE ) scope.update();

	}

	function onMouseUp( /* event */ ) {

		if ( scope.enabled === false ) return;

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;
                                
                computeTarget(scope.engine.picking());
                scope.engine.renderScene(); // TODO debug to remove white screen, but why?                
                                
	}

	function onMouseWheel( event ) {

		if ( scope.enabled === false || scope.noZoom === true || state !== STATE.NONE ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.dollyOut();

		} else if ( delta < 0 ) {

			scope.dollyIn();

		}

		scope.update();
		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

        function onKeyUp( event ) {
            
            if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;
            
            if(scope.keyCtrl)   
            {
                computeVectorUp();
                rotateTarget();
                              
            }
            
            if(scope.keyShift)   
            {
                computeVectorUp();
                rotateTarget();
                              
            }
            
            scope.keyCtrl = false;  
            scope.keyShift = false;
        }

	function onKeyDown( event ) {


		if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;
                scope.keyCtrl = false;
                scope.keyShift = false;
                
		switch ( event.keyCode ) {

			case scope.keys.UP:
				scope.pan( 0, scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.BOTTOM:
				scope.pan( 0, - scope.keyPanSpeed );
				scope.update();
				break;

			case scope.keys.LEFT:
				scope.pan( scope.keyPanSpeed, 0 );
				scope.update();
				break;

			case scope.keys.RIGHT:
				scope.pan( - scope.keyPanSpeed, 0 );
				scope.update();
				break;
                        case scope.keys.SPACE:
                                space = !space;     
                                scope.updateTarget();
                                scope.update();
                                break;
                        case scope.keys.CTRL:       
                                computeVectorUp();
                                scope.keyCtrl = true;
                                break;
                        case scope.keys.SHIFT:       
                                computeVectorUp();
                                scope.keyShift = true;
                                break;

		}
	}

	function touchstart( event ) {

		if ( scope.enabled === false ) return;

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				if ( scope.noRotate === true ) return;

				state = STATE.TOUCH_ROTATE;

				rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:	// two-fingered touch: dolly

				if ( scope.noZoom === true ) return;

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				dollyStart.set( 0, distance );
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;

				state = STATE.TOUCH_PAN;

				panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			default:

				state = STATE.NONE;

		}

		if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

	}

	function touchmove( event ) {

		if ( scope.enabled === false ) return;

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( scope.noRotate === true ) return;
				if ( state !== STATE.TOUCH_ROTATE ) return;

				rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

				scope.update();
				break;

			case 2: // two-fingered touch: dolly

				if ( scope.noZoom === true ) return;
				if ( state !== STATE.TOUCH_DOLLY ) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );

				dollyEnd.set( 0, distance );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					scope.dollyOut();

				} else if ( dollyDelta.y < 0 ) {

					scope.dollyIn();

				}

				dollyStart.copy( dollyEnd );

				scope.update();
				break;

			case 3: // three-fingered touch: pan

				if ( scope.noPan === true ) return;
				if ( state !== STATE.TOUCH_PAN ) return;

				panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				panDelta.subVectors( panEnd, panStart );

				scope.pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

				scope.update();
				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchend( /* event */ ) {

		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;                
                scope.keyCtrl = false;
                scope.keyShift = false;

	}
        
        function computeVectorUp() 
        {
            var vectorUp = scope.globeTarget.position.clone().normalize();            
            scope.object.up.copy(vectorUp);
        
        }
        
        function rotateTarget()
        {                
            var position = scope.globeTarget.worldToLocal(scope.object.position.clone());                                
            var angle    = Math.atan2(position.x,position.z);                                
            
            scope.globeTarget.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), angle ));            
            scope.globeTarget.updateMatrixWorld();
            
            /*
            position = scope.globeTarget.worldToLocal(scope.object.position.clone());                                
            angle    = Math.atan2(position.z,position.y); 
            
            scope.globeTarget.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), angle  - Math.PI * 0.5));   
            */
            //TODO revient à prendre le repère caméra.... à tester
            
            
        }
        
        function computeTarget(position) {
            
            scope.globeTarget.position.copy(position);            
            scope.globeTarget.lookAt(position.clone().multiplyScalar( 2 ));                        
            scope.globeTarget.quaternion.multiply( new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), Math.PI / 2 ));
            scope.globeTarget.updateMatrixWorld();
            rotateTarget();
            /*
            quat = new THREE.Quaternion().setFromUnitVectors( scope.object.up,vectorUp );
            quatInverse = quat.clone().inverse();            
            */            
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', onKeyDown, false );
        window.addEventListener( 'keyup', onKeyUp, false );

	// force an update at start
        
        this.globeTarget = new THREE.Object3D();
        

	this.update();    
        var ray = new THREE.Ray(this.object.position,this.object.position.clone().normalize().negate());
    
        computeTarget(this.intersectSphere(ray));        
        this.engine.scene3D.add(this.globeTarget);
        
     //   var axisHelper = new THREE.AxisHelper( 500000 );
     //  this.globeTarget.add( axisHelper );
        
};

THREE.GlobeControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.GlobeControls.prototype.constructor = THREE.GlobeControls;
