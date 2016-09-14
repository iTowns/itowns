// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

import THREE from 'three';
import Sphere from 'Core/Math/Sphere'
import CustomEvent from 'custom-event';

var selectClick = new CustomEvent('selectClick');

var CONTROL_STATE = {
    NONE: -1,
    ORBIT: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY: 4,
    TOUCH_PAN: 5,
    MOVE_GLOBE: 6,
    PANORAMIC: 7
};

// The control's keys
var CONTROL_KEYS = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40,
    SPACE: 32,
    SHIFT: 16,
    CTRL: 17,
    S: 83
};


////////////
// internals

var space = false;
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

// Orbit move
var spherical = new THREE.Spherical(1.0,0.01,0);
var sphericalDelta = new THREE.Spherical(1.0,0,0);

// Globe move
var quatGlobe = new THREE.Quaternion();

var scale = 1;
var panVector = new THREE.Vector3();

var lastPosition = new THREE.Vector3();
var lastQuaternion = new THREE.Quaternion();

var state = CONTROL_STATE.NONE;

/////////////////////////

var initialTarget;
var initialPosition;
var initialZoom;

/////////////////////////

var ptScreenClick = new THREE.Vector2();
var globeTarget = new THREE.Object3D();
var movingGlobeTarget = new THREE.Vector3();

// tangent sphere to ellispoid
var tSphere = new Sphere();
tSphere.picking = {position : new THREE.Vector3(),normal:new THREE.Vector3()};

var keyCtrl = false;
var keyShift = false;
var keyS = false;

// Set to true to enable target helper
var enableTargetHelper = true;

var _handlerMouseMove;
var _handlerMouseUp;

////

function SnapCamera(object) {

    object.updateMatrixWorld();

    this.matrixWorld = new THREE.Matrix4();
    this.projectionMatrix = new THREE.Matrix4();
    this.invProjectionMatrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();

    this.matrixWorld.elements = new Float64Array(16);
    this.projectionMatrix.elements = new Float64Array(16);
    this.invProjectionMatrix.elements = new Float64Array(16);

    this.init = function(object)
    {

        this.matrixWorld.elements.set(object.matrixWorld.elements);
        this.projectionMatrix.elements.set(object.projectionMatrix.elements);
        this.position.copy(object.position);
        this.invProjectionMatrix.getInverse( this.projectionMatrix );
    };

    this.init(object);

    this.shot = function(objectToSnap)
    {
        objectToSnap.updateMatrixWorld();
        this.matrixWorld.elements.set(objectToSnap.matrixWorld.elements);
        this.position.copy(objectToSnap.position);

    };

    var matrix = new THREE.Matrix4();
    matrix.elements = new Float64Array(16);

    this.updateRay = function(ray,mouse)
    {
        ray.origin.copy( this.position );
        ray.direction.set( mouse.x, mouse.y, 0.5 );
        matrix.multiplyMatrices( this.matrixWorld, this.invProjectionMatrix );
        ray.direction.applyProjection( matrix );
        ray.direction.sub( ray.origin ).normalize();

    };

}

var snapShotCamera;

/////////////////////////

function GlobeControls(object, domElement, engine) {

    this.object = object;
    snapShotCamera =  new SnapCamera(object);

    this.domElement = (domElement !== undefined) ? domElement : document;
    // API

    // Set to false to disable this control
    this.enabled = true;

    // This option actually enables dollying in and out; left as "zoom" for
    // backwards compatibility
    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    // Limits to how far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = 0;
    this.maxDistance = Infinity;

    // Limits to how far you can zoom in and out ( OrthographicCamera only )
    this.minZoom = 0;
    this.maxZoom = Infinity;

    // Set to true to disable this control
    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    // Set to true to disable this control
    this.enablePan = true;
    this.keyPanSpeed = 7.0; // pixels moved per arrow key push

    // Set to true to automatically rotate around the target
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    // TODO ATTENTION trick pas correct minPolarAngle = 0.01
    this.minPolarAngle = 0.01; // radians
    this.maxPolarAngle = Math.PI; // radians

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    this.minAzimuthAngle = -Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    // Set to true to disable use of the keys
    this.enableKeys = true;


    if(enableTargetHelper)

        this.pickingHelper = new THREE.AxisHelper( 500000 );

    // Mouse buttons
    this.mouseButtons = {
        PANORAMIC: THREE.MOUSE.LEFT,
        ZOOM: THREE.MOUSE.MIDDLE,
        PAN: THREE.MOUSE.RIGHT
    };

    // radius tSphere
    tSphere.setRadius(engine.size);
    spherical.radius = tSphere.radius;

    // so camera.up is the orbit axis
    //var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    //var quatInverse = quat.clone().inverse();

    // events

    this.changeEvent = {
        type: 'change'
    };
    this.startEvent = {
        type: 'start'
    };
    this.endEvent = {
        type: 'end'
    };

    this.updateObject = function(object) {

        snapShotCamera.init(object);

    };

    this.getAutoRotationAngle = function() {

        return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;

    }

    this.getZoomScale  = function () {

        return Math.pow(0.95, this.zoomSpeed);

    }

    this.rotateLeft = function(angle) {

        if (angle === undefined) {

            angle = this.getAutoRotationAngle();

        }
        sphericalDelta.theta -= angle;
    };

    this.rotateUp = function(angle) {

        if (angle === undefined) {

            angle = this.getAutoRotationAngle();

        }

        sphericalDelta.phi -= angle;

    };

    // pass in distance in world space to move left
    this.panLeft = function(distance) {

        var te = this.object.matrix.elements;

        // get X column of matrix
        panOffset.set(te[0], te[1], te[2]);
        panOffset.multiplyScalar(-distance);

        panVector.add(panOffset);

    };

    // pass in distance in world space to move up
    this.panUp = function(distance) {

        var te = this.object.matrix.elements;

        // get Y column of matrix
        panOffset.set(te[4], te[5], te[6]);
        panOffset.multiplyScalar(distance);

        panVector.add(panOffset);

    };

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    this.pan = function(deltaX, deltaY) {

        var element = this.domElement === document ? this.domElement.body : this.domElement;

        if (this.object instanceof THREE.PerspectiveCamera) {

            // perspective
            var position = this.object.position;

            //var offset = position.clone().sub(this.target);
            var offset = position.clone().sub(globeTarget.position);

            var targetDistance = offset.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            this.panLeft(2 * deltaX * targetDistance / element.clientHeight);
            this.panUp(2 * deltaY * targetDistance / element.clientHeight);


        } else if (this.object instanceof THREE.OrthographicCamera) {

            // orthographic
            this.panLeft(deltaX * (this.object.right - this.object.left) / element.clientWidth);
            this.panUp(deltaY * (this.object.top - this.object.bottom) / element.clientHeight);

        } else {

            // camera neither orthographic or perspective
            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - this.pan disabled.');

        }

    };

    this.dollyIn = function(dollyScale) {

        if (dollyScale === undefined) {

            dollyScale = this.getZoomScale();

        }

        if (this.object instanceof THREE.PerspectiveCamera) {

            scale /= dollyScale;

        } else if (this.object instanceof THREE.OrthographicCamera) {

            this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
            this.object.updateProjectionMatrix();
            this.dispatchEvent(this.changeEvent);

        } else {

            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - dolly/zoom disabled.');

        }

    };

    this.dollyOut = function(dollyScale) {

        if (dollyScale === undefined) {

            dollyScale = this.getZoomScale();

        }

        if (this.object instanceof THREE.PerspectiveCamera) {

            scale *= dollyScale;

        } else if (this.object instanceof THREE.OrthographicCamera) {

            this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
            this.object.updateProjectionMatrix();
            this.dispatchEvent(this.changeEvent);

        } else {

            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - dolly/zoom disabled.');

        }

    };

    var getPickingPosition = function(){

        var engineGfx = engine;
        var position;

        return function(coords)
        {
            position = engineGfx.getPickingPositionFromDepth(coords);
            engineGfx.renderScene();

            return position;
        };

    }();

    var offGT = new THREE.Vector3();
    var quaterPano = new THREE.Quaternion();
    var quaterAxis = new THREE.Quaternion();
    var axisX = new THREE.Vector3(1, 0, 0);

    var update = function() {

        if (state === CONTROL_STATE.MOVE_GLOBE) {
            offset.copy(snapShotCamera.position);
        } else {
            offset.copy(globeTarget.worldToLocal(this.object.position.clone()));
        }

        offGT.copy(globeTarget.position);

        if (state === CONTROL_STATE.MOVE_GLOBE) {
            offGT.applyQuaternion(quatGlobe);
            movingGlobeTarget.copy(offGT);
            this.object.position.copy(offset.applyQuaternion(quatGlobe));
            this.object.up.copy(offGT.clone().normalize());

        } else if (state !== CONTROL_STATE.PANORAMIC) {

            // State ZOOM/ORBIT

            //offset.applyQuaternion( quat );

            // angle from z-axis around y-axis
            if(sphericalDelta.theta || sphericalDelta.phi )
                spherical.setFromVector3( offset );

            if (this.autoRotate && state === CONTROL_STATE.NONE) {

                this.rotateLeft(this.getAutoRotationAngle());

            }

            spherical.theta += sphericalDelta.theta;
            spherical.phi += sphericalDelta.phi;

            // restrict spherical.theta to be between desired limits
            spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, spherical.theta));

            // restrict spherical.phi to be between desired limits
            spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, spherical.phi));

            spherical.radius = offset.length() * scale;

            // restrict spherical.phi to be betwee EPS and PI-EPS
            spherical.makeSafe();

            // restrict radius to be between desired limits
            spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, spherical.radius));

            // move target to panned location
            globeTarget.position.add( panVector );

            offset.setFromSpherical( spherical );

            //rotate point back to "camera-up-vector-is-up" space
            //offset.applyQuaternion( quatInverse );

            this.object.position.copy(globeTarget.localToWorld(offset.clone()));

        }

        if (state === CONTROL_STATE.PANORAMIC) {

            this.object.worldToLocal(movingGlobeTarget);
            var normal = this.object.position.clone().normalize().applyQuaternion(this.object.quaternion.clone().inverse());
            quaterPano.setFromAxisAngle(normal, sphericalDelta.theta).multiply(quaterAxis.setFromAxisAngle(axisX, sphericalDelta.phi));
            movingGlobeTarget.applyQuaternion(quaterPano);
            this.object.localToWorld(movingGlobeTarget);
            this.object.up.copy(movingGlobeTarget.clone().normalize());
            this.object.lookAt(movingGlobeTarget);

        } else {
            this.object.lookAt(offGT); // Usual CASE (not rotating around camera axe)
        }

        // quatGlobe.set(0, 0, 0, 1);
        sphericalDelta.theta = 0;
        sphericalDelta.phi = 0;
        scale = 1;
        panVector.set(0, 0, 0);

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (lastPosition.distanceToSquared(this.object.position) > EPS || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {

            this.dispatchEvent(this.changeEvent);

            lastPosition.copy(this.object.position);
            lastQuaternion.copy(this.object.quaternion);

        }
    }.bind(this);

    this.getSpace = function() {
        return space;
    };

    var positionObject = function()
    {
        var quaterionX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        return function(newPosition,object)
        {
            object.position.copy(newPosition);
            object.lookAt(newPosition.clone().multiplyScalar(2));
            object.quaternion.multiply(quaterionX);
            object.updateMatrixWorld();
        }
    }();

    var setGlobleTarget = function(newPosition) { // Compute the new target center position

        positionObject(newPosition,globeTarget);

    };

    var updateGlobeTarget = function() {

        // Get distance camera DME
        var distanceTarget = getPickingPosition().distanceTo(this.object.position);

        // Position movingGlobeTarget on DME
        this.object.worldToLocal(movingGlobeTarget);
        movingGlobeTarget.setLength(distanceTarget);
        this.object.localToWorld(movingGlobeTarget);

        // set new globe target
        setGlobleTarget(movingGlobeTarget);

        // update spherical from target
        offset.copy(globeTarget.worldToLocal(this.object.position.clone()));
        spherical.setFromVector3(offset);

    };

    var updateHelper = enableTargetHelper ?  function(position,helper){

         positionObject(position,helper);
         this.dispatchEvent(this.changeEvent);

    } : function(){};

    this.getPickingPositionOnSphere = function() {

        return tSphere.picking.position;
    };

    var updateSpherePicking = function() {

        var mouse = new THREE.Vector2();
        var ray = new THREE.Ray();

        return function(point,screenCoord){

            tSphere.setRadius(point.length());

            mouse.x = (screenCoord.x / this.domElement.clientWidth) * 2 - 1;
            mouse.y = -(screenCoord.y / this.domElement.clientHeight) * 2 + 1;

            snapShotCamera.updateRay(ray,mouse);
            // pick position on tSphere
            tSphere.picking.position.copy(tSphere.intersectWithRay(ray));
            tSphere.picking.normal = tSphere.picking.position.clone().normalize();

            updateHelper.bind(this)(tSphere.picking.position,this.pickingHelper);
        };

    }.bind(this)();

    var onMouseMove = function(event) {

        if (this.enabled === false) return;

        event.preventDefault();

        if (state === CONTROL_STATE.ORBIT || state === CONTROL_STATE.PANORAMIC) {

            if (this.enableRotate === false) return;

            rotateEnd.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
            rotateDelta.subVectors(rotateEnd, rotateStart);

            // rotating across whole screen goes 360 degrees around
            if (!space) {
                this.rotateLeft(2 * Math.PI * rotateDelta.x / this.domElement.clientWidth * this.rotateSpeed);

                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(2 * Math.PI * rotateDelta.y / this.domElement.clientHeight * this.rotateSpeed);

            } else {

                this.rotateLeft(rotateDelta.x);

                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(rotateDelta.y);
            }

            rotateStart.copy(rotateEnd);

        } else if (state === CONTROL_STATE.DOLLY) {

            if (this.enableZoom === false) return;

            dollyEnd.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
            dollyDelta.subVectors(dollyEnd, dollyStart);

            if (dollyDelta.y > 0) {

                this.dollyIn();

            } else if (dollyDelta.y < 0) {

                this.dollyOut();

            }

            dollyStart.copy(dollyEnd);

        } else if (state === CONTROL_STATE.PAN) {

            if (this.enablePan === false) return;

            panEnd.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
            panDelta.subVectors(panEnd, panStart);

            this.pan(panDelta.x, panDelta.y);

            panStart.copy(panEnd);

        } else if (state === CONTROL_STATE.MOVE_GLOBE) {

            var mouse = new THREE.Vector2();

            mouse.x = ((event.clientX - event.target.offsetLeft) / this.domElement.clientWidth) * 2 - 1;
            mouse.y = -((event.clientY - event.target.offsetTop) / this.domElement.clientHeight) * 2 + 1;

            var ray = new THREE.Ray();

            snapShotCamera.updateRay(ray,mouse);

            var intersection = tSphere.intersectWithRay(ray);

            if (intersection)
                quatGlobe.setFromUnitVectors(intersection.normalize(), tSphere.picking.normal);
        }

        if (state !== CONTROL_STATE.NONE) update();

    }

    var onMouseDown = function(event) {

        if (this.enabled === false) return;
        event.preventDefault();

        //quatGlobe.set(0, 0, 0, 1);
        snapShotCamera.shot(this.object);

        if (event.button === this.mouseButtons.PANORAMIC) {
            if (this.enableRotate === false) return;

            if (keyCtrl) {
                state = CONTROL_STATE.ORBIT;
            } else if (keyShift) {
                state = CONTROL_STATE.PANORAMIC;
            } else if (keyS) {

                // If the key 'S' is down, the engine selects node under mouse
                selectClick.mouse = new THREE.Vector2(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);

                domElement.dispatchEvent(selectClick);

            } else {

                // TODO: update target resolve problem target
                updateGlobeTarget.bind(this)();

                state = CONTROL_STATE.MOVE_GLOBE;

                snapShotCamera.shot(this.object);

                ptScreenClick.x = event.clientX - event.target.offsetLeft;
                ptScreenClick.y = event.clientY - event.target.offsetTop;

                var point = getPickingPosition(ptScreenClick);

                // update tangent sphere which passes through the point
                if (point)
                    updateSpherePicking.bind(this)(point,ptScreenClick);

            }

            rotateStart.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);


        } else if (event.button === this.mouseButtons.ZOOM) {
            if (this.enableZoom === false) return;

            state = CONTROL_STATE.DOLLY;

            dollyStart.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);

        } else if (event.button === this.mouseButtons.PAN) {
            if (this.enablePan === false) return;

            state = CONTROL_STATE.PAN;

            panStart.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);

        }

        if (state !== CONTROL_STATE.NONE) {
            this.domElement.addEventListener('mousemove', _handlerMouseMove, false);
            this.domElement.addEventListener('mouseup', _handlerMouseUp, false);
            this.dispatchEvent(this.startEvent);
        }

    }

    var onMouseUp = function( /* event */ ) {

        if (this.enabled === false) return;

        this.domElement.removeEventListener('mousemove', _handlerMouseMove, false);
        this.domElement.removeEventListener('mouseup', _handlerMouseUp, false);
        this.dispatchEvent(this.endEvent);

        if(state === CONTROL_STATE.PAN)
            movingGlobeTarget.copy(globeTarget.position);

        updateGlobeTarget.bind(this)();
        state = CONTROL_STATE.NONE;
    }

    var onMouseWheel = function(event) {

        if (this.enabled === false || this.enableZoom === false || state !== CONTROL_STATE.NONE) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if (event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9

            delta = event.wheelDelta;

        } else if (event.detail !== undefined) { // Firefox

            delta = -event.detail;

        }

        if (delta > 0) {

            this.dollyOut();

        } else if (delta < 0) {

            this.dollyIn();

        }

        update();

        this.dispatchEvent(this.startEvent);
        this.dispatchEvent(this.endEvent);

    }

    var onKeyUp = function ( /*event*/ ) {

        if (this.enabled === false || this.enableKeys === false || this.enablePan === false) return;


        if(state === CONTROL_STATE.PAN)
        {
            movingGlobeTarget.copy(globeTarget.position);
            updateGlobeTarget.bind(this)();
        }

        keyCtrl = false;
        keyShift = false;
        keyS = false;

    }

    var onKeyDown = function(event) {

        if (this.enabled === false || this.enableKeys === false || this.enablePan === false) return;
        keyCtrl = false;
        keyShift = false;

        this.keyPanSpeed = 7.0;

        // console.log();

        switch (event.keyCode) {

            case CONTROL_KEYS.UP:
                this.pan(0, this.keyPanSpeed);
                update();
                break;

            case CONTROL_KEYS.BOTTOM:
                this.pan(0, -this.keyPanSpeed);
                update();
                break;

            case CONTROL_KEYS.LEFT:
                this.pan(this.keyPanSpeed, 0);
                update();
                break;

            case CONTROL_KEYS.RIGHT:
                this.pan(-this.keyPanSpeed, 0);
                update();
                break;
            // TODO Why space key, looking for movement
            case CONTROL_KEYS.SPACE:
                space = !space;
                // this.updateTarget();
                update();
                break;
            case CONTROL_KEYS.CTRL:
                //computeVectorUp();
                keyCtrl = true;
                break;
            case CONTROL_KEYS.SHIFT:
                //computeVectorUp();
                keyShift = true;
                break;
            case CONTROL_KEYS.S:
                // WARNING loop !!!
                keyS = true;
                break;

        }
    }

    var touchstart = function(event) {

        if (this.enabled === false) return;

        switch (event.touches.length) {

            case 1: // one-fingered touch: rotate

                if (this.enableRotate === false) return;

                state = CONTROL_STATE.TOUCH_ROTATE;

                rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
                break;

            case 2: // two-fingered touch: dolly

                if (this.enableZoom === false) return;

                state = CONTROL_STATE.TOUCH_DOLLY;

                var dx = event.touches[0].pageX - event.touches[1].pageX;
                var dy = event.touches[0].pageY - event.touches[1].pageY;
                var distance = Math.sqrt(dx * dx + dy * dy);
                dollyStart.set(0, distance);
                break;

            case 3: // three-fingered touch: this.pan

                if (this.enablePan === false) return;

                state = CONTROL_STATE.TOUCH_PAN;

                panStart.set(event.touches[0].pageX, event.touches[0].pageY);
                break;

            default:

                state = CONTROL_STATE.NONE;

        }

        if (state !== CONTROL_STATE.NONE) this.dispatchEvent(this.startEvent);

    }

    var touchmove= function(event) {

        if (this.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        var element = this.domElement === document ? this.domElement.body : this.domElement;

        switch (event.touches.length) {

            case 1: // one-fingered touch: rotate

                if (this.enableRotate === false) return;
                if (state !== CONTROL_STATE.TOUCH_ROTATE) return;

                rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                rotateDelta.subVectors(rotateEnd, rotateStart);

                // rotating across whole screen goes 360 degrees around
                this.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * this.rotateSpeed);
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                this.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * this.rotateSpeed);

                rotateStart.copy(rotateEnd);

                update();
                break;

            case 2: // two-fingered touch: dolly

                if (this.enableZoom === false) return;
                if (state !== CONTROL_STATE.TOUCH_DOLLY) return;

                var dx = event.touches[0].pageX - event.touches[1].pageX;
                var dy = event.touches[0].pageY - event.touches[1].pageY;
                var distance = Math.sqrt(dx * dx + dy * dy);

                dollyEnd.set(0, distance);
                dollyDelta.subVectors(dollyEnd, dollyStart);

                if (dollyDelta.y > 0) {

                    this.dollyOut();

                } else if (dollyDelta.y < 0) {

                    this.dollyIn();

                }

                dollyStart.copy(dollyEnd);

                update();
                break;

            case 3: // three-fingered touch: this.pan

                if (this.enablePan === false) return;
                if (state !== CONTROL_STATE.TOUCH_PAN) return;

                panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                panDelta.subVectors(panEnd, panStart);

                this.pan(panDelta.x, panDelta.y);

                panStart.copy(panEnd);

                update();
                break;

            default:

                state = CONTROL_STATE.NONE;

        }

    }

    var touchend= function( /* event */ ) {

        if (this.enabled === false) return;

        this.dispatchEvent(this.endEvent);
        state = CONTROL_STATE.NONE;
        keyCtrl = false;
        keyShift = false;
        keyS = false;

    }

    this.updateControls = function(controlState)
    {
        state = controlState || CONTROL_STATE.ORBIT;
        update();
        state = CONTROL_STATE.NONE;
        updateGlobeTarget.bind(this)();
    };

    this.domElement.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    }, false);
    this.domElement.addEventListener('mousedown', onMouseDown.bind(this), false);
    this.domElement.addEventListener('mousewheel', onMouseWheel.bind(this), false);
    this.domElement.addEventListener('DOMMouseScroll', onMouseWheel.bind(this), false); // firefox

    this.domElement.addEventListener('touchstart', touchstart.bind(this), false);
    this.domElement.addEventListener('touchend', touchend.bind(this), false);
    this.domElement.addEventListener('touchmove', touchmove.bind(this), false);

    // TODO Why windows
    window.addEventListener('keydown', onKeyDown.bind(this), false);
    window.addEventListener('keyup', onKeyUp.bind(this), false);

    // Initialisation Globe Target and movingGlobeTarget
    var positionTarget = new THREE.Vector3().copy(object.position).setLength(tSphere.radius);
    setGlobleTarget(positionTarget);
    movingGlobeTarget.copy(positionTarget);
    this.object.up.copy(positionTarget.normalize());

    update();

    engine.scene3D.add(globeTarget);

    if(enableTargetHelper)
    {
        globeTarget.add( new THREE.AxisHelper( 500000 ));
        engine.scene3D.add(this.pickingHelper);
    }

    // Start position
    initialTarget = globeTarget.clone();
    initialPosition = this.object.position.clone();
    initialZoom = this.object.zoom;

    _handlerMouseMove = onMouseMove.bind(this);
    _handlerMouseUp = onMouseUp.bind(this);

}

GlobeControls.prototype = Object.create(THREE.EventDispatcher.prototype);
GlobeControls.prototype.constructor = GlobeControls;

// # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
// API Function

GlobeControls.prototype.setTilt = function(tilt) {
    sphericalDelta.phi = (tilt * Math.PI / 180 - this.getTiltRad());
    this.updateControls();
};

GlobeControls.prototype.setHeading = function(heading) {
    sphericalDelta.theta = (heading * Math.PI / 180 - this.getHeadingRad());
    this.updateControls();
};

GlobeControls.prototype.setCenter = function(position) {

    var center = globeTarget.position;

    snapShotCamera.shot(this.object);

    ptScreenClick.x = this.domElement.width / 2;
    ptScreenClick.y = this.domElement.height / 2;

    var vFrom = center.clone().normalize();
    var vTo = position.normalize();
    quatGlobe.setFromUnitVectors(vFrom, vTo);

    this.updateControls(CONTROL_STATE.MOVE_GLOBE);

};

GlobeControls.prototype.setRange = function(pRange) {

    scale = pRange / globeTarget.position.distanceTo(this.object.position);
    this.updateControls();

};


// TODO idea : remove this? used in API
GlobeControls.prototype.getRay = function() {

    var direction = new THREE.Vector3(0, 0, 1);
    this.object.localToWorld(direction);
    direction.sub(this.object.position).negate().normalize();

    return {
        origin: this.object.position,
        direction: direction
    };

};

GlobeControls.prototype.getTilt = function() {
    return spherical.phi * 180 / Math.PI;
};

GlobeControls.prototype.getHeading = function() {
    return spherical.theta * 180 / Math.PI;
};

// Same functions

GlobeControls.prototype.getTiltRad = function() {
    return spherical.phi;
};

GlobeControls.prototype.getHeadingRad = function() {
    return spherical.theta;
};

GlobeControls.prototype.getPolarAngle = function() {

    return spherical.phi;

};

GlobeControls.prototype.getAzimuthalAngle = function() {

    return spherical.theta;

};

// End API functions
// # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #


GlobeControls.prototype.reset = function() {

    // TODO not reset target globe

    state = CONTROL_STATE.NONE;

    this.target.copy(initialTarget);
    this.object.position.copy(initialPosition);
    this.object.zoom = initialZoom;

    this.object.updateProjectionMatrix();
    this.dispatchEvent(this.changeEvent);

    this.updateControls();

};


export default GlobeControls;
