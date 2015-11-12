/**
* Generated On: 2015-10-5
* Class: EventsManager
* Description: Cette classe gère les évènements (souris, clavier,réseaux, temporelles, script). Il mets également en place les connections entre les évènements et les commandes.
*/



define('Core/Commander/Interfaces/EventsManager',[], function(){
 
    function EventsManager(){
        //Constructor

        this.commands       = null;
        this.events         = null;
        this.timer          = null;
       
        
    }

    /**
    * @param pevent {[object Object]} 
    * @param com {[object Object]} 
    */
    EventsManager.prototype.connect = function(pevent, com){
        //TODO: Implement Me 

    };
     
    EventsManager.prototype.command = function()
    {
               
    };
    
    EventsManager.prototype.wait = function()
    {                    
        var waitTime = 250;
        if(this.timer === null)
        { 
            this.timer = window.setTimeout(this.command,waitTime); 
        }
        else
        {
            window.clearInterval(this.timer);
            this.timer = window.setTimeout(this.command,waitTime); 
        }

    };
     
    return EventsManager;

});
/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;

	// "target" sets the location of focus, where the control orbits around
	// and where it pans with respect to.
	this.target = new THREE.Vector3();

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

	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

	// Mouse buttons
	this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

	////////////
	// internals

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

	var theta;
	var phi;
	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var lastPosition = new THREE.Vector3();
	var lastQuaternion = new THREE.Quaternion();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

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
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

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

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

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

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

		}

	};

	this.update = function () {

		var position = this.object.position;

		offset.copy( position ).sub( this.target );

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion( quat );

		// angle from z-axis around y-axis

		theta = Math.atan2( offset.x, offset.z );

		// angle from y-axis

		phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

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

		var radius = offset.length() * scale;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

		// move target to panned location
		this.target.add( pan );

		offset.x = radius * Math.sin( phi ) * Math.sin( theta );
		offset.y = radius * Math.cos( phi );
		offset.z = radius * Math.sin( phi ) * Math.cos( theta );

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion( quatInverse );

		position.copy( this.target ).add( offset );

		this.object.lookAt( this.target );

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

		return theta

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

			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );

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
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.DOLLY ) {

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

		if ( state !== STATE.NONE ) scope.update();

	}

	function onMouseUp( /* event */ ) {

		if ( scope.enabled === false ) return;

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

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

	function onKeyDown( event ) {

		if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;

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

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', onKeyDown, false );

	// force an update at start
	this.update();

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

define("OrbitControls", ["THREE"], function(){});

/**
* Generated On: 2015-10-5
* Class: Node
* Description: Tous élément de la scène hérite de Node.
* Cette class permet de construire une structure de Node avec les membres parent et enfants.
*/

define('Scene/Node',[], function(){
    

    function Node(){
        //Constructor

        this.parent         = null;
        this.children       = [];
        this.bbox           = null;
        this.url            = null;
        this.content        = null;
        this.description    = null;
        this.id             = null;
        this.saveState      = null;
        this.level          = 0;
        this.screenSpaceError = 0.0;

    }


    /**
    * @documentation: Retourne le nombre d'enfants du Node
    *
    * @return  {int} 
    */
    Node.prototype.childrenCount = function(){

        return this.children.length;

    };
    
    Node.prototype.noChild = function(){

        return this.children.length === 0 ;

    };


    /**
    * @documentation: Rafraichi le Node si le contenu ou  le style a été modifié.
    *
    */
    Node.prototype.update = function(){
        //TODO: Implement Me 

    };


    /**
    * @documentation: Méthode qui créer un memento de l'état de Node avant modification.
    *
    * @return  {[object Object]} 
    */
    Node.prototype.hydrate = function(){
        //TODO: Implement Me 

    };


    /**
    * @documentation: Cette méthode modifie l'état du node en fonction d'un memento.
    *
    * @param mem {[object Object]} 
    */
    Node.prototype.dehydrate = function(mem){
        //TODO: Implement Me 

    };

    /**
    * @documentation: Ajoute un enfant au Node.
    *
    * @param child {[object Object]} 
    */
    Node.prototype.add = function(child){
        //TODO: Implement Me 
        this.children.push(child);
    };

    /**
    * @documentation: Retire un enfant au node.
    *
    * @param child {[object Object]} 
    */
    Node.prototype.remove = function(child){
        //TODO: Implement Me 

    };


    /**
    * @documentation: Cette Méthode permet étendre un objet enfant des fonctions prototypes de Node.
    *
    * @param childClass {Object} 
    */
   
    Node.extend = function(childClass){

        function propName(prop, value)
        {
            for(var i in prop) {
                if (prop[i] === value){
                     return i;
                }
            }
            return false;
        }

        for (var p in Node.prototype)
        {   
            var protoName = propName(Node.prototype,Node.prototype[p]);


            if(protoName !== "add" && protoName !== "remove" )
            {           
                childClass.prototype[protoName] = Node.prototype[p];                                    
            }
        };

    };

    
    return Node;

});

//module.exports = {Node:Node};
/**
* Generated On: 2015-10-5
* Class: Camera
* Description: La camera scene, interface avec la camera du 3DEngine.
*/


define('Renderer/Camera',['Scene/Node','THREE'], function(Node, THREE){

    function Camera(width,height,debug){
        //Constructor

        Node.call( this );
                
        this.ratio      = width/height;                
        this.FOV        = 30;
        this.camera3D   = new THREE.PerspectiveCamera( 30, this.ratio, 5000, 50000000 );
        this.direction  = new THREE.Vector3();        
        this.frustum    = new THREE.Frustum();
        this.width      = width;
        this.height     = height;
        
        var radAngle    = this.FOV * Math.PI / 180;
        this.HFOV       = 2.0 * Math.atan(Math.tan(radAngle*0.5) * this.ratio);        
        this.preSSE     = this.height * (2.0 * Math.tan(this.HFOV * 0.5));
        
        this.cameraHelper  = debug  ? new THREE.CameraHelper( this.camera3D ) : undefined;
        this.frustum       = new THREE.Frustum();
    }
 
    Camera.prototype = Object.create( Node.prototype );

    Camera.prototype.constructor = Camera;

    /**
    */
    Camera.prototype.position = function(){
        
        return this.camera3D.position;

    };
    
    Camera.prototype.camHelper = function(){
        
        return this.cameraHelper;        

    };
    
    Camera.prototype.resize = function(width,height){
        
        this.ratio      = width/height;     
        this.camera3D.aspect = this.ratio;
        this.camera3D.updateProjectionMatrix();      

    };    
   
    Camera.prototype.SSE = function(node)
    {
        
        var boundingSphere = node.geometry.boundingSphere;
        
        var distance = Math.max(0.0,(this.camera3D.position.distanceTo(boundingSphere.center) - boundingSphere.radius));
        
        var levelMax = 16;
        
        var t   = Math.pow(2,levelMax- node.level);

        var geometricError  = t;
        
        var SSE = this.preSSE * (geometricError/distance);
       
        return SSE;

    };
    
    Camera.prototype.update = function()
    {                    
        var vector = new THREE.Vector3( 0, 0, 1 );

        this.direction = vector.applyQuaternion( this.camera3D.quaternion );
        
        this.frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse));        
        
    };
    
    Camera.prototype.setPosition = function(position)
    {                    
        this.camera3D.position.copy(position);
    };
    
    Camera.prototype.setRotation = function(rotation)
    {                            
        this.camera3D.quaternion.copy(rotation);
    };
    
    Camera.prototype.getFrustum = function()
    {
                    
        this.camera3D.updateMatrix(); 
        this.camera3D.updateMatrixWorld(); 
        this.camera3D.matrixWorldInverse.getInverse( this.camera3D.matrixWorld );
        this.frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( this.camera3D.projectionMatrix, this.camera3D.matrixWorldInverse));             
 
        return this.frustum;
    };
       
    return Camera;
    
});

/**
  @license
  when.js - https://github.com/cujojs/when

  MIT License (c) copyright B Cavalier & J Hann

 * A lightweight CommonJS Promises/A and when() implementation
 * when is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @version 1.7.1
 */

(function(define) { 
define('when',[],function () {
	var reduceArray, slice, undef;

	//
	// Public API
	//

	when.defer     = defer;     // Create a deferred
	when.resolve   = resolve;   // Create a resolved promise
	when.reject    = reject;    // Create a rejected promise

	when.join      = join;      // Join 2 or more promises

	when.all       = all;       // Resolve a list of promises
	when.map       = map;       // Array.map() for promises
	when.reduce    = reduce;    // Array.reduce() for promises

	when.any       = any;       // One-winner race
	when.some      = some;      // Multi-winner race

	when.chain     = chain;     // Make a promise trigger another resolver

	when.isPromise = isPromise; // Determine if a thing is a promise

	/**
	 * Register an observer for a promise or immediate value.
	 *
	 * @param {*} promiseOrValue
	 * @param {function?} [onFulfilled] callback to be called when promiseOrValue is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} [onRejected] callback to be called when promiseOrValue is
	 *   rejected.
	 * @param {function?} [onProgress] callback to be called when progress updates
	 *   are issued for promiseOrValue.
	 * @returns {Promise} a new {@link Promise} that will complete with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(promiseOrValue, onFulfilled, onRejected, onProgress) {
		// Get a trusted promise for the input promiseOrValue, and then
		// register promise handlers
		return resolve(promiseOrValue).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Returns promiseOrValue if promiseOrValue is a {@link Promise}, a new Promise if
	 * promiseOrValue is a foreign promise, or a new, already-fulfilled {@link Promise}
	 * whose value is promiseOrValue if promiseOrValue is an immediate value.
	 *
	 * @param {*} promiseOrValue
	 * @returns Guaranteed to return a trusted Promise.  If promiseOrValue is a when.js {@link Promise}
	 *   returns promiseOrValue, otherwise, returns a new, already-resolved, when.js {@link Promise}
	 *   whose resolution value is:
	 *   * the resolution value of promiseOrValue if it's a foreign promise, or
	 *   * promiseOrValue if it's a value
	 */
	function resolve(promiseOrValue) {
		var promise, deferred;

		if(promiseOrValue instanceof Promise) {
			// It's a when.js promise, so we trust it
			promise = promiseOrValue;

		} else {
			// It's not a when.js promise. See if it's a foreign promise or a value.
			if(isPromise(promiseOrValue)) {
				// It's a thenable, but we don't know where it came from, so don't trust
				// its implementation entirely.  Introduce a trusted middleman when.js promise
				deferred = defer();

				// IMPORTANT: This is the only place when.js should ever call .then() on an
				// untrusted promise. Don't expose the return value to the untrusted promise
				promiseOrValue.then(
					function(value)  { deferred.resolve(value); },
					function(reason) { deferred.reject(reason); },
					function(update) { deferred.progress(update); }
				);

				promise = deferred.promise;

			} else {
				// It's a value, not a promise.  Create a resolved promise for it.
				promise = fulfilled(promiseOrValue);
			}
		}

		return promise;
	}

	/**
	 * Returns a rejected promise for the supplied promiseOrValue.  The returned
	 * promise will be rejected with:
	 * - promiseOrValue, if it is a value, or
	 * - if promiseOrValue is a promise
	 *   - promiseOrValue's value after it is fulfilled
	 *   - promiseOrValue's reason after it is rejected
	 * @param {*} promiseOrValue the rejected value of the returned {@link Promise}
	 * @returns {Promise} rejected {@link Promise}
	 */
	function reject(promiseOrValue) {
		return when(promiseOrValue, rejected);
	}

	/**
	 * Trusted Promise constructor.  A Promise created from this constructor is
	 * a trusted when.js promise.  Any other duck-typed promise is considered
	 * untrusted.
	 * @constructor
	 * @name Promise
	 */
	function Promise(then) {
		this.then = then;
	}

	Promise.prototype = {
		/**
		 * Register a callback that will be called when a promise is
		 * fulfilled or rejected.  Optionally also register a progress handler.
		 * Shortcut for .then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress)
		 * @param {function?} [onFulfilledOrRejected]
		 * @param {function?} [onProgress]
		 * @returns {Promise}
		 */
		always: function(onFulfilledOrRejected, onProgress) {
			return this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);
		},

		/**
		 * Register a rejection handler.  Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @returns {Promise}
		 */
		otherwise: function(onRejected) {
			return this.then(undef, onRejected);
		},

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @returns {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		yield: function(value) {
			return this.then(function() {
				return value;
			});
		},

		/**
		 * Assumes that this promise will fulfill with an array, and arranges
		 * for the onFulfilled to be called with the array as its argument list
		 * i.e. onFulfilled.spread(undefined, array).
		 * @param {function} onFulfilled function to receive spread arguments
		 * @returns {Promise}
		 */
		spread: function(onFulfilled) {
			return this.then(function(array) {
				// array may contain promises, so resolve its contents.
				return all(array, function(array) {
					return onFulfilled.apply(undef, array);
				});
			});
		}
	};

	/**
	 * Create an already-resolved promise for the supplied value
	 * @private
	 *
	 * @param {*} value
	 * @returns {Promise} fulfilled promise
	 */
	function fulfilled(value) {
		var p = new Promise(function(onFulfilled) {
			// TODO: Promises/A+ check typeof onFulfilled
			try {
				return resolve(onFulfilled ? onFulfilled(value) : value);
			} catch(e) {
				return rejected(e);
			}
		});

		return p;
	}

	/**
	 * Create an already-rejected {@link Promise} with the supplied
	 * rejection reason.
	 * @private
	 *
	 * @param {*} reason
	 * @returns {Promise} rejected promise
	 */
	function rejected(reason) {
		var p = new Promise(function(_, onRejected) {
			// TODO: Promises/A+ check typeof onRejected
			try {
				return onRejected ? resolve(onRejected(reason)) : rejected(reason);
			} catch(e) {
				return rejected(e);
			}
		});

		return p;
	}

	/**
	 * Creates a new, Deferred with fully isolated resolver and promise parts,
	 * either or both of which may be given out safely to consumers.
	 * The Deferred itself has the full API: resolve, reject, progress, and
	 * then. The resolver has resolve, reject, and progress.  The promise
	 * only has then.
	 *
	 * @returns {Deferred}
	 */
	function defer() {
		var deferred, promise, handlers, progressHandlers,
			_then, _progress, _resolve;

		/**
		 * The promise for the new deferred
		 * @type {Promise}
		 */
		promise = new Promise(then);

		/**
		 * The full Deferred object, with {@link Promise} and {@link Resolver} parts
		 * @class Deferred
		 * @name Deferred
		 */
		deferred = {
			then:     then, // DEPRECATED: use deferred.promise.then
			resolve:  promiseResolve,
			reject:   promiseReject,
			// TODO: Consider renaming progress() to notify()
			progress: promiseProgress,

			promise:  promise,

			resolver: {
				resolve:  promiseResolve,
				reject:   promiseReject,
				progress: promiseProgress
			}
		};

		handlers = [];
		progressHandlers = [];

		/**
		 * Pre-resolution then() that adds the supplied callback, errback, and progback
		 * functions to the registered listeners
		 * @private
		 *
		 * @param {function?} [onFulfilled] resolution handler
		 * @param {function?} [onRejected] rejection handler
		 * @param {function?} [onProgress] progress handler
		 */
		_then = function(onFulfilled, onRejected, onProgress) {
			// TODO: Promises/A+ check typeof onFulfilled, onRejected, onProgress
			var deferred, progressHandler;

			deferred = defer();

			progressHandler = typeof onProgress === 'function'
				? function(update) {
					try {
						// Allow progress handler to transform progress event
						deferred.progress(onProgress(update));
					} catch(e) {
						// Use caught value as progress
						deferred.progress(e);
					}
				}
				: function(update) { deferred.progress(update); };

			handlers.push(function(promise) {
				promise.then(onFulfilled, onRejected)
					.then(deferred.resolve, deferred.reject, progressHandler);
			});

			progressHandlers.push(progressHandler);

			return deferred.promise;
		};

		/**
		 * Issue a progress event, notifying all progress listeners
		 * @private
		 * @param {*} update progress event payload to pass to all listeners
		 */
		_progress = function(update) {
			processQueue(progressHandlers, update);
			return update;
		};

		/**
		 * Transition from pre-resolution state to post-resolution state, notifying
		 * all listeners of the resolution or rejection
		 * @private
		 * @param {*} value the value of this deferred
		 */
		_resolve = function(value) {
			value = resolve(value);

			// Replace _then with one that directly notifies with the result.
			_then = value.then;
			// Replace _resolve so that this Deferred can only be resolved once
			_resolve = resolve;
			// Make _progress a noop, to disallow progress for the resolved promise.
			_progress = noop;

			// Notify handlers
			processQueue(handlers, value);

			// Free progressHandlers array since we'll never issue progress events
			progressHandlers = handlers = undef;

			return value;
		};

		return deferred;

		/**
		 * Wrapper to allow _then to be replaced safely
		 * @param {function?} [onFulfilled] resolution handler
		 * @param {function?} [onRejected] rejection handler
		 * @param {function?} [onProgress] progress handler
		 * @returns {Promise} new promise
		 */
		function then(onFulfilled, onRejected, onProgress) {
			// TODO: Promises/A+ check typeof onFulfilled, onRejected, onProgress
			return _then(onFulfilled, onRejected, onProgress);
		}

		/**
		 * Wrapper to allow _resolve to be replaced
		 */
		function promiseResolve(val) {
			return _resolve(val);
		}

		/**
		 * Wrapper to allow _reject to be replaced
		 */
		function promiseReject(err) {
			return _resolve(rejected(err));
		}

		/**
		 * Wrapper to allow _progress to be replaced
		 */
		function promiseProgress(update) {
			return _progress(update);
		}
	}

	/**
	 * Determines if promiseOrValue is a promise or not.  Uses the feature
	 * test from http://wiki.commonjs.org/wiki/Promises/A to determine if
	 * promiseOrValue is a promise.
	 *
	 * @param {*} promiseOrValue anything
	 * @returns {boolean} true if promiseOrValue is a {@link Promise}
	 */
	function isPromise(promiseOrValue) {
		return promiseOrValue && typeof promiseOrValue.then === 'function';
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * howMany of the supplied promisesOrValues have resolved, or will reject when
	 * it becomes impossible for howMany to resolve, for example, when
	 * (promisesOrValues.length - howMany) + 1 input promises reject.
	 *
	 * @param {Array} promisesOrValues array of anything, may contain a mix
	 *      of promises and values
	 * @param howMany {number} number of promisesOrValues to resolve
	 * @param {function?} [onFulfilled] resolution handler
	 * @param {function?} [onRejected] rejection handler
	 * @param {function?} [onProgress] progress handler
	 * @returns {Promise} promise that will resolve to an array of howMany values that
	 * resolved first, or will reject with an array of (promisesOrValues.length - howMany) + 1
	 * rejection reasons.
	 */
	function some(promisesOrValues, howMany, onFulfilled, onRejected, onProgress) {

		checkCallbacks(2, arguments);

		return when(promisesOrValues, function(promisesOrValues) {

			var toResolve, toReject, values, reasons, deferred, fulfillOne, rejectOne, progress, len, i;

			len = promisesOrValues.length >>> 0;

			toResolve = Math.max(0, Math.min(howMany, len));
			values = [];

			toReject = (len - toResolve) + 1;
			reasons = [];

			deferred = defer();

			// No items in the input, resolve immediately
			if (!toResolve) {
				deferred.resolve(values);

			} else {
				progress = deferred.progress;

				rejectOne = function(reason) {
					reasons.push(reason);
					if(!--toReject) {
						fulfillOne = rejectOne = noop;
						deferred.reject(reasons);
					}
				};

				fulfillOne = function(val) {
					// This orders the values based on promise resolution order
					// Another strategy would be to use the original position of
					// the corresponding promise.
					values.push(val);

					if (!--toResolve) {
						fulfillOne = rejectOne = noop;
						deferred.resolve(values);
					}
				};

				for(i = 0; i < len; ++i) {
					if(i in promisesOrValues) {
						when(promisesOrValues[i], fulfiller, rejecter, progress);
					}
				}
			}

			return deferred.then(onFulfilled, onRejected, onProgress);

			function rejecter(reason) {
				rejectOne(reason);
			}

			function fulfiller(val) {
				fulfillOne(val);
			}

		});
	}

	/**
	 * Initiates a competitive race, returning a promise that will resolve when
	 * any one of the supplied promisesOrValues has resolved or will reject when
	 * *all* promisesOrValues have rejected.
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] resolution handler
	 * @param {function?} [onRejected] rejection handler
	 * @param {function?} [onProgress] progress handler
	 * @returns {Promise} promise that will resolve to the value that resolved first, or
	 * will reject with an array of all rejected inputs.
	 */
	function any(promisesOrValues, onFulfilled, onRejected, onProgress) {

		function unwrapSingleResult(val) {
			return onFulfilled ? onFulfilled(val[0]) : val[0];
		}

		return some(promisesOrValues, 1, unwrapSingleResult, onRejected, onProgress);
	}

	/**
	 * Return a promise that will resolve only once all the supplied promisesOrValues
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the promisesOrValues.
	 * @memberOf when
	 *
	 * @param {Array|Promise} promisesOrValues array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function?} [onFulfilled] resolution handler
	 * @param {function?} [onRejected] rejection handler
	 * @param {function?} [onProgress] progress handler
	 * @returns {Promise}
	 */
	function all(promisesOrValues, onFulfilled, onRejected, onProgress) {
		checkCallbacks(1, arguments);
		return map(promisesOrValues, identity).then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Joins multiple promises into a single returned promise.
	 * @returns {Promise} a promise that will fulfill when *all* the input promises
	 * have fulfilled, or will reject when *any one* of the input promises rejects.
	 */
	function join(/* ...promises */) {
		return map(arguments, identity);
	}

	/**
	 * Traditional map function, similar to `Array.prototype.map()`, but allows
	 * input to contain {@link Promise}s and/or values, and mapFunc may return
	 * either a value or a {@link Promise}
	 *
	 * @param {Array|Promise} promise array of anything, may contain a mix
	 *      of {@link Promise}s and values
	 * @param {function} mapFunc mapping function mapFunc(value) which may return
	 *      either a {@link Promise} or value
	 * @returns {Promise} a {@link Promise} that will resolve to an array containing
	 *      the mapped output values.
	 */
	function map(promise, mapFunc) {
		return when(promise, function(array) {
			var results, len, toResolve, resolve, i, d;

			// Since we know the resulting length, we can preallocate the results
			// array to avoid array expansions.
			toResolve = len = array.length >>> 0;
			results = [];
			d = defer();

			if(!toResolve) {
				d.resolve(results);
			} else {

				resolve = function resolveOne(item, i) {
					when(item, mapFunc).then(function(mapped) {
						results[i] = mapped;

						if(!--toResolve) {
							d.resolve(results);
						}
					}, d.reject);
				};

				// Since mapFunc may be async, get all invocations of it into flight
				for(i = 0; i < len; i++) {
					if(i in array) {
						resolve(array[i], i);
					} else {
						--toResolve;
					}
				}

			}

			return d.promise;

		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promise array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} reduceFunc reduce function reduce(currentValue, nextValue, index, total),
	 *      where total is the total number of items being reduced, and will be the same
	 *      in each call to reduceFunc.
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduce(promise, reduceFunc /*, initialValue */) {
		var args = slice.call(arguments, 1);

		return when(promise, function(array) {
			var total;

			total = array.length;

			// Wrap the supplied reduceFunc with one that handles promises and then
			// delegates to the supplied.
			args[0] = function (current, val, i) {
				return when(current, function (c) {
					return when(val, function (value) {
						return reduceFunc(c, value, i, total);
					});
				});
			};

			return reduceArray.apply(array, args);
		});
	}

	/**
	 * Ensure that resolution of promiseOrValue will trigger resolver with the
	 * value or reason of promiseOrValue, or instead with resolveValue if it is provided.
	 *
	 * @param promiseOrValue
	 * @param {Object} resolver
	 * @param {function} resolver.resolve
	 * @param {function} resolver.reject
	 * @param {*} [resolveValue]
	 * @returns {Promise}
	 */
	function chain(promiseOrValue, resolver, resolveValue) {
		var useResolveValue = arguments.length > 2;

		return when(promiseOrValue,
			function(val) {
				val = useResolveValue ? resolveValue : val;
				resolver.resolve(val);
				return val;
			},
			function(reason) {
				resolver.reject(reason);
				return rejected(reason);
			},
			resolver.progress
		);
	}

	//
	// Utility functions
	//

	/**
	 * Apply all functions in queue to value
	 * @param {Array} queue array of functions to execute
	 * @param {*} value argument passed to each function
	 */
	function processQueue(queue, value) {
		var handler, i = 0;

		while (handler = queue[i++]) {
			handler(value);
		}
	}

	/**
	 * Helper that checks arrayOfCallbacks to ensure that each element is either
	 * a function, or null or undefined.
	 * @private
	 * @param {number} start index at which to start checking items in arrayOfCallbacks
	 * @param {Array} arrayOfCallbacks array to check
	 * @throws {Error} if any element of arrayOfCallbacks is something other than
	 * a functions, null, or undefined.
	 */
	function checkCallbacks(start, arrayOfCallbacks) {
		// TODO: Promises/A+ update type checking and docs
		var arg, i = arrayOfCallbacks.length;

		while(i > start) {
			arg = arrayOfCallbacks[--i];

			if (arg != null && typeof arg != 'function') {
				throw new Error('arg '+i+' must be a function');
			}
		}
	}

	/**
	 * No-Op function used in method replacement
	 * @private
	 */
	function noop() {}

	slice = [].slice;

	// ES5 reduce implementation if native not available
	// See: http://es5.github.com/#x15.4.4.21 as there are many
	// specifics and edge cases.
	reduceArray = [].reduce ||
		function(reduceFunc /*, initialValue */) {
			/*jshint maxcomplexity: 7*/

			// ES5 dictates that reduce.length === 1

			// This implementation deviates from ES5 spec in the following ways:
			// 1. It does not check if reduceFunc is a Callable

			var arr, args, reduced, len, i;

			i = 0;
			// This generates a jshint warning, despite being valid
			// "Missing 'new' prefix when invoking a constructor."
			// See https://github.com/jshint/jshint/issues/392
			arr = Object(this);
			len = arr.length >>> 0;
			args = arguments;

			// If no initialValue, use first item of array (we know length !== 0 here)
			// and adjust i to start at second item
			if(args.length <= 1) {
				// Skip to the first real element in the array
				for(;;) {
					if(i in arr) {
						reduced = arr[i++];
						break;
					}

					// If we reached the end of the array without finding any real
					// elements, it's a TypeError
					if(++i >= len) {
						throw new TypeError();
					}
				}
			} else {
				// If initialValue provided, use it
				reduced = args[1];
			}

			// Do the actual reduce
			for(;i < len; ++i) {
				// Skip holes
				if(i in arr) {
					reduced = reduceFunc(reduced, arr[i], i, arr);
				}
			}

			return reduced;
		};

	function identity(x) {
		return x;
	}

	return when;
});
})(typeof define == 'function' && define.amd
	? define
	: function (factory) { typeof exports === 'object'
		? (module.exports = factory())
		: (this.when      = factory());
	}
	// Boilerplate for AMD, Node, and browser global
);
/**
* Generated On: 2015-10-5
* Class: c3DEngine
* Description: 3DEngine est l'interface avec le framework webGL.
*/

define('Renderer/c3DEngine',['THREE','OrbitControls','Renderer/Camera','when'], function(THREE,OrbitControls,Camera,when){

    var instance3DEngine = null;

    function c3DEngine(){
        //Constructor
        
        if(instance3DEngine !== null){
            throw new Error("Cannot instantiate more than one c3DEngine");
        } 
        
        THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ];

        this.debug      = false;
        this.scene      = undefined;
        this.scene3D    = new THREE.Scene();               
        this.width      = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
        this.height     = window.innerHeight;
        
        this.renderer   = undefined ;
        this.controls   = undefined ;                
        this.camera     = undefined;
        this.camDebug   = undefined;
        
        this.initCamera();
                       
        if(this.debug)
        {
            var axisHelper = new THREE.AxisHelper( 8 );
            this.scene3D.add( axisHelper );
        }
                        
        this.renderScene = function(){
                                    
            this.renderer.clear();            
            this.renderer.setViewport( 0, 0, this.width, this.height );
            this.renderer.render( this.scene3D, this.camera.camera3D);                       
            
            if(this.debug)
            {
                this.camera.camHelper().visible = true;
                this.renderer.setViewport( this.width, 0, this.width, this.height );
                this.renderer.render( this.scene3D, this.camDebug);
                this.camera.camHelper().visible = false;                
            }
            
        }.bind(this);
        
        this.update = function()
        {
            this.camera.update();
            this.updateControl();            
            this.scene.wait();
            this.renderScene();
            
        }.bind(this);
        
        
        this.onWindowResize = function(){

            this.width      = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
            this.height     = window.innerHeight;
            this.camera.resize(this.width,this.height);
            this.renderer.setSize( window.innerWidth, window.innerHeight );
            this.renderScene();
        }.bind(this);
        
                             
    };
    
    c3DEngine.prototype.initCamera = function()
    {
        this.camera     = new Camera(this.width, this.height, this.debug);        
        this.camera.camera3D.position.z = 30000000;      
        this.scene3D.add(this.camera.camera3D);
                
        if(this.debug)
        {
            this.camDebug   = new THREE.PerspectiveCamera( 30, this.camera.ratio, 1, 1000000000) ;
            this.camDebug.position.x = -10000000;
            this.camDebug.position.y =  10000000;            
            this.camDebug.lookAt(new THREE.Vector3(0,0,0));
            this.scene3D.add(this.camera.camHelper());                        
        }
        
    };
    
    c3DEngine.prototype.initRenderer = function()
    {
        this.renderer   = new THREE.WebGLRenderer( { antialias: true,alpha: true,logarithmicDepthBuffer : true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize(window.innerWidth, window.innerHeight );        
        this.renderer.setClearColor( 0x030508 );
        this.renderer.autoClear = false;
        
        document.body.appendChild( this.renderer.domElement );
    };
        
    

    
        
    c3DEngine.prototype.init = function(scene){
        
        this.scene  = scene;
        this.initRenderer();        
        this.initControls();
        window.addEventListener( 'resize', this.onWindowResize, false );
        this.controls.addEventListener( 'change', this.update );
        
    };
        
    c3DEngine.prototype.updateControl = function()
    {
        var len  = this.camera.position().length ();
                
        if( len < 8000000 )
        {
            var t = Math.pow(Math.cos((8000000 - len)/ (8000000 - 6378137) * Math.PI * 0.5),1.5);                
            this.controls.zoomSpeed     = t;
            this.controls.rotateSpeed   = 0.8 *t;                         
        }
        else if(len >= 8000000 && this.controls.zoomSpeed !== 1.0) 
        {
            this.controls.zoomSpeed     = 1.0;
            this.controls.rotateSpeed   = 0.8;                
        }   
    };
       
       
    /**
    */
    c3DEngine.prototype.style2Engine = function(){
        //TODO: Implement Me 

    };
    
    c3DEngine.prototype.initControls = function(){
        
        this.controls   = new THREE.OrbitControls( this.camera.camera3D,this.renderer.domElement );
        
        this.controls.target        = new THREE.Vector3(0,0,0);
        this.controls.damping       = 0.1;
        this.controls.noPan         = false;
        this.controls.rotateSpeed   = 0.8;
        this.controls.zoomSpeed     = 1.0;
        this.controls.minDistance   = 500000;
        this.controls.maxDistance   = 200000000.0;        
        this.controls.update();
    };
    
    /**
     * 
     * @param {type} mesh
     * @param {type} texture
     * @returns {undefined}
     */
    c3DEngine.prototype.setTexture = function(mesh,texture){
        //TODO: Implement Me         
        mesh.material = new THREE.MeshBasicMaterial( {color: 0xffffff, map: texture} );
    };

    /**
    */
    c3DEngine.prototype.add3DScene = function(object){
        
        this.scene3D.add(object);                

    };    
    
    c3DEngine.prototype.add3Cube = function(texture){
         
        var geometry = new THREE.BoxGeometry( 1, 1, 1 );                        
        var material = new THREE.MeshBasicMaterial( {color: 0xffffff, map: texture} );
        var cube     = new THREE.Mesh( geometry, material );   
                
        this.scene3D.add(cube);
        
    };

    /**
    */
    c3DEngine.prototype.precision = function(){
        //TODO: Implement Me 

    };
    
    

     c3DEngine.prototype.getWindowSize = function(){
         
         return new THREE.Vector2(this.width, this.height);
     };
     
     c3DEngine.prototype.getRenderer = function(){
         
         return this.renderer;
     }
         

    return function(scene){
        instance3DEngine = instance3DEngine || new c3DEngine(scene);
        return instance3DEngine;
    };    

});

/**
* Generated On: 2015-10-5
* Class: NodeMesh
* Description: Node + THREE.Mesh. Combine les paramètres d'un Node. NodeMesh peut etre ajouté à la THREE.Scene.
*/



define('Renderer/NodeMesh',['Scene/Node','THREE'], function(Node, THREE){
  
   
    var  NodeMesh = function (){
        //Constructor

        Node.call( this );
        THREE.Mesh.call( this );
        
        this.sse = true;
    };

    NodeMesh.prototype = Object.create( THREE.Mesh.prototype );

    NodeMesh.prototype.constructor = NodeMesh;
    
    Node.extend(NodeMesh);
    
    return NodeMesh;
    
});



/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global THREE */

THREE.StarGeometry = function ( )
{
    THREE.Geometry.call( this );
    
    for ( var i = 0; i < 10000; i ++ ) {

        var vertex = new THREE.Vector3();
        vertex.x = THREE.Math.randFloatSpread( 20000000000 );
        vertex.y = THREE.Math.randFloatSpread( 20000000000 );
        vertex.z = THREE.Math.randFloatSpread( 20000000000 );

        this.vertices.push( vertex );

    }
};

THREE.StarGeometry.prototype = Object.create( THREE.Geometry.prototype );
THREE.StarGeometry.prototype.constructor = THREE.StarGeometry;
define("StarGeometry", ["THREE"], function(){});

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global THREE */

define('Globe/Star',['Renderer/NodeMesh','StarGeometry'], function(NodeMesh,StarGeometry){
  
   
    var  Star = function (){
        
        
        NodeMesh.call( this );
        
        var geom = new THREE.StarGeometry();
        
        var particles = new THREE.Points( geom, new THREE.PointsMaterial( { color: 0xAAAACC } ) );
        this.add( particles );
       
    };

    Star.prototype = Object.create( NodeMesh.prototype );

    Star.prototype.constructor = Star;
    
 
    return Star;
    
});

/**
* Generated On: 2015-10-5
* Class: Provider
* Description: Cette classe générique permet de fournir des données distantes ou locales, des Nodes ou des services.
*/

define('Core/Commander/Providers/Provider',[], function(){


    function Provider(iodriver){
        //Constructor

        this.type       = null;
        this._IoDriver  = iodriver;

    }
    
    Provider.prototype.constructor = Provider;

    /**
    * @param url
    */
    Provider.prototype.get = function(url){
        //TODO: Implement Me 

    };


    /**
    * @param url
    */
    Provider.prototype.getInCache = function(url){
        //TODO: Implement Me 

    };
    
    return Provider;
    
});
/**
* Generated On: 2015-10-5
* Class: IoDriver
* Description: Cette classe générique parcourt un fichier et retourne un object.
*/


define('Core/Commander/Providers/IoDriver',[], function(){


    function IoDriver(){
        //Constructor
        

    }
    
    IoDriver.prototype.constructor = IoDriver;
  

    /**
    * @param url
    */
    IoDriver.prototype.load = function(url){
        //TODO: Implement Me 

    };


    /**
    * @param url
    * @param inputObject {Object} 
    */
    IoDriver.prototype.write = function(url, inputObject){
        //TODO: Implement Me 

    };


    /**
    * @param url
    */
    IoDriver.prototype.readAsync = function(url){
        //TODO: Implement Me 

    };


    /**
    * @param url
    */
    IoDriver.prototype.writeAsync = function(url){
        //TODO: Implement Me 

    };

    return IoDriver;
    
});
/**
* Generated On: 2015-10-5
* Class: IoDriver_XBIL
*/


define('Core/Commander/Providers/IoDriver_XBIL',['Core/Commander/Providers/IoDriver','when'], function(IoDriver,when){

    function IoDriver_XBIL(){
        //Constructor
        IoDriver.call( this );
        
    }
           
    IoDriver_XBIL.prototype = Object.create( IoDriver.prototype );

    IoDriver_XBIL.prototype.constructor = IoDriver_XBIL;
    
    IoDriver_XBIL.prototype.read = function(url)
    {
       
        var deferred = when.defer();

        var xhr = new XMLHttpRequest();

        xhr.open("GET", url,true);

        xhr.responseType = "arraybuffer";
        xhr.crossOrigin  = '';

        xhr.onload = function () 
        {

            var arrayBuffer = this.response; 

            if (arrayBuffer) {

                var floatArray = new Float32Array(arrayBuffer);

                
//                var max = - 1000000;
//                var min =   1000000;
                                
                var mcolor  = 0.0;
                //var mcolor  = Math.random();
 
                var isEmpty = true;
 
                for (var i = 0; i < floatArray.byteLength; i++) 
                {
                   if(floatArray[i] === -99999.0 || floatArray[i] === undefined )                        
                        floatArray[i] = mcolor;
                   else if (isEmpty === true)
                      isEmpty = false;
                }

                if(isEmpty)
                    deferred.resolve(undefined);
                else
                    deferred.resolve(floatArray);
            }                                
        };

        xhr.onerror = function(){

            deferred.reject(Error("Error IoDriver_XBIL"));

        };

        xhr.send(null);    

        return deferred;

    
    };
    

    return IoDriver_XBIL;
    
});
/**
* Generated On: 2015-10-5
* Class: CacheRessource
* Description: Cette classe singleton est un cache des ressources et services
*/

define('Core/Commander/Providers/CacheRessource',[], function(){
 
    var instanceCache = null;

    function CacheRessource(){
        //Constructor

        this.cacheObjects = [];
        this._maximumSize = null;

    }

    /**
    * @param url
    */
    CacheRessource.prototype.getRessource = function(url){
        //TODO: Implement Me 
        
        return this.cacheObjects[url];

    };
    
    CacheRessource.prototype.addRessource = function(url,ressource){
        
        this.cacheObjects[url] = ressource;
        
    };


    /**
    * @param id
    */
    CacheRessource.prototype.getRessourceByID = function(id){
        //TODO: Implement Me 

    };

    return function(){
        instanceCache = instanceCache || new CacheRessource();
        return instanceCache;
    };

});

/**
* Generated On: 2015-10-5
* Class: WMTS_Provider
* Description: Fournisseur de données à travers un flux WMTS
*/


define('Core/Commander/Providers/WMTS_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/IoDriver_XBIL',
            'when',
            'THREE',
            'Core/Commander/Providers/CacheRessource'], 
        function(
                Provider,
                IoDriver_XBIL,
                when,
                THREE,
                
                CacheRessource){


    function WMTS_Provider()
    {
        //Constructor
 
        Provider.call( this,new IoDriver_XBIL());
        this.cache         = CacheRessource();
        
        this.loader = new THREE.TextureLoader();        
        this.loader.crossOrigin = '';
    }

    WMTS_Provider.prototype = Object.create( Provider.prototype );

    WMTS_Provider.prototype.constructor = WMTS_Provider;
    
    WMTS_Provider.prototype.url = function(coWMTS)
    {
        
        var key    = "wmybzw30d6zg563hjlq8eeqb";
        
        var layer  = "ELEVATION.ELEVATIONGRIDCOVERAGE";        
        
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/x-bil;bits=32&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+coWMTS.zoom+"&TILEROW="+coWMTS.row+"&TILECOL="+coWMTS.col;
        return url;
    };
            
    WMTS_Provider.prototype.urlOrtho = function(coWMTS)
    {
        var key    = "i9dpl8xge3jk0a0taex1qrhd";
        
        var layer  = "ORTHOIMAGERY.ORTHOPHOTOS";
        //var layer  = "GEOGRAPHICALGRIDSYSTEMS.MAPS";
                
        var url = "http://wxs.ign.fr/" + key + "/geoportail/wmts?LAYER="+ layer +
            "&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0"+
            "&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM"+
            "&TILEMATRIX="+coWMTS.zoom+"&TILEROW="+coWMTS.row+"&TILECOL="+coWMTS.col;
        return url;
    };
        
    WMTS_Provider.prototype.getTextureBil = function(coWMTS)
    {
        var url = this.url(coWMTS);
        
        var textureCache = this.cache.getRessource(url);
        
        if(textureCache !== undefined)
        {
            if (textureCache !== -1)
                textureCache.needsUpdate = true;
            return when(textureCache);
        }
        
        return this._IoDriver.read(url).then(function(buffer)
            {                        
                var texture;
                
                if(buffer === undefined)
                    texture = -1;
                else
                {
                    texture = new THREE.DataTexture(buffer,256,256,THREE.AlphaFormat,THREE.FloatType);                
                    texture.needsUpdate = true;
                }
                
                this.cache.addRessource(url,texture);
                
                return texture;
            }.bind(this)
        );
    };

    WMTS_Provider.prototype.getTextureOrtho = function(coWMTS)
    {
                
        var url = this.urlOrtho(coWMTS);        
        var textureCache = this.cache.getRessource(url);
        
        if(textureCache !== undefined)
        {            
            //textureCache.needsUpdate = true;            
            return when(textureCache);
        }
        
        var texture = this.loader.load(url);
        
        //texture.needsUpdate = true;
        
        this.cache.addRessource(url,texture);
        
        return when(texture);
    };

    return WMTS_Provider;
    
});
/**
* Generated On: 2015-10-5
* Class: Queue
* Description: Cette classe est une file d'attente.
*/


define('Core/Commander/Queue',
        [ ], 
        function(){

    function Queue(criteria, heapType) {
        
        this.criteria   = criteria;                
        this.length     = 0;
        this.queue      = [];       
        this.isMax      = !!heapType;
        
        if ( heapType !== 0 && heapType !== 1 ){
            console.log( heapType + " not supported.");
        }        
    }
    
    Queue.prototype.insert = function (value) {
        
        
        if (!value.hasOwnProperty(this.criteria)) {
            console.log(value);
            console.log("Cannot insert " + value + " because it does not have a property by the name of " + this.criteria + ".");
        }
        this.queue.push(value);
        this.length++;
 
    };
 
    Queue.prototype.evaluate = function (self, target) {
                 
        if (this.isMax) {
            return (this.queue[self][this.criteria] > this.queue[target][this.criteria]);
        } else {
            return (this.queue[self][this.criteria] < this.queue[target][this.criteria]);
        }
    };
    
    Queue.prototype.sort = function()
    {
        this.queue = this.queue.sort(function (a, b)
        {
            
            if (a[this.criteria] > b[this.criteria]) {
              return 1;
            }
            if (a[this.criteria] < b[this.criteria]) {
              return -1;
            }
            // a must be equal to b
            return 0;
        }.bind(this));
        
        return this.queue;
                
    };
 
    return Queue;

});




/**
* Generated On: 2015-10-5
* Class: ManagerCommands
* Description: Cette classe singleton gère les requetes/Commandes  de la scène. Ces commandes peuvent etre synchrone ou asynchrone. Elle permet d'executer, de prioriser  et d'annuler les commandes de la pile. Les commandes executées sont placées dans une autre file d'attente.
*/

/**
 * 
 * @param {type} WMTS_Provider
 * @param {type} EventsManager
 * @param {type} Queue
 * @returns {Function}
 */
define('Core/Commander/ManagerCommands',
        [   'Core/Commander/Providers/WMTS_Provider',
            'Core/Commander/Interfaces/EventsManager',
            'Core/Commander/Queue'], 
        function(
                WMTS_Provider,
                EventsManager,
                Queue){

    var instanceCommandManager = null;
    
    var command  = function(pro)
    {
        this.priority = pro;        
    };
    
    function ManagerCommands(){
        //Constructor
        if(instanceCommandManager !== null){
            throw new Error("Cannot instantiate more than one ManagerCommands");
        } 
        this.queueAsync = new Queue('priority',1);
        this.queueSync  = null;
        this.loadQueue  = [];
        this.providers  = [];
        this.history    = null;        
        this.providers.push(new WMTS_Provider());        
        this.countRequest  = 0;   
        this.eventsManager = new EventsManager();
        
        this.scene         = undefined;
        
    }        

    ManagerCommands.prototype.constructor = ManagerCommands;

    ManagerCommands.prototype.addCommand = function(command)
    {      
            /*     
        if(this.queueAsync.length > 10)
        {
            //console.log(this.queueAsync.sort());
            this.queueAsync.queue.slice(0,9);
            this.queueAsync.length-=10;
            
        }
        
        this.queueAsync.insert(command);        
        */
    };

    ManagerCommands.prototype.requestInc = function()
    {
      
        this.countRequest++;
        
    };
    
    ManagerCommands.prototype.requestDec = function()
    {
      
        this.countRequest--;
        
        if(this.countRequest <= 0)                    
        {
            this.countRequest = 0;
            this.scene.gfxEngine.update();
        }                
    };

    /**
     * 
     * @param {type} coWMTS
     * @returns {ManagerCommands_L7.ManagerCommands.prototype@arr;providers@call;getTile}
     */
    ManagerCommands.prototype.getTextureBil = function(coWMTS){
        
        //var co = new command(Math.floor((Math.random()*100)));        
        //this.queueAsync.insert(co);
        
        this.requestInc();
        
        return this.providers[0].getTextureBil(coWMTS);
    };
    
    ManagerCommands.prototype.getTextureOrtho = function(coWMTS){
                        
        this.requestInc();
        
        return this.providers[0].getTextureOrtho(coWMTS);
    };
    
    ManagerCommands.prototype.getTile = function(bbox,level)
    {
        //return this.getTile(type,bbox,level);
    };

    /**
    */
    ManagerCommands.prototype.sortByPriority = function(){
        //TODO: Implement Me 

    };

    /**
    */
    ManagerCommands.prototype.removeCanceled = function(){
        //TODO: Implement Me 

    };
    
    /**
    */
    ManagerCommands.prototype.wait = function(){
        //TODO: Implement Me 
        this.eventsManager.wait();
    };


    /**
    */
    ManagerCommands.prototype.process = function(){
        //TODO: Implement Me 
        this.scene.updateScene3D();
    };


    /**
    */
    ManagerCommands.prototype.forecast = function(){
        //TODO: Implement Me 

    };


    /**
    * @param object
    */
    ManagerCommands.prototype.addInHistory = function(object){
        //TODO: Implement Me 

    };

    return function(){
        instanceCommandManager = instanceCommandManager || new ManagerCommands();
        return instanceCommandManager;
    };
    
});
/**
* Generated On: 2015-10-5
* Class: Command
* Description: Cette object contient une commande à executer. Elle porte également les buffers résultants.
*/

define('Core/Commander/Command',[], function(){


    function Command(){
        //Constructor

        this.name       = null;
        this.priority   = Math.floor((Math.random()*100));
        this.state      = null;
        this.inParallel = null;
        this.inBuffers  = null;
        this.outBuffers = null;
        this.paramsFunction = [];
        this.processFunction = null;
        this.async = null;
        this.force = null;
        this.type = null;
        this.addInHistory = null;
        this.source = null;
        this.requester =  null;

    }

    Command.prototype.constructor = Command;
    
    /**
    */
    Command.prototype.instance = function(){
        //TODO: Implement Me 

    };

    return Command;
});
/**
* Generated On: 2015-10-5
* Class: InterfaceCommander
* Description: Cette Classe construit une commande. Cette Command ensuite pousser dans une file d'attente.
*/

define('Core/Commander/InterfaceCommander',['Core/Commander/ManagerCommands','Core/Commander/Command'], function(ManagerCommands,Command){

    function InterfaceCommander(type){
        //Constructor

        this.managerCommands = ManagerCommands();
        //this.builderCommand  = buildCommand;        
        this.type     = type;                

    }

    InterfaceCommander.prototype.constructor = InterfaceCommander;

    /**
    * @param com {[object Object]} 
    */
    InterfaceCommander.prototype.request = function(com){
        //TODO: Implement Me 

    };
 
    /**
    * @return  {[object Object]} 
    */
    InterfaceCommander.prototype.buildCommand = function(){
        //TODO: Implement Me 
        this._builderCommand();
    };
    
    InterfaceCommander.prototype.getTextureBil = function(coWMTS){
        //TODO: Implement Me 
        return this.managerCommands.getTextureBil(coWMTS);
    };
    
    InterfaceCommander.prototype.getTextureOrtho = function(coWMTS){
        //TODO: Implement Me 
        return this.managerCommands.getTextureOrtho(coWMTS);
    };
    
    InterfaceCommander.prototype.getTile = function(bbox,cooWMTS,parent)
    {
        //console.log(this.type);
        
        var command = new Command();        
        command.type        = this.type;
        command.requester   = parent;        
        command.paramsFunction.push(bbox);
        command.paramsFunction.push(cooWMTS);        
        this.managerCommands.addCommand(command);
        
        //console.log("Command " +  cooWMTS.zoom + " " +   cooWMTS.row + " " + cooWMTS.col );
        //return this.managerCommands.getTile(type,bbox,level);
    };
    
    
    InterfaceCommander.prototype.requestDec = function()
    {
      
        this.managerCommands.requestDec();
        
        //console.log(this.managerCommands.countRequest);
        
    };
    

    return InterfaceCommander;
    
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Core/defaultValue',[], function(){

   var defaultValue = function(value, def) {
        return value === undefined ? def : value;
    };

    return defaultValue;
    
});
/**
* Generated On: 2015-10-5
* Class: CoordCarto
* Description: Coordonées cartographiques
*/

/**
 * 
 * @param {type} defaultValue
 * @returns {CoordWMTS_L10.CoordWMTS}
 */
define('Core/Geographic/CoordWMTS',['Core/defaultValue'], function(defaultValue){


    /**
     * 
     * @param {type} zoom
     * @param {type} row
     * @param {type} col
     * @returns {CoordWMTS_L12.CoordWMTS}
     */
    function CoordWMTS(zoom,row,col)
    {
        this.zoom   = defaultValue(zoom,0);
        this.row    = defaultValue(row,0);
        this.col    = defaultValue(col,0);
    }
    
    return CoordWMTS;
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Core/Math/MathExtented',['THREE'], function(THREE){

    /**
     * Math functions.
     *
     * @namespace
     * @alias MathExt
     */
    var MathExt = {};
    
     /**
     * pi
     *
     * @type {Number}
     * @constant
     */
    MathExt.PI = Math.PI;
    
    
    /**
    * pi/2
    *
    * @type {Number}
    * @constant
    */
    MathExt.PI_OV_TWO = Math.PI * 0.5;
    
    
     MathExt.PI_OV_FOUR = Math.PI * 0.25;
    
    /**
    * pi*2
    *
    * @type {Number}
    * @constant
    */
    MathExt.TWO_PI  = Math.PI * 2.0;
    
    MathExt.INV_TWO_PI  = 1.0/MathExt.TWO_PI;
    
    MathExt.LOG_TWO = Math.log(2.0);
    
    MathExt.divideVectors = function(u,v)
    {          
        var w = new THREE.Vector3(u.x/v.x,u.y/v.y,u.z/v.z);
        
        return w;
    };
    
    MathExt.lenghtSquared = function(u)
    {          
                
        return u.x * u.x + u.y * u.y + u.z * u.z;
    };
    
    return MathExt;
    
});
/**
* Generated On: 2015-10-5
* Class: Projection
* Description: Outils de projections cartographiques et de convertion
*/

define('Core/Geographic/Projection',['Core/Geographic/CoordWMTS','Core/Math/MathExtented'], function(CoordWMTS,MathExt){


    function Projection(){
        //Constructor

    }

    /**
    * @param x
    * @param y
    */
    Projection.prototype.WGS84ToPM = function(x, y){
        //TODO: Implement Me 

    };
    
    Projection.prototype.WGS84ToY = function(latitude){
        
        return 0.5 - Math.log(Math.tan(MathExt.PI_OV_FOUR+latitude*0.5))*MathExt.INV_TWO_PI;

    };
    
    Projection.prototype.WGS84LatitudeClamp = function(latitude){
        
        //var min = -68.1389  / 180 * Math.PI;
        var min = -86  / 180 * Math.PI;
        var max =  84  / 180 * Math.PI;

        latitude = Math.max(min,latitude);
        latitude = Math.min(max,latitude);

        return latitude;

    };

    /**
     * 
     * @param {type} cWMTS
     * @param {type} bbox
     * @returns {Array}
     */
    Projection.prototype.WMTS_WGS84ToWMTS_PM = function(cWMTS,bbox){

        var wmtsBox = [];
        var level   = cWMTS.zoom + 1;               
        var nbRow   = Math.pow(2,level);
                
        //var sY      = this.WGS84ToY(this.WGS84LatitudeClamp(-Math.PI*0.5)) - this.WGS84ToY(this.WGS84LatitudeClamp(Math.PI*0.5));
        var sizeRow = 1.0 / nbRow;
                
        var yMin  = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.maxCarto.latitude));
        var yMax  = this.WGS84ToY(this.WGS84LatitudeClamp(bbox.minCarto.latitude));
        
        var minRow,maxRow,minFra,maxFra,min,max;

        min     = yMin/ sizeRow;
        max     = yMax/ sizeRow;            
            
        minRow  = Math.floor(min);
        maxRow  = Math.floor(max);
        
        if(max - maxRow === 0.0)
            maxRow--;       

        minFra  = Math.abs(yMin - minRow * sizeRow);
        maxFra  = Math.abs(yMax - maxRow * sizeRow);

        var minCol = cWMTS.col;
        var maxCol = minCol;
        
        wmtsBox.push(new CoordWMTS(level,minRow,minCol));
        wmtsBox.push(new CoordWMTS(level,maxRow,maxCol));         
                       
        return wmtsBox;

    };

    /**
    * @param x
    * @param y
    */
    Projection.prototype.PMToWGS84 = function(x, y){
        //TODO: Implement Me 

    };
    
    Projection.prototype.WGS84toWMTS = function(bbox){
        

        var zoom    = Math.floor(Math.log(MathExt.PI / bbox.dimension.y )/MathExt.LOG_TWO + 0.5);
        
        var nY      = Math.pow(2,zoom);
        var nX      = 2*nY;
        
        var uX      = MathExt.TWO_PI    / nX;
        var uY      = MathExt.PI        / nY;
        
        var col       = Math.floor(bbox.center.x / uX);
        var row       = Math.floor(nY - (MathExt.PI_OV_TWO + bbox.center.y) / uY);
        
        return new CoordWMTS(zoom,row,col);
    };


    /**
    * @param longi
    * @param lati
    */
    Projection.prototype.geoToPM = function(longi, lati){
        //TODO: Implement Me 

    };


    /**
    * @param longi
    * @param lati
    */
    Projection.prototype.geoToWGS84 = function(longi, lati){
        //TODO: Implement Me 

    };

    return Projection;

});
/**
* Generated On: 2015-10-5
* Class: Layer
* Description: Le layer est une couche de données. Cette couche peut etre des images ou de l'information 3D. Les requètes de cette couche sont acheminées par une interfaceCommander.
* 
*/


define('Scene/Layer',['Scene/Node','Core/Commander/InterfaceCommander','Core/Geographic/Projection'], function(Node,InterfaceCommander,Projection){

    function Layer(type){
        //Constructor

        Node.call( this );
        this.interCommand   = new InterfaceCommander(type);
        this.descriManager  = null;
        this.projection     = new Projection();
                       
    }
       
    Layer.prototype = Object.create( Node.prototype );

    Layer.prototype.constructor = Layer;
         
    return Layer;
    
});


/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Core/Math/Point2D',['Core/defaultValue'], function(defaultValue){

    function Point2D(x,y){
        //Constructor

        this.x  = defaultValue(x,0);
        this.y  = defaultValue(y,0);

    }

    return Point2D;
    
});
/**
* Generated On: 2015-10-5
* Class: CoordCarto
* Description: Coordonées cartographiques
*/
/**
 * 
 * @param {type} defaultValue
 * @returns {CoordCarto_L9.CoordCarto}
 */
define('Core/Geographic/CoordCarto',['Core/defaultValue'], function(defaultValue){


    function CoordCarto(longitude,latitude,altitude)
    {
        this.longitude  = defaultValue(longitude,0);
        this.latitude   = defaultValue(latitude,0);
        this.altitude   = defaultValue(altitude,0);
    }
    
    return CoordCarto;
});
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


THREE.OBB.prototype.quadInverse = function(){

    return this.quaInv;
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
define("OBB", ["THREE"], function(){});

/**
* Generated On: 2015-10-5
* Class: BoudingBox
* Description: BoundingBox délimite une zone de l'espace. Cette zone est défnie  par des coordonées cartographiques.
*/

define('Scene/BoudingBox',['Core/defaultValue','Core/Math/MathExtented','Core/Math/Point2D','Core/Geographic/CoordCarto','THREE','OBB'], function(defaultValue,MathExt,Point2D,CoordCarto,THREE,OBB){

    function BoudingBox(minLongitude,maxLongitude, minLatitude ,maxLatitude ,parentCenter,minAltitude ,maxAltitude){
        //Constructor
        
        this.minCarto       = new CoordCarto(defaultValue(minLongitude,0),defaultValue(minLatitude,-MathExt.PI_OV_TWO),defaultValue(minAltitude,-10000));
        this.maxCarto       = new CoordCarto(defaultValue(maxLongitude,MathExt.TWO_PI),defaultValue(maxLatitude,MathExt.PI_OV_TWO),defaultValue(maxAltitude,10000));
        
        this.dimension      = new Point2D(Math.abs(this.maxCarto.longitude-this.minCarto.longitude),Math.abs(this.maxCarto.latitude-this.minCarto.latitude));        
        this.halfDimension  = new Point2D(this.dimension.x * 0.5,this.dimension.y * 0.5);
        this.center         = new Point2D(this.minCarto.longitude + this.halfDimension.x,this.minCarto.latitude + this.halfDimension.y);
        //this.relativeCenter = parentCenter === undefined ? this.center : new Point2D(this.center.x - parentCenter.x,this.center.y - parentCenter.y);
        this.size           = Math.sqrt(this.dimension.x * this.dimension.x + this.dimension.y * this.dimension.y);
        
    }

    /**
    * @documentation: Retourne True si le point est dans la zone
    *
    * @param point {[object Object]} 
    */
    BoudingBox.prototype.isInside = function(point){
        //TODO: Implement Me 

    };
    
    BoudingBox.prototype.set = function(center,halfDimension){
       
       this.halfDimension  = halfDimension;        
       this.center         = center;

    };
    
    BoudingBox.prototype.intersect = function(bbox)
    {
        return !(this.minCarto.longitude >= bbox.maxCarto.longitude
        || this.maxCarto.longitude <= bbox.minCarto.longitude
        || this.minCarto.latitude >= bbox.maxCarto.latitude
        || this.maxCarto.latitude <= bbox.minCarto.latitude);

    };
    
    
    BoudingBox.prototype.get3DBBox = function(ellipsoid,normal,center){
       
        var cardinals       = [];
        
        var phiStart        = this.minCarto.longitude ;
        var phiLength       = this.dimension.x;

        var thetaStart      = this.minCarto.latitude ;
        var thetaLength     = this.dimension.y;
        
        //      0---1---2
        //      |       |
        //      7       3
        //      |       |
        //      6---5---4
        
        cardinals.push(new CoordCarto(phiStart                        , thetaStart    ,0));
        cardinals.push(new CoordCarto(phiStart + this.halfDimension.x , thetaStart    ,0));
        cardinals.push(new CoordCarto(phiStart + phiLength            , thetaStart    ,0));
        cardinals.push(new CoordCarto(phiStart + phiLength            , thetaStart + this.halfDimension.y,0));        
        cardinals.push(new CoordCarto(phiStart + phiLength            , thetaStart + thetaLength  ,0));
        cardinals.push(new CoordCarto(phiStart + this.halfDimension.x , thetaStart + thetaLength  ,0));        
        cardinals.push(new CoordCarto(phiStart                        , thetaStart + thetaLength  ,0));
        cardinals.push(new CoordCarto(phiStart                        , thetaStart + this.halfDimension.y,0));
        
        var cardinals3D     = [];                 
        var cardin3DPlane   = [];
        
        var maxV            = new THREE.Vector3(-1000,-1000,-1000);
        var minV            = new THREE.Vector3(1000,1000,1000);        
        var maxHeight       = 0;        
        var planeZ          = new THREE.Quaternion();
        var qRotY           = new THREE.Quaternion();
        var vec             = new THREE.Vector3();
        var tangentPlane    = new THREE.Plane(normal);
        
        planeZ.setFromUnitVectors(normal,new THREE.Vector3(0,1,0));        
        qRotY.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), -this.center.x );        
        qRotY.multiply(planeZ);
        
        for ( var i = 0; i < cardinals.length; i++ )
        {
                cardinals3D.push(ellipsoid.cartographicToCartesian(cardinals[i]));
                cardin3DPlane.push(tangentPlane.projectPoint(cardinals3D[i]));
                vec.subVectors(cardinals3D[i],center);
                maxHeight    = Math.max(maxHeight,cardin3DPlane[i].distanceTo(vec));                    
                cardin3DPlane[i].applyQuaternion( qRotY );
                maxV.max(cardin3DPlane[i]);
                minV.min(cardin3DPlane[i]);
        }
       
        maxHeight   = maxHeight*0.5;       
        var width   = Math.abs(maxV.z - minV.z)*0.5;
        var height  = Math.abs(maxV.x - minV.x)*0.5;               
        var delta   = height - Math.abs(cardin3DPlane[5].x);
        var max     = new THREE.Vector3( width, height, maxHeight);
        var min     = new THREE.Vector3(-width,-height,-maxHeight);
        var obb     = new THREE.OBB(min,max);

        obb.position.copy(center);
        obb.lookAt(normal);
        obb.translateZ(maxHeight);
        obb.translateY(delta);
        obb.update();
        
        return obb;
       
    };
    
    return BoudingBox;
    
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('Core/Geographic/Quad',['Scene/BoudingBox'], function(BoudingBox)
{
    function Quad(bbox)
    {
        this.northWest = new BoudingBox(bbox.minCarto.longitude,bbox.center.x,bbox.center.y,bbox.maxCarto.latitude,bbox.center);
        this.northEast = new BoudingBox(bbox.center.x,bbox.maxCarto.longitude,bbox.center.y,bbox.maxCarto.latitude,bbox.center);
        this.southWest = new BoudingBox(bbox.minCarto.longitude,bbox.center.x,bbox.minCarto.latitude,bbox.center.y,bbox.center);
        this.southEast = new BoudingBox(bbox.center.x,bbox.maxCarto.longitude,bbox.minCarto.latitude,bbox.center.y,bbox.center);
    }
    
    Quad.prototype.array = function()
    {
        var subdiv = [];
        
        subdiv.push(this.northWest);
        subdiv.push(this.northEast);
        subdiv.push(this.southWest);
        subdiv.push(this.southEast);        
        
        return subdiv;
    };
    
    return Quad;
    
});

/**
 * @license RequireJS text 2.0.14 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text',['module'], function (module) {
    

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.14',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.lastIndexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'] &&
            !process.versions['atom-shell'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file[0] === '\uFEFF') {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});


define('text!Renderer/Shader/GlobeVS.glsl',[],function () { return '/*\r\n#ifdef USE_LOGDEPTHBUF\r\n    \r\n    #define EPSILON 1e-6\r\n    #ifdef USE_LOGDEPTHBUF_EXT\r\n\r\n        varying float vFragDepth;\r\n\r\n    #endif\r\n\r\n    uniform float logDepthBufFC;\r\n\r\n#endif\r\n*/\r\nuniform sampler2D  dTextures_00[1];\r\nuniform int        nbTextures_00;\r\n\r\nvarying vec2 vUv;\r\nvarying vec3 vNormal;\r\n\r\n\r\n\r\nvoid main() {\r\n\r\n        vUv = uv;\r\n\r\n        if(nbTextures_00 > 0)\r\n        {\r\n            float dv = texture2D( dTextures_00[0], vUv ).w;\r\n\r\n            vNormal  = normalize( position );\r\n\r\n            vec3 displacedPosition = position +  vNormal  * dv;\r\n\r\n            gl_Position = projectionMatrix * modelViewMatrix * vec4( displacedPosition ,1.0 );\r\n        }\r\n        else\r\n            gl_Position = projectionMatrix * modelViewMatrix * vec4( position ,1.0 );\r\n\r\n        /*\r\n        #ifdef USE_LOGDEPTHBUF\r\n\r\n            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;\r\n\r\n            #ifdef USE_LOGDEPTHBUF_EXT\r\n\r\n                vFragDepth = 1.0 + gl_Position.w;\r\n\r\n            #else\r\n\r\n                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;\r\n\r\n            #endif\r\n\r\n        #endif\r\n        */\r\n}   ';});


define('text!Renderer/Shader/GlobePS.glsl',[],function () { return '//uniform sampler2D   dTextures_00[1];\r\n\r\nconst int   TEX_UNITS   = 8;\r\nconst float PI          = 3.14159265359;\r\nconst float INV_TWO_PI  = 1.0 / (2.0*PI);\r\nconst float PI2         = 1.57079632679;\r\nconst float PI4         = 0.78539816339;\r\nconst float poleSud     = -82.0 / 180.0 * PI;\r\nconst float poleNord    =  84.0 / 180.0 * PI;\r\n\r\nuniform sampler2D   dTextures_00[1];\r\nuniform sampler2D   dTextures_01[TEX_UNITS];\r\nuniform int         nbTextures_00;\r\nuniform int         nbTextures_01;\r\nuniform vec2        bLongitude; \r\nuniform vec2        bLatitude;\r\nuniform float       periArcLati;\r\nuniform float       y0;\r\nuniform float       zoom;\r\nuniform int         debug;\r\nvarying vec2        vUv;\r\n\r\nvoid main() {\r\n \r\n    float latitude  = bLatitude.x + periArcLati*(1.0-vUv.y);\r\n   \r\n    /*\r\n    float sLine = 0.0015;\r\n    if(vUv.x < sLine || vUv.x > 1.0 - sLine || vUv.y < sLine || vUv.y > 1.0 - sLine)\r\n        gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);\r\n    else \r\n    */\r\n    \r\n\r\n    if(latitude < poleSud )\r\n        gl_FragColor = vec4( 0.85, 0.85, 0.91, 1.0);\r\n    else\r\n    \r\n    if(latitude > poleNord)\r\n        gl_FragColor = vec4( 0.04, 0.23, 0.35, 1.0);\r\n    else\r\n        {                           \r\n            vec2 uvO ;\r\n            uvO.x           = vUv.x;\r\n            float nbRow     = pow(2.0,zoom + 1.0);\r\n            float y         = 0.5 - log(tan(PI4 + (latitude)*0.5))* INV_TWO_PI;\r\n            uvO.y           = 1.0 - mod(y,1.0/ nbRow)*nbRow;\r\n            float idStart   = floor( y0 * nbRow);\r\n            float idRow     = floor( y  * nbRow);\r\n            int   idd       = int(idRow - idStart);\r\n            vec4  ortho     = vec4( 0.04, 0.23, 0.35, 1.0);\r\n\r\n        \r\n            if(idd >= nbTextures_01)\r\n            {\r\n                idd     = nbTextures_01-1;\r\n                uvO.y   = 0.0;\r\n            }\r\n            else if(idd < 0)\r\n            {\r\n                idd     = 0;\r\n                uvO.y   = 1.0;\r\n            }\r\n\r\n            for (int x = 0; x < TEX_UNITS; x++)\r\n                if (x == idd)\r\n                    ortho  = texture2D( dTextures_01[x], uvO );\r\n\r\n            gl_FragColor = ortho;\r\n\r\n           // if(nbTextures_00 > 0)\r\n           //     gl_FragColor = texture2D( dTextures_00[0], vUv ) /5000.0;\r\n           \r\n\r\n         }      \r\n\r\n         if(debug > 0)\r\n            gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);\r\n\r\n        \r\n}\r\n\r\n/*\r\nvec4 eleva  = texture2D( dTextures_00[0], vUv);\r\ngl_FragColor = ortho + vec4( eleva.x *1.5,0.0,0.0, 1.0);                        \r\nif(eleva.x == 0.0)\r\n  gl_FragColor = vec4( 0.5, 0.5, 0.5, 1.0);\r\nelse\r\n    gl_FragColor = eleva*2.0;\r\n*/';});

/**
* Generated On: 2015-10-5
* Class: Quadtree
* Description: Structure de données spatiales possedant jusqu'à 4 Nodes
*/

/**
 * 
 * @param {type} Layer
 * @param {type} BoudingBox
 * @param {type} when
 * @param {type} Material
 * @returns {Quadtree_L10.Quadtree}
 */
define('Scene/Quadtree',[
        'Scene/Layer',                
        'Core/Geographic/CoordWMTS',
        'Core/Geographic/Quad',
        'text!Renderer/Shader/GlobeVS.glsl',
        'text!Renderer/Shader/GlobePS.glsl'], function(Layer,CoordWMTS,Quad,GlobeVS,GlobePS){
    

    function Quadtree(type,schemeTile)
    {        
        Layer.call( this,type);
        
        this.schemeTile       = schemeTile;
        this.tileType         = type;

        for (var i = 0; i < this.schemeTile.rootCount(); i++)
        {
            this.add(this.createTile(this.schemeTile.getRoot(i)));    
            this.subdivide(this.children[i]);
            this.subdivideChildren(this.children[i]);                        
        }               
    }
    
    Quadtree.prototype = Object.create( Layer.prototype );

    Quadtree.prototype.constructor = Quadtree;
    
    Quadtree.prototype.getMesh = function(){
               
        return this.children;
    };
      
    Quadtree.prototype.northWest = function(node)
    {
        return node.children[0];
    };
    
    Quadtree.prototype.northEast = function(node)
    {
        return node.children[1];
    };
    
    Quadtree.prototype.southWest = function(node)
    {
        return node.children[2];
    };
    
    Quadtree.prototype.southEast = function(node)
    {
        return node.children[3];
    };    
    
    Quadtree.prototype.createTile = function(bbox,parent)
    {
        var cooWMTS = this.projection.WGS84toWMTS(bbox);
        
        
        //-------------------------
        this.interCommand.getTile(bbox,cooWMTS,parent);
        //-------------------------                        
        
        var tile    = new this.tileType(bbox,GlobeVS,GlobePS,cooWMTS.zoom);        
        tile.level  = cooWMTS.zoom;
        
        this.interCommand.getTextureBil(cooWMTS).then(function(texture)
        {   
            this.setTextureTerrain(texture);
            
            return this;

        }.bind(tile)).then(function(tile)
        {      
            this.interCommand.requestDec();                        
            
            if(cooWMTS.zoom >= 2)
            {
                var box  = this.projection.WMTS_WGS84ToWMTS_PM(cooWMTS,bbox);                        
                var id = 0;
                var col = box[0].col;
                                                               
                for (var row = box[0].row; row < box[1].row + 1; row++)
                {
                    var coo = new CoordWMTS(box[0].zoom,row,col);
                    this.interCommand.getTextureOrtho(coo).then
                    (
                        function(texture)
                        {                             
                            this.setTextureOrtho(texture,id);

                        }.bind(tile)
                    ).then( function(){this.interCommand.requestDec();}.bind(this));
                    
                    id++;
                }  
            }
            
        }.bind(this)); 
        
        return tile;
    };    
        
   /**
    * return 4 equals subdivisions of the bouding box
    * @param {type} node
    * @returns {Array} four bounding box
    */
    Quadtree.prototype.subdivide = function(node)
    {
        if(node.level >= 11)
            return;        
        
        node.material.visible = false;
        
        if(node.childrenCount() !== 0)
        {
            for (var i = 0 ;i<node.childrenCount();i++)
                node.children[i].visible = true;
                            
            return;
        }    
        var quad = new Quad(node.bbox);
        /*
        return when.all([        
        node.add(this.createTile(quad.northWest)),
        node.add(this.createTile(quad.northEast)),
        node.add(this.createTile(quad.southWest)),
        node.add(this.createTile(quad.southEast))]).then(function()
        {
            node.material.visible = false;
        });
        */
       
        node.add(this.createTile(quad.northWest,node));
        node.add(this.createTile(quad.northEast,node));
        node.add(this.createTile(quad.southWest,node));
        node.add(this.createTile(quad.southEast,node));
          
        
    };
    
    Quadtree.prototype.subdivideChildren = function(node)
    {
        if(node.level === 3)
            return;
        for (var i = 0 ;i<node.children.length;i++)
        {
            this.subdivide(node.children[i]);            
           //this.subdivideChildren(node.children[i]);
        }
    };
    
    return Quadtree;

});
/**
* Generated On: 2015-10-5
* Class: SchemeTile
* Description: Cette classe décrit un découpage spatiale. 
*/


define('Scene/SchemeTile',['Scene/BoudingBox'], function(BoudingBox){

    function SchemeTile(){
        //Constructor

        this.maximumChildren    = 4;
        this.schemeBB           = [];
           
    }
    /**
     * 
     * @param {type} minLo
     * @param {type} maxLo
     * @param {type} minLa
     * @param {type} maxLa
     * @returns {SchemeTile_L8.SchemeTile.prototype@pro;schemeBB@call;push}
     */
     
    SchemeTile.prototype.add = function(minLo,maxLo,minLa,maxLa)
    {
        return this.schemeBB.push(new BoudingBox(minLo,maxLo,minLa,maxLa));
    };
    
    
    SchemeTile.prototype.rootCount = function()
    {
        return this.schemeBB.length;
    };
    
    SchemeTile.prototype.getRoot = function(id)
    {        
        return this.schemeBB[id];
    };
    

    return SchemeTile;
    
});
/**
* Generated On: 2015-10-5
* Class: Ellipsoid
* Description: Classe mathématique de  l'ellispoide
*/



define('Core/Math/Ellipsoid',['Core/Math/MathExtented','THREE'], function(MathExt,THREE){

    function Ellipsoid(x,y,z)
    {
        //Constructor

        this.rayon_1 = x;
        this.rayon_2 = y;
        this.rayon_3 = z;


        this._radiiSquared = new THREE.Vector3(x*x,y*y,z*z);
    }
    
    //var cartographicToCartesianNormal   = new THREE.Vector3();
    //var cartographicToCartesianK        = new THREE.Vector3();
    
    Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(coordCarto) {
    
        var longitude   = coordCarto.longitude;
        var latitude    = coordCarto.latitude;
        var cosLatitude = Math.cos(latitude);

        var x = cosLatitude * Math.cos(-longitude);
        var z = cosLatitude * Math.sin(-longitude);
        var y = Math.sin(latitude);
        
        
        var    result = new THREE.Vector3(x,y,z);

        return result.normalize();


    };
    
    
    Ellipsoid.prototype.cartographicToCartesian = function(coordCarto) 
    {
        
        //var n;
        var k = new THREE.Vector3();
        var n = this.geodeticSurfaceNormalCartographic(coordCarto);
     
        k.multiplyVectors(this._radiiSquared, n);
               
        var gamma = Math.sqrt(n.dot(k));        
               
        k.divideScalar( gamma);
        
        //n.multiplyScalar(coordCarto.altitude);
        
        n.multiplyScalar(0.0);
        
        return k.add( n);
    };
    
    Ellipsoid.prototype.cartographicToCartesianArray = function(coordCartoArray) 
    {
        
        var cartesianArray = [];
        for ( var i = 0; i < coordCartoArray.length; i++ )
        {
            cartesianArray.push(this.cartographicToCartesian(coordCartoArray[i]));
        }
        
        return cartesianArray;
       
    };
    
    return Ellipsoid;

});

/* global Uint16Array, Uint32Array */

/**
* Generated On: 2015-10-5
* Class: EllipsoidTileGeometry
* Description: Tuile géométrique. Buffer des vertex et des faces
*/

define('Globe/EllipsoidTileGeometry',['THREE','Core/defaultValue','Scene/BoudingBox','Core/Math/Ellipsoid','Core/Geographic/CoordCarto'], function(THREE,defaultValue,BoudingBox,Ellipsoid,CoordCarto){

    function EllipsoidTileGeometry(bbox){
        //Constructor
        THREE.BufferGeometry.call( this );
        
        bbox = defaultValue(bbox,new BoudingBox());

	var radius = 6.3567523142451793; 

        var ellipsoid       = new Ellipsoid(6378137, 6378137, 6356752.3142451793);
        
        //var ellipsoid       = new Ellipsoid(6, 6, 6);
        
        var nSeg            = 128;       
        var nVertex         = (nSeg+1)*(nSeg+1); // correct pour uniquement les vertex
        var triangles       = (nSeg)*(nSeg); // correct pour uniquement les vertex
        
        var widthSegments   = nSeg;
        var heightSegments  = nSeg;
        
        var bufferVertex    = new Float32Array(nVertex * 3);
        var bufferIndex     = new Uint32Array( triangles * 3 * 2);       
        var bufferNormal    = new Float32Array( nVertex * 3);
        var bufferUV        = new Float32Array( nVertex * 3);
        
        widthSegments       = Math.max( 2, Math.floor( widthSegments ) || 2 );
        heightSegments      = Math.max( 2, Math.floor( heightSegments ) || 2 );
//        
//        widthSegments       = 1;
//        heightSegments      = 1;

        var phiStart        = bbox.minCarto.longitude ;
        var phiLength       = bbox.dimension.x;

        var thetaStart      = bbox.minCarto.latitude ;
        var thetaLength     = bbox.dimension.y;
        
        //-----------
        this.normals        = [];
        this.HeightPoints    = [];
        
        this.carto2Normal = function(phi,theta)
        {                           
            return ellipsoid.geodeticSurfaceNormalCartographic(new CoordCarto( phi, theta,0));                
        };
        
        this.normals.push(this.carto2Normal(phiStart, thetaStart));
        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart+ thetaLength));
        this.normals.push(this.carto2Normal(phiStart, thetaStart+ thetaLength));
        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart));
        
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart    ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart    ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart    ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + bbox.halfDimension.y,0)));        
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + thetaLength  ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart + thetaLength  ,0)));        
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + thetaLength  ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + bbox.halfDimension.y,0)));
        
      
        this.normal = this.carto2Normal(bbox.center.x,bbox.center.y);        
        var ccarto  = new CoordCarto(bbox.center.x,bbox.center.y,0);        
        
        this.center = ellipsoid.cartographicToCartesian(ccarto) ;   
        this.OBB    = bbox.get3DBBox(ellipsoid,this.normal,this.center);
        
        //--------
    
        var idVertex        = 0;
        var x, y, verticees = [], uvs = [];

        this.vertices = [];

        for ( y = 0; y <= heightSegments; y ++ ) 
        {

            var verticesRow = [];
            var uvsRow = [];

            for ( x = 0; x <= widthSegments; x ++ ) 
            {

                    var u = x / widthSegments;
                    var v = y / heightSegments;

                    var longi   = phiStart      + u * phiLength;
                    var lati    = thetaStart    + v * thetaLength;

                    var vertex = ellipsoid.cartographicToCartesian(new CoordCarto(longi,lati,0)) ;                                                         
                    var id3     = idVertex*3 ;
                    
                    bufferVertex[id3+ 0] = vertex.x;
                    bufferVertex[id3+ 1] = vertex.y;
                    bufferVertex[id3+ 2] = vertex.z;

                    var normal = vertex.clone().normalize();

                    bufferNormal[id3+ 0] = normal.x;
                    bufferNormal[id3+ 1] = normal.y;
                    bufferNormal[id3+ 2] = normal.z;      

                    if ( Math.abs( vertex.y) === radius) {

                          u = u + 1 / (2* widthSegments );


                    } else if ( Math.abs( vertex.y) === radius ) {

                          u = u + 1 / (2* widthSegments );

                    } 

                    bufferUV[idVertex*2 + 0] = u;
                    bufferUV[idVertex*2 + 1] = 1-v;
                    idVertex ++;

                    this.vertices.push(vertex);                
                    verticesRow.push( this.vertices.length - 1 );
                    uvsRow.push( new THREE.Vector2( u, 1-v ));
            }

            verticees.push( verticesRow );
            uvs.push( uvsRow );

        }

        function bufferize(va,vb,vc,idVertex) 
        {
            bufferIndex[idVertex+ 0] = va;
            bufferIndex[idVertex+ 1] = vb;
            bufferIndex[idVertex+ 2] = vc;                               
        }

        idVertex = 0;

        for ( y = 0; y < heightSegments; y ++ ) {

              for ( x = 0; x < widthSegments; x ++ ) {

                    var v1 = verticees[ y ][ x + 1 ];
                    var v2 = verticees[ y ][ x ];
                    var v3 = verticees[ y + 1 ][ x ];
                    var v4 = verticees[ y + 1 ][ x + 1 ];

                    bufferize(v4,v2,v1,idVertex);
                    
                    idVertex +=3;

                    bufferize(v4,v3,v2,idVertex);
                    
                    idVertex +=3;
                }
        }
        
        this.setIndex( new THREE.BufferAttribute( bufferIndex, 1 ) );
        this.addAttribute( 'position',  new THREE.BufferAttribute( bufferVertex, 3 ) );
        this.addAttribute( 'normal',    new THREE.BufferAttribute( bufferNormal, 3 ) );
        this.addAttribute( 'uv',        new THREE.BufferAttribute( bufferUV, 2) );
        
        // ---> for SSE
        this.computeBoundingSphere();
        
    }

    EllipsoidTileGeometry.prototype = Object.create( THREE.BufferGeometry.prototype );

    EllipsoidTileGeometry.prototype.constructor = EllipsoidTileGeometry;

    return EllipsoidTileGeometry;
    
});
/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Renderer/Material',['THREE','Core/Math/MathExtented'], function(THREE,MathExt){
    
    // TODO Temp
    WGS84LatitudeClamp = function(latitude){
        
        //var min = -68.1389  / 180 * Math.PI;
        var min = -86  / 180 * Math.PI;
        var max =  84  / 180 * Math.PI;

        latitude = Math.max(min,latitude);
        latitude = Math.min(max,latitude);

        return latitude;

    };
       
    var  Material = function (sourceVS,sourcePS,bbox,zoom){
       
        this.Textures_00 = [];        
        this.Textures_00.push(new THREE.Texture());        
        this.Textures_01 = [];        
        this.Textures_01.push(new THREE.Texture());
                
        this.uniforms  = 
        {                        
            dTextures_00    : { type: "tv", value: this.Textures_00 },
            dTextures_01    : { type: "tv", value: this.Textures_01 },
            nbTextures_00   : { type: "i" , value: 0 },
            nbTextures_01   : { type: "i" , value: 0 },
            bLongitude      : { type: "v2", value: new THREE.Vector2(bbox.minCarto.longitude,bbox.maxCarto.longitude)}, 
            bLatitude       : { type: "v2", value: new THREE.Vector2(bbox.minCarto.latitude,bbox.maxCarto.latitude)},
            periArcLati     : { type: "f" , value: Math.abs(bbox.maxCarto.latitude - bbox.minCarto.latitude)},
            y0              : { type: "f" , value: 0.5 - Math.log(Math.tan(MathExt.PI_OV_FOUR + WGS84LatitudeClamp(bbox.maxCarto.latitude)*0.5))*MathExt.INV_TWO_PI},
            zoom            : { type: "f" , value: zoom },
            debug           : { type: "i" , value: false }
            
        };
       
        this.shader = new THREE.ShaderMaterial( {

            uniforms        : this.uniforms,
            vertexShader    : sourceVS,
            fragmentShader  : sourcePS

         });
         
         this.shader.wireframe = false;
        
    };
    
    Material.prototype.setTexture = function(texture,layer,id)
    {         
        if(layer === 0)
        {
            if(texture !== -1)    
            {                
                this.Textures_00[0]                = texture;        
                this.uniforms.dTextures_00.value   = this.Textures_00;        
                this.uniforms.nbTextures_00.value  = 1.0;                                
            }        
            
        }
        else
        {
            this.Textures_01[id]               = texture;        
            this.uniforms.dTextures_01.value   = this.Textures_01;        
            this.uniforms.nbTextures_01.value  = this.Textures_01.length;                 
        }
            
        
        this.shader.needsUpdate         = true;
    };
    
    Material.prototype.setDebug = function(debug_value)
    {
        this.uniforms.debug.value   = debug_value;
        this.shader.needsUpdate     = true;
    };
    
    
    return Material;
});
  
  


/**
* Generated On: 2015-10-5
* Class: EllipsoidTileMesh
* Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
*/

/**
 * 
 * @param {type} NodeMesh
 * @param {type} EllipsoidTileGeometry
 * @param {type} BoudingBox
 * @param {type} defaultValue
 * @param {type} THREE
 * @param {type} Material
 * @returns {EllipsoidTileMesh_L10.EllipsoidTileMesh}
 */
define('Globe/EllipsoidTileMesh',['Renderer/NodeMesh','Globe/EllipsoidTileGeometry','Scene/BoudingBox','Core/defaultValue','THREE','Renderer/Material'], function(NodeMesh,EllipsoidTileGeometry,BoudingBox,defaultValue,THREE,Material){
 

    function EllipsoidTileMesh(bbox,VS,PS,zoom){
        //Constructor
        NodeMesh.call( this );
        
        this.showHelper = true;
        
        this.bbox       = defaultValue(bbox,new BoudingBox());        
        this.geometry   = new EllipsoidTileGeometry(bbox);               
        this.tMat       = new Material(VS,PS,bbox,zoom);
        
        this.material   = this.tMat.shader;//new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe: false}); 
        this.dot        = 0;
    }

    EllipsoidTileMesh.prototype = Object.create( NodeMesh.prototype );

    EllipsoidTileMesh.prototype.constructor = EllipsoidTileMesh;
            
    EllipsoidTileMesh.prototype.subdivise = function(subBBox)
    {        
        var sublevel = this.level + 1;
        for(var i = 0;i< subBBox.length;i++)
        {
            var tileMesh        = new EllipsoidTileMesh(subBBox[i]);
            tileMesh.position.set(tileMesh.bbox.center.x-this.bbox.center.x,tileMesh.bbox.center.y-this.bbox.center.y,0);
            this.add(tileMesh);
            tileMesh.level = sublevel;

        }
    };
    
    EllipsoidTileMesh.prototype.setTextureTerrain = function(texture)
    {         
        this.tMat.setTexture(texture,0);      
    };   
    
    EllipsoidTileMesh.prototype.setTextureOrtho = function(texture,id)
    {         
        id = id === undefined ? 0 : id;
        this.tMat.setTexture(texture,1,id);        
    };   
    
    EllipsoidTileMesh.prototype.normals = function()
    { 
        return this.geometry.normals;
    };
    
     EllipsoidTileMesh.prototype.fourCorners = function()
    { 
        return this.geometry.fourCorners;
    };
    
    EllipsoidTileMesh.prototype.normal = function()
    { 
        return this.geometry.normal;
    };
    
    EllipsoidTileMesh.prototype.center = function()
    { 
        return this.geometry.center;
    };
    
    EllipsoidTileMesh.prototype.OBB = function()
    { 
        return this.geometry.OBB;
    };
    
    return EllipsoidTileMesh;
    
});

define('text!Renderer/Shader/GlowFS.glsl',[],function () { return '\r\nuniform int atmoIN;\r\nuniform vec2 screenSize;\r\nvarying float intensity;\r\n\r\nvec4 glowColor = vec4(0.45, 0.74, 1. ,1.);\r\n\r\nvoid main() \r\n{\r\n\r\n        float orientedintensity  = intensity * (screenSize.x - gl_FragCoord.x)/(screenSize.x/2.);\r\n        gl_FragColor = glowColor * orientedintensity;\r\n \r\n}\r\n\r\n';});


define('text!Renderer/Shader/GlowVS.glsl',[],function () { return '/*\r\n#ifdef USE_LOGDEPTHBUF\r\n\r\n    #ifdef USE_LOGDEPTHBUF_EXT\r\n\r\n        varying float vFragDepth;\r\n\r\n    #endif\r\n\r\n    uniform float logDepthBufFC;\r\n\r\n#endif\r\n\r\n#define EPSILON 1e-6\r\n*/\r\n\r\nuniform int atmoIN;\r\nvarying float intensity;\r\nvec3 normalES;\r\nvec3 normalCAMES;\r\n\r\nvoid main() \r\n{\r\n    normalES = normalize( normalMatrix * normal );\r\n    normalCAMES = normalize( normalMatrix * cameraPosition );\r\n\r\n    if(atmoIN == 0)\r\n        intensity = pow( 0.55 - dot(normalES, normalCAMES), 4. ); \r\n      else\r\n        intensity = pow( 1.  - dot(normalES, normalCAMES), 0.8 );\r\n\r\n    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\r\n\r\n    /*\r\n    #ifdef USE_LOGDEPTHBUF\r\n\r\n        gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;\r\n\r\n        #ifdef USE_LOGDEPTHBUF_EXT\r\n\r\n            vFragDepth = 1.0 + gl_Position.w;\r\n\r\n        #else\r\n\r\n            gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;\r\n\r\n        #endif\r\n\r\n    #endif\r\n    */\r\n}\r\n\r\n\r\n';});

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Globe/Atmosphere',['Renderer/NodeMesh','THREE','text!Renderer/Shader/GlowFS.glsl','text!Renderer/Shader/GlowVS.glsl'], function(NodeMesh,THREE,GlowFS,GlowVS){

    function Atmosphere(){
        
        NodeMesh.call( this );
        
        this.uniformsOut  = 
        {                        
            atmoIN  : { type: "i" , value: 0 },
            screenSize: {type: "v2", value: new THREE.Vector2(window.innerWidth,window.innerHeight)} // Should be updated on screen resize...
        };
        
        this.material = new THREE.ShaderMaterial( {
	
            uniforms        : this.uniformsOut,
            vertexShader    : GlowVS,
            fragmentShader  : GlowFS,
            side            : THREE.BackSide,
            blending        : THREE.AdditiveBlending,
            transparent     : true

        } );
                
        this.geometry       = new THREE.SphereGeometry( 7300000, 64, 64 );
        
        this.uniformsIn  = 
        {                        
            atmoIN  : { type: "i" , value: 1 },
            screenSize: {type: "v2", value: new THREE.Vector2(window.innerWidth,window.innerHeight)} // Should be updated on screen resize...
        };
        
        var materialAtmoIn = new THREE.ShaderMaterial( {
	
            uniforms        : this.uniformsIn,
            vertexShader    : GlowVS,
            fragmentShader  : GlowFS,
            side            : THREE.FrontSide,
            blending        : THREE.AdditiveBlending,
            transparent     : true

        } );
        
        var atmosphereIN    = new THREE.Mesh(new THREE.SphereGeometry( 6400000, 64, 64 ),materialAtmoIn);
        
        this.add(atmosphereIN);
        
        this.add(new THREE.Mesh(new THREE.SphereGeometry(6300000, 32, 32 ), new THREE.MeshBasicMaterial({color : 0x4B683A})));
        
    }
    
    Atmosphere.prototype = Object.create( NodeMesh.prototype );
    
    Atmosphere.prototype.constructor = Atmosphere;

    return Atmosphere;

});
/**
* Generated On: 2015-10-5
* Class: Globe
* Description: Le globe est le noeud du globe (node) principale.
*/

define('Globe/Globe',['Scene/Node','Scene/Quadtree','Scene/SchemeTile','Core/Math/MathExtented','Globe/EllipsoidTileMesh','Globe/Atmosphere'], function(Node,Quadtree,SchemeTile,MathExt,EllipsoidTileMesh,Atmosphere){

    function Globe(){
        //Constructor

        Node.call( this );
        
        this.terrain    = new Quadtree(EllipsoidTileMesh,this.SchemeTileWMTS(2));        
        //this.atmosphere = new Atmosphere();        
        
        this.add(this.terrain);
        //this.add(this.atmosphere);        
    }

    Globe.prototype = Object.create( Node.prototype );

    Globe.prototype.constructor = Globe;

    /**
    * @documentation: Gère les interactions entre les QuadTree.
    *
    */
    Globe.prototype.QuadTreeToMesh = function(){
        //TODO: Implement Me 

    };
    
    Globe.prototype.getMesh = function(){
        
        return this.terrain.getMesh();
        
    };

    /**
    * @documentation: Rafrachi les matériaux en fonction du quadTree ORTHO
    *
    */
    Globe.prototype.QuadTreeToMaterial = function(){
        //TODO: Implement Me 

    };
    
    Globe.prototype.SchemeTileWMTS = function(type){
        //TODO: Implement Me 
        if(type === 2)
        {
            var schemeT = new SchemeTile();
            schemeT.add(0,MathExt.PI,-MathExt.PI_OV_TWO,MathExt.PI_OV_TWO);
            schemeT.add(MathExt.PI,MathExt.TWO_PI,-MathExt.PI_OV_TWO,MathExt.PI_OV_TWO);
            return schemeT;
        }

    };
    
    return Globe;
    
});



/**
* Generated On: 2015-10-5
* Class: NodeProcess
* Description: NodeProcess effectue une opération sur un Node.
*/

define('Scene/NodeProcess',['Scene/BoudingBox','Renderer/Camera','Core/Math/MathExtented','THREE'], function(BoudingBox,Camera,MathExt,THREE){


    function NodeProcess(camera3D){
        //Constructor
        this.camera = new Camera();        
        this.camera.camera3D  = camera3D.clone();
        
        this.bbox = new BoudingBox(MathExt.PI_OV_TWO+MathExt.PI_OV_FOUR,MathExt.PI+MathExt.PI_OV_FOUR,0,MathExt.PI_OV_TWO);
        
        this.vhMagnitudeSquared = 1.0;  
        
        this.r  = new THREE.Vector3(6378137,6356752.3142451793,6378137);
        this.cV  = new THREE.Vector3();
        
    }

    NodeProcess.prototype.backFaceCulling = function(node,camera)
    {
        var normal  = camera.direction;
        for(var n = 0; n < node.normals().length; n ++ ) 
        {
            
            var dot = normal.dot(node.normals()[n]);
            if( dot > 0 )
            {
                node.visible    = true;                
                return true;
            }
        };              
      
      node.visible = true;
        
       return node.visible;
              
    };
    
    NodeProcess.prototype.setCamera = function(camera)
    {        
        this.camera = camera;
    };
    
    
    NodeProcess.prototype.frustumCulling = function(node,camera)
    {        
        var frustum = camera.frustum;
        
        return frustum.intersectsObject(node);   
    };
    
    NodeProcess.prototype.SSE = function(node,camera)
    {                                        
        return camera.SSE(node) > 1.0;            
    };
    
    NodeProcess.prototype.frustumCullingOBB = function(node,camera)        
    {        
        var obb     = node.geometry.OBB;
        var quadInv = obb.quadInverse().clone();            

        this.camera.setPosition(obb.worldToLocal(camera.position().clone()));
        this.camera.setRotation(quadInv.multiply(camera.camera3D.quaternion));
        
        node.visible = this.camera.getFrustum().intersectsBox(obb.box3D);
        
        return node.visible;
        
    };
    
    /**
     * 
     * @param {type} node
     * @param {type} camera
     * @returns {unresolved}
     */
    NodeProcess.prototype.frustumBB = function(node,camera)        
    { 
        
        node.visible = node.bbox.intersect(this.bbox);
        
        return node.visible;
    };
    
    NodeProcess.prototype.preHorizonCulling = function(camera)
    {
 
        this.cV  = MathExt.divideVectors(camera.position(),this.r);
        
        this.vhMagnitudeSquared = MathExt.lenghtSquared(this.cV) - 1.0;
  
    };
    
    NodeProcess.prototype.pointHorizonCulling = function(point)
    {
        
        var t = MathExt.divideVectors(point,this.r);

        // Vector VT
        var vT = new THREE.Vector3();
        vT.subVectors(t,this.cV);
        
        var vtMagnitudeSquared = MathExt.lenghtSquared(vT);

        var dot = - vT.dot(this.cV);

        var isOccluded = dot > this.vhMagnitudeSquared &&
                         dot * dot / vtMagnitudeSquared > this.vhMagnitudeSquared;
                 
        return isOccluded;
    };
    
    NodeProcess.prototype.horizonCulling = function(node)
    {
      var points = node.OBB().pointsWorld;
      
      var isVisible = false;
      for (var i = 0, max = points.length; i < max; i++) 
      {          
            if(!this.pointHorizonCulling(points[i]))
                isVisible = true;            
      }
      
      node.visible = isVisible;
//      if(isVisible === false)
//          node.tMat.setDebug(1);
//      else
//          node.tMat.setDebug(0);
//      
      
      return node.visible;
      
    };

    return NodeProcess;

});
/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['THREE','Globe/EllipsoidTileMesh','Scene/NodeProcess'], function(THREE,EllipsoidTileMesh,NodeProcess){

    function BrowseTree(scene){
        //Constructor
  
        this.oneNode    = 0;
        this.scene      = scene;       
        this.nodeProcess= new NodeProcess(this.scene.currentCamera().camera3D);
        this.tree       = undefined;
    }
    
    /**
     * 
     * @param {type} node
     * @returns {undefined}
     */
    BrowseTree.prototype.invisible= function(node)
    {
        //console.log('ssss');
        node.visible = false;
    };
    
    BrowseTree.prototype.processNode = function(node,camera,other)
    {        
        if(node instanceof EllipsoidTileMesh)
        {            
            node.visible = false;
            
            
            //if(this.nodeProcess.frustumBB(node,camera))
            {
                //this.nodeProcess.backFaceCulling(node,camera);

                //if(node.visible)
                {
                    this.nodeProcess.frustumCullingOBB(node,camera);
                                        
                    if(node.visible )
                    {
                        this.nodeProcess.horizonCulling(node,camera);
                                                
                        if(node.visible )
                        {
                            var sse = this.nodeProcess.SSE(node,camera);

                            if(node.parent.material !== undefined && node.parent.material.visible === true)
                            {
                                node.visible = false;
                                return false;
                            }


                            if(other && sse && node.material.visible === true)
                            {   
                                this.tree.subdivide(node);
                            }
                            else if(!sse && node.level >= 2 && node.material.visible === false)
                            {

                                node.material.visible = true;

                                if(node.childrenCount() !== 0)
                                    for(var i = 0;i<node.children.length;i++)
                                    {               
                                        //console.log("invisible");
                                        node.children[i].visible = false;
                                           //node.children[i].traverse(this.invisible);
                                    }

                                return false;                            
                            }

                        }
                    }
                }
            }
            
            return node.visible;
        }        
        
        return true;
    };

    /**
     * 
     * @param {type} tree
     * @param {type} camera
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera,other){
 
        this.tree = tree;
        this.nodeProcess.preHorizonCulling(camera);
        for(var i = 0;i<tree.children.length;i++)
            this._browse(tree.children[i],camera,other);

        if(other)
        {
            //console.log(this.tree.interCommand.managerCommands.queueAsync.sort());
        }
    };
    
    BrowseTree.prototype._browse = function(node, camera,other){
             
        if(this.processNode(node,camera,other))       
            for(var i = 0;i<node.children.length;i++)
                this._browse(node.children[i],camera,other);

    };
    
    BrowseTree.prototype.bBoxHelper = function(node)
    {          
        if(node instanceof EllipsoidTileMesh && node.level < 4  && node.noChild())
        {                
            if(this.oneNode === 7)
            {                    
                this.scene.scene3D().add(new THREE.OBBHelper(node.geometry.OBB));                                
            }
            this.oneNode++;
        }
    };
    
    BrowseTree.prototype.addOBBoxHelper = function(node){
             
        var bboxH = this.bBoxHelper(node);
            
        for(var i = 0;i<node.children.length;i++)
                this.addOBBoxHelper(node.children[i]);
            
        return bboxH;

    };
    
    return BrowseTree;
});
/**
* Generated On: 2015-10-5
* Class: Scene
* Description: La Scene est l'instance principale du client. Elle est le chef orchestre de l'application.
*/

define('Scene/Scene',['Renderer/c3DEngine','Globe/Star','Globe/Globe','Renderer/NodeMesh','Core/Commander/ManagerCommands','Scene/BrowseTree'], function(c3DEngine,Star,Globe,NodeMesh,ManagerCommands,BrowseTree){
 
    var instanceScene = null;

    function Scene(){
        //Constructor
        
        if(instanceScene !== null){
            throw new Error("Cannot instantiate more than one Scene");
        } 
        
        this.nodes          = [];            
        this.cameras        = null;        
        this.selectNodes    = null;      
        this.managerCommand = ManagerCommands();
        this.gfxEngine      = c3DEngine();                       
        this.browserScene   = new BrowseTree(this);

    }

    Scene.prototype.constructor = Scene;
    /**
    */
    Scene.prototype.updateCommand = function(){
        //TODO: Implement Me 

    };
    
    
    Scene.prototype.currentCamera = function(){
        return this.gfxEngine.camera ;

    };
    
    Scene.prototype.init = function()
    {
     
        this.gfxEngine.init(this);        
        this.add(new Globe());
        //this.add(new Star()); 
        this.managerCommand.scene = this;        
        this.gfxEngine.renderScene();
        
    };

    /**
    */
    Scene.prototype.updateCamera = function(){
        //TODO: Implement Me 

    };

    /**
     * 
     * @returns {undefined}
     */
    Scene.prototype.sceneProcess = function(){
        
        if(this.nodes[0] !== undefined  && this.currentCamera() !== undefined )
        {                        
            this.browserScene.browse(this.nodes[0].terrain,this.currentCamera(),true);
            this.gfxEngine.update(); // TODO --> replace by renderScene
        } 
        
    };
    
    Scene.prototype.realtimeSceneProcess = function(){        
        if(this.nodes[0] !== undefined  && this.currentCamera !== undefined )
        {            
            this.browserScene.browse(this.nodes[0].terrain,this.currentCamera(),false);
        }                
    };
    
    /**
    */
    Scene.prototype.updateScene3D = function(){
        //TODO: Implement Me 
       
    };
    
    Scene.prototype.wait = function(){
        
        var waitTime = 250;                
        
        this.realtimeSceneProcess();
        
        if(this.timer === null)
        { 
            this.timer = window.setTimeout(this.sceneProcess.bind(this),waitTime); 
        }
        else
        {
            window.clearInterval(this.timer);
            this.timer = window.setTimeout(this.sceneProcess.bind(this),waitTime); 
        }
        
    };

    /**
    */
    Scene.prototype.renderScene3D = function(){
        
        this.gfxEngine.renderScene();

    };
    
    Scene.prototype.scene3D = function(){
        
        return this.gfxEngine.scene3D;
    };

    /**
    * @documentation: Ajoute des Layers dans la scène.
    *
    * @param layer {[object Object]} 
    */
    Scene.prototype.add = function(layer){
        //TODO: Implement Me 
        
        this.nodes.push(layer);
        
        if(layer instanceof NodeMesh)            
            
            this.gfxEngine.add3DScene(layer);

        else if(layer instanceof Globe)            
        {
            var meshs = layer.getMesh();
            for (var i = 0;i<meshs.length;i++)                            
                this.gfxEngine.add3DScene(meshs[i]);
            
            //this.gfxEngine.add3DScene(layer.atmosphere);            
        }
    };

    /**
    * @documentation: Retire des layers de la scène
    *
    * @param layer {[object Object]} 
    */
    Scene.prototype.remove = function(layer){
        //TODO: Implement Me 

    };


    /**
    * @param nodes {[object Object]} 
    */
    Scene.prototype.select = function(nodes){
        //TODO: Implement Me 

    };

    return function(){
        instanceScene = instanceScene || new Scene();
        return instanceScene;
    };

});


/**
* Generated On: 2015-10-5
* Class: ApiGlobe
* Description: Classe façade pour attaquer les fonctionnalités du code.
*/


define('Core/Commander/Interfaces/ApiInterface/ApiGlobe',['Core/Commander/Interfaces/EventsManager','Scene/Scene'], function(EventsManager,Scene){
  
    function ApiGlobe(){
        //Constructor

        this.commandsTree = null;

    };        

    ApiGlobe.prototype = new EventsManager();

    /**
    * @param Command
    */
    ApiGlobe.prototype.add = function(Command){
        //TODO: Implement Me 

    };


    /**
    * @param commandTemplate
    */
    ApiGlobe.prototype.createCommand = function(commandTemplate){
        //TODO: Implement Me 

    };

    /**
    */
    ApiGlobe.prototype.execute = function(){
        //TODO: Implement Me 

    };
    
    ApiGlobe.CreateSceneGlobe = function(){
    //TODO: Normalement la création de scene ne doit pas etre ici....
    // à deplacer plus tard
    
        var scene = Scene();
      
        scene.init();
    
        return scene;

    };
    
    return ApiGlobe;

});


/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global requirejs */


requirejs.config({
    baseUrl: 'src/',
    paths : {
       
        'text'          : "ThirdParty/text",
        'THREE'         : "https://rawgit.com/mrdoob/three.js/master/build/three.min",
        'when'          : 'ThirdParty/when',        
        'OrbitControls' : "Renderer/Three/OrbitControls",
        'StarGeometry'  : "Renderer/ThreeExtented/StarGeometry",
        'OBB'           : "Renderer/ThreeExtented/OBB",
        'OBBHelper'     : "Renderer/ThreeExtented/OBBHelper"
        
    },
  /*
    bundles: {
        'primary': ['main', 'text']
    },	
  */
	
    shim: {
        
        THREE: {            
            exports: 'THREE'
        },
        when: {            
            exports: 'when'
        },
        OrbitControls: {
            deps: ['THREE']
        },
        StarGeometry: {
            deps: ['THREE']
        },
        OBB: {
            deps: ['THREE']
        },        
        OBBHelper: {
            deps: ['THREE']
        }

    },
    
    waitSeconds : 30
});


requirejs(['Core/Commander/Interfaces/ApiInterface/ApiGlobe'], 
    function(ApiGlobe) 
    {
          
        ApiGlobe.CreateSceneGlobe();
        
    }
);

define("Main", function(){});

