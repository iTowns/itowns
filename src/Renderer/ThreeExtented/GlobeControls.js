// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

import * as THREE from 'THREE';
import Sphere from 'Core/Math/Sphere';
import CustomEvent from 'custom-event';

var selectClick = new CustomEvent('selectClick');

//TODO:
// Recast touch for globe
// Fix target problem with pan and panoramic (when target isn't on globe)
// Fix problem with space
// Add damping mouve
// Add real collision
// Animate move camera

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
    S: 83,
    D: 68
};

// private members

var space = false;
var EPS = 0.000001;

// Orbit
var rotateStart = new THREE.Vector2();
var rotateEnd = new THREE.Vector2();
var rotateDelta = new THREE.Vector2();

// Pan
var panStart = new THREE.Vector2();
var panEnd = new THREE.Vector2();
var panDelta = new THREE.Vector2();
var panOffset = new THREE.Vector3();

var offset = new THREE.Vector3();

// Dolly
var dollyStart = new THREE.Vector2();
var dollyEnd = new THREE.Vector2();
var dollyDelta = new THREE.Vector2();
var scale = 1;

// Orbit move
var spherical = new THREE.Spherical(1.0,0.01,0);
var sphericalDelta = new THREE.Spherical(1.0,0,0);

// Globe move
var quatGlobe = new THREE.Quaternion();
var globeTarget = new THREE.Object3D();
// Replace matrix float by matrix double
globeTarget.matrixWorld.elements = new Float64Array(16);
globeTarget.matrixWorldInverse = new THREE.Matrix4();
globeTarget.matrixWorldInverse.elements = new Float64Array(16);

var movingGlobeTarget = new THREE.Vector3();

// Pan Move
var panVector = new THREE.Vector3();

// Save last transformation
var lastPosition = new THREE.Vector3();
var lastQuaternion = new THREE.Quaternion();

// State control
var state = CONTROL_STATE.NONE;

// Initial transformation
var initialTarget;
var initialPosition;
var initialZoom;

// picking
var ptScreenClick = new THREE.Vector2();
var sizeRendering = new THREE.Vector2();

// Tangent sphere to ellispoid
var tSphere = new Sphere();
tSphere.picking = {position : new THREE.Vector3(),normal:new THREE.Vector3()};

// Special key
var keyCtrl = false;
var keyShift = false;
var keyS = false;
var keyD = false;

// Set to true to enable target helper
var enableTargetHelper = false;

// Handle Mouse
var _handlerMouseMove;
var _handlerMouseUp;

// Pseudo collision
var radiusCollision = 50;

var isFirstPoint = true;


// SnapCamera saves transformation's camera
// It's use to globe move
function SnapCamera(camera) {

    camera.updateMatrixWorld();

    this.matrixWorld = new THREE.Matrix4();
    this.projectionMatrix = new THREE.Matrix4();
    this.invProjectionMatrix = new THREE.Matrix4();
    this.position = new THREE.Vector3();

    this.matrixWorld.elements = new Float64Array(16);
    this.projectionMatrix.elements = new Float64Array(16);
    this.invProjectionMatrix.elements = new Float64Array(16);

    this.init = function(camera)
    {

        this.matrixWorld.elements.set(camera.matrixWorld.elements);
        this.projectionMatrix.elements.set(camera.projectionMatrix.elements);
        this.position.copy(camera.position);
        this.invProjectionMatrix.getInverse( this.projectionMatrix );
    };

    this.init(camera);

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

/* globals document,window */

function GlobeControls(camera, domElement, engine) {

    var scene = engine.scene;
    this.camera = camera;
    snapShotCamera =  new SnapCamera(camera);

    this.domElement = (domElement !== undefined) ? domElement : document;

    // Set to false to disable this control
    this.enabled = true;

    // This option actually enables dollying in and out; left as "zoom" for
    // backwards compatibility
    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    // Limits to how far you can dolly in and out ( PerspectiveCamera only )
    this.minDistance = radiusCollision;
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
    // TODO Warning minPolarAngle = 0.01 -> it isn't possible to be perpendicular on Globe
    this.minPolarAngle = 0.01; // radians
    this.maxPolarAngle = Math.PI; // radians

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    this.minAzimuthAngle = -Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    // Set to true to disable use of the keys
    this.enableKeys = true;

    if(enableTargetHelper)
    {
        this.pickingHelper = new THREE.AxisHelper( 500000 );
    }

    // Mouse buttons
    this.mouseButtons = {
        PANORAMIC: THREE.MOUSE.LEFT,
        ZOOM: THREE.MOUSE.MIDDLE,
        PAN: THREE.MOUSE.RIGHT
    };

    // Radius tangent sphere
    tSphere.setRadius(engine.size);
    spherical.radius = tSphere.radius;

    sizeRendering.set(engine.width,engine.height);

    // TODO: test before remove test code
    // so camera.up is the orbit axis
    //var quat = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
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

    //
    this.updateCamera = function(camera) {

        snapShotCamera.init(camera.camera3D);
        sizeRendering.width = camera.width;
        sizeRendering.height = camera.height;

    };

    this.getAutoRotationAngle = function() {

        return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;

    };

    this.getZoomScale  = function () {

        return Math.pow(0.95, this.zoomSpeed);

    };

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

        var te = this.camera.matrix.elements;

        // get X column of matrix
        panOffset.set(te[0], te[1], te[2]);
        panOffset.multiplyScalar(-distance);

        panVector.add(panOffset);

    };

    // pass in distance in world space to move up
    this.panUp = function(distance) {

        var te = this.camera.matrix.elements;

        // get Y column of matrix
        panOffset.set(te[4], te[5], te[6]);
        panOffset.multiplyScalar(distance);

        panVector.add(panOffset);

    };

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    this.pan = function(deltaX, deltaY) {

        var element = this.domElement === document ? this.domElement.body : this.domElement;

        if (this.camera instanceof THREE.PerspectiveCamera) {

            // perspective
            var position = this.camera.position;

            //var offset = position.clone().sub(this.target);
            var offset = position.clone().sub(globeTarget.position);

            var targetDistance = offset.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            this.panLeft(2 * deltaX * targetDistance / element.clientHeight);
            this.panUp(2 * deltaY * targetDistance / element.clientHeight);


        } else if (this.camera instanceof THREE.OrthographicCamera) {

            // orthographic
            this.panLeft(deltaX * (this.camera.right - this.camera.left) / element.clientWidth);
            this.panUp(deltaY * (this.camera.top - this.camera.bottom) / element.clientHeight);

        } else {

            // camera neither orthographic or perspective
            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - this.pan disabled.');

        }

    };

    this.dollyIn = function(dollyScale) {

        if (dollyScale === undefined) {

            dollyScale = this.getZoomScale();

        }

        if (this.camera instanceof THREE.PerspectiveCamera) {

            scale /= dollyScale;

        } else if (this.camera instanceof THREE.OrthographicCamera) {

            this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom * dollyScale));
            this.camera.updateProjectionMatrix();
            this.dispatchEvent(this.changeEvent);

        } else {

            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - dolly/zoom disabled.');

        }

    };

    this.dollyOut = function(dollyScale) {

        if (dollyScale === undefined) {

            dollyScale = this.getZoomScale();

        }

        if (this.camera instanceof THREE.PerspectiveCamera) {

            scale *= dollyScale;

        } else if (this.camera instanceof THREE.OrthographicCamera) {

            this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom / dollyScale));
            this.camera.updateProjectionMatrix();
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

    // introduction collision
    // Not use for the moment
    // eslint-disable-next-line
    var collision = function(position)
    {
        if(scene.getMap())
        {
            var coord = scene.getMap().projection.cartesianToGeo(position);
            var bbox = scene.getMap().getTile(coord).bbox;
            var delta = coord.altitude()  - (bbox.top() + radiusCollision);

            if (delta < 0) {
                position.setLength(position.length()-delta);
            }
        }

        return position;
    };

    var offGT = new THREE.Vector3();
    var quaterPano = new THREE.Quaternion();
    var quaterAxis = new THREE.Quaternion();
    var axisX = new THREE.Vector3(1, 0, 0);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    var update = function() {

        if (state === CONTROL_STATE.MOVE_GLOBE) {
            offset.copy(snapShotCamera.position);
        } else {
            // get camera position
            offset.copy(this.camera.position);
            // transform to local globeTarget
            offset.applyMatrix4( globeTarget.matrixWorldInverse );
        }

        offGT.copy(globeTarget.position);

        if (state === CONTROL_STATE.MOVE_GLOBE) {

            offGT.applyQuaternion(quatGlobe);
            movingGlobeTarget.copy(offGT);
            this.camera.position.copy(offset.applyQuaternion(quatGlobe));
            this.camera.up.copy(offGT.clone().normalize());

        }
        else if(state === CONTROL_STATE.PAN)
        {
            this.camera.position.add( panVector );
            globeTarget.position.add( panVector );
            globeTarget.updateMatrixWorld();
            globeTarget.matrixWorldInverse.getInverse(globeTarget.matrixWorld);
            offGT.copy(globeTarget.position);
        }
        else if (state !== CONTROL_STATE.PANORAMIC) {

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

            offset.setFromSpherical( spherical );

            //rotate point back to "camera-up-vector-is-up" space
            //offset.applyQuaternion( quatInverse );

            var newPosition = globeTarget.localToWorld(offset.clone());

            this.camera.position.copy(newPosition);

            // TODO: there's problem when the cameran looks at perpendicular
            // -->
            // if(state === CONTROL_STATE.PAN)
            //     this.camera.up.copy(this.camera.position.clone().normalize());
            // <--
        }

        if (state === CONTROL_STATE.PANORAMIC) {

            this.camera.worldToLocal(movingGlobeTarget);
            var normal = this.camera.position.clone().normalize().applyQuaternion(this.camera.quaternion.clone().inverse());
            quaterPano.setFromAxisAngle(normal, sphericalDelta.theta).multiply(quaterAxis.setFromAxisAngle(axisX, sphericalDelta.phi));
            movingGlobeTarget.applyQuaternion(quaterPano);
            this.camera.localToWorld(movingGlobeTarget);
            this.camera.up.copy(movingGlobeTarget.clone().normalize());
            this.camera.lookAt(movingGlobeTarget);

        } else {
            this.camera.lookAt(offGT); // Usual CASE (not rotating around camera axe)
        }

        quatGlobe.set(0, 0, 0, 1);
        sphericalDelta.theta = 0;
        sphericalDelta.phi = 0;
        scale = 1;
        panVector.set(0, 0, 0);

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (lastPosition.distanceToSquared(this.camera.position) > EPS || 8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > EPS) {

            this.dispatchEvent(this.changeEvent);

            lastPosition.copy(this.camera.position);
            lastQuaternion.copy(this.camera.quaternion);

        }
    }.bind(this);

    this.getSpace = function() {
        return space;
    };


    this.getSphericalDelta = function() {
        return sphericalDelta;
    };

    // Position object on globe
    var positionObject = function()
    {
        var quaterionX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        return function(newPosition,object)
        {
            object.position.copy(newPosition);
            object.lookAt(newPosition.clone().multiplyScalar(1.1));
            object.quaternion.multiply(quaterionX);
            object.updateMatrixWorld();
        };
    }();

    // set new globe target
    var setGlobleTarget = function(newPosition) { // Compute the new target center position

        positionObject(newPosition,globeTarget);

        globeTarget.matrixWorldInverse.getInverse(globeTarget.matrixWorld);

    };

    var cT = new THREE.Vector3();
    // update globe target
    var updateGlobeTarget = function() {

        // Get distance camera DME
        var distanceTarget = Math.floor(getPickingPosition().distanceTo(this.camera.position));

        // Position movingGlobeTarget on DME

        // TODO: error accuracy with this old method : why? : matrix world inverse
        // this.camera.worldToLocal(movingGlobeTarget);
        // movingGlobeTarget.setLength(distanceTarget);
        // this.camera.localToWorld(movingGlobeTarget);

        cT.subVectors(movingGlobeTarget,this.camera.position);
        cT.setLength(distanceTarget);
        movingGlobeTarget.addVectors(this.camera.position,cT);

        // set new globe target
        setGlobleTarget(movingGlobeTarget);

        // update spherical from target
        offset.copy(this.camera.position);
        offset.applyMatrix4(globeTarget.matrixWorldInverse);
        spherical.setFromVector3(offset);

    };

    // Update helper
    var updateHelper = enableTargetHelper ?  function(position,helper){

         positionObject(position,helper);
         this.dispatchEvent(this.changeEvent);

    } : function(){};

    this.getPickingPositionOnSphere = function() {

        return tSphere.picking.position;
    };

    // Update radius's sphere : the sphere must cross the point
    // Return intersection with mouse and sphere
    var updateSpherePicking = function() {

        var mouse = new THREE.Vector2();
        var ray = new THREE.Ray();

        return function(point,screenCoord){

            tSphere.setRadius(point.length());

            mouse.x = (screenCoord.x / sizeRendering.width) * 2 - 1;
            mouse.y = -(screenCoord.y / sizeRendering.height) * 2 + 1;

            snapShotCamera.updateRay(ray,mouse);
            // pick position on tSphere
            tSphere.picking.position.copy(tSphere.intersectWithRayNoMiss(ray));
            tSphere.picking.normal = tSphere.picking.position.clone().normalize();

            updateHelper.bind(this)(tSphere.picking.position,this.pickingHelper);
        };

    }.bind(this)();

    var onMouseMove = function() {

        var ray = new THREE.Ray();
        var mouse = new THREE.Vector2();

        return function(event)
        {

            if (this.enabled === false) return;

            event.preventDefault();

            if (state === CONTROL_STATE.ORBIT || state === CONTROL_STATE.PANORAMIC) {

                if (this.enableRotate === false) return;

                rotateEnd.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
                rotateDelta.subVectors(rotateEnd, rotateStart);

                // rotating across whole screen goes 360 degrees around
                if (!space) {
                    this.rotateLeft(2 * Math.PI * rotateDelta.x / sizeRendering.width * this.rotateSpeed);

                    // rotating up and down along whole screen attempts to go 360, but limited to 180
                    this.rotateUp(2 * Math.PI * rotateDelta.y / sizeRendering.height * this.rotateSpeed);

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

                mouse.x = ((event.clientX - event.target.offsetLeft) / sizeRendering.width) * 2 - 1;
                mouse.y = -((event.clientY - event.target.offsetTop) / sizeRendering.height) * 2 + 1;

                snapShotCamera.updateRay(ray,mouse);

                var intersection = tSphere.intersectWithRayNoMiss(ray);

                if (intersection)
                    quatGlobe.setFromUnitVectors(intersection.normalize(), tSphere.picking.normal);
            }

            if (state !== CONTROL_STATE.NONE)
                update();

        };

    }();

    var onMouseDown = function(event) {

        if (this.enabled === false) return;
        event.preventDefault();

        quatGlobe.set(0, 0, 0, 1);

        snapShotCamera.shot(this.camera);

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

                snapShotCamera.shot(this.camera);

                ptScreenClick.x = event.clientX - event.target.offsetLeft;
                ptScreenClick.y = event.clientY - event.target.offsetTop;

                var point = getPickingPosition(ptScreenClick);

                // update tangent sphere which passes through the point
                if (point)
                    updateSpherePicking.bind(this)(point,ptScreenClick);

                if (keyD) {
                    scene.setDetailedFeatureParameters(point, isFirstPoint);
                    isFirstPoint = !isFirstPoint;
                }
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

    };

    var onDblClick = function()
    {
        // state = CONTROL_STATE.ORBIT;
        // scale = 0.3333;
        // update();
        // state = CONTROL_STATE.NONE;
    };

    var onMouseUp = function( /* event */ ) {

        if (this.enabled === false) return;

        this.domElement.removeEventListener('mousemove', _handlerMouseMove, false);
        this.domElement.removeEventListener('mouseup', _handlerMouseUp, false);
        this.dispatchEvent(this.endEvent);

        if(state === CONTROL_STATE.PAN)
            movingGlobeTarget.copy(globeTarget.position);

        updateGlobeTarget.bind(this)();
        state = CONTROL_STATE.NONE;
    };

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

    };

    var onKeyUp = function ( /*event*/ ) {

        if (this.enabled === false || this.enableKeys === false || this.enablePan === false) return;

        if(state === CONTROL_STATE.PAN)
        {
            movingGlobeTarget.copy(globeTarget.position);
            updateGlobeTarget.bind(this)();
            state = CONTROL_STATE.NONE;
        }

        keyCtrl = false;
        keyShift = false;
        keyS = false;
        keyD = false;
    };

    var panUpdate = function(deltaX,deltaY) {
        this.pan(deltaX,deltaY);
        state = CONTROL_STATE.PAN;
        update();
    };

    var onKeyDown = function(event) {

        if (this.enabled === false || this.enableKeys === false || this.enablePan === false) return;
        keyCtrl = false;
        keyShift = false;

        switch (event.keyCode) {
            case CONTROL_KEYS.UP:
                panUpdate.bind(this)(0, this.keyPanSpeed);
                break;
            case CONTROL_KEYS.BOTTOM:
                panUpdate.bind(this)(0, -this.keyPanSpeed);
                break;
            case CONTROL_KEYS.LEFT:
                panUpdate.bind(this)(this.keyPanSpeed, 0);
                break;
            case CONTROL_KEYS.RIGHT:
                panUpdate.bind(this)(-this.keyPanSpeed, 0);
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
            case CONTROL_KEYS.D:
                keyD = true;
                break;
        }
    };

    var onTouchStart = function(event) {

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

    };

    var onTouchMove = function(event) {

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

    };

    var onTouchEnd= function( /* event */ ) {

        if (this.enabled === false) return;

        this.dispatchEvent(this.endEvent);
        state = CONTROL_STATE.NONE;
        keyCtrl = false;
        keyShift = false;
        keyS = false;
        keyD = false;

    };

    // update object camera position
    this.updateCameraTransformation = function(controlState)
    {
        state = controlState || CONTROL_STATE.ORBIT;
        update();
        state = CONTROL_STATE.NONE;
        updateGlobeTarget.bind(this)();
    };

    this.dispose = function() {

        //this.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
        this.domElement.removeEventListener( 'mousedown', onMouseDown, false );
        this.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
        this.domElement.removeEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

        this.domElement.removeEventListener( 'touchstart', onTouchStart, false );
        this.domElement.removeEventListener( 'touchend', onTouchEnd, false );
        this.domElement.removeEventListener( 'touchmove', onTouchMove, false );

        this.domElement.removeEventListener( 'mousemove', onMouseMove, false );
        this.domElement.removeEventListener( 'mouseup', onMouseUp, false );

        window.removeEventListener( 'keydown', onKeyDown, false );

        //this.dispatchEvent( { type: 'dispose' } ); // should this be added here?

    };

    // Instance all
    this.domElement.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    }, false);
    this.domElement.addEventListener('mousedown', onMouseDown.bind(this), false);
    this.domElement.addEventListener('mousewheel', onMouseWheel.bind(this), false);
    this.domElement.addEventListener("dblclick", onDblClick.bind(this), false);
    this.domElement.addEventListener('DOMMouseScroll', onMouseWheel.bind(this), false); // firefox

    this.domElement.addEventListener('touchstart', onTouchStart.bind(this), false);
    this.domElement.addEventListener('touchend', onTouchEnd.bind(this), false);
    this.domElement.addEventListener('touchmove', onTouchMove.bind(this), false);

    // TODO: Why windows
    window.addEventListener('keydown', onKeyDown.bind(this), false);
    window.addEventListener('keyup', onKeyUp.bind(this), false);

    // Initialisation Globe Target and movingGlobeTarget
    var positionTarget = new THREE.Vector3().copy(camera.position).setLength(tSphere.radius);
    setGlobleTarget(positionTarget);
    movingGlobeTarget.copy(positionTarget);
    this.camera.up.copy(positionTarget.normalize());

    update();

    engine.scene3D.add(globeTarget);

    if(enableTargetHelper) {
        globeTarget.add( new THREE.AxisHelper( 500000 ));
        engine.scene3D.add(this.pickingHelper);
    }

    // Start position
    initialTarget = globeTarget.clone();
    initialPosition = this.camera.position.clone();
    initialZoom = this.camera.zoom;

    _handlerMouseMove = onMouseMove.bind(this);
    _handlerMouseUp = onMouseUp.bind(this);

}

GlobeControls.prototype = Object.create(THREE.EventDispatcher.prototype);
GlobeControls.prototype.constructor = GlobeControls;

// # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
// API Function

GlobeControls.prototype.setTilt = function(tilt) {
    sphericalDelta.phi = (tilt * Math.PI / 180 - this.getTiltRad());
    this.updateCameraTransformation();
};

GlobeControls.prototype.setHeading = function(heading) {
    sphericalDelta.theta = (heading * Math.PI / 180 - this.getHeadingRad());
    this.updateCameraTransformation();
};

GlobeControls.prototype.setCenter = function(position) {

    var center = globeTarget.position;

    snapShotCamera.shot(this.camera);

    ptScreenClick.x = this.domElement.width / 2;
    ptScreenClick.y = this.domElement.height / 2;

    var vFrom = center.clone().normalize();
    var vTo = position.normalize();
    quatGlobe.setFromUnitVectors(vFrom, vTo);

    this.updateCameraTransformation(CONTROL_STATE.MOVE_GLOBE);

};

GlobeControls.prototype.setRange = function(pRange) {

    scale = pRange / globeTarget.position.distanceTo(this.camera.position);
    this.updateCameraTransformation();

};


// TODO idea : remove this? used in API
GlobeControls.prototype.getRay = function() {

    var direction = new THREE.Vector3(0, 0, 1);
    this.camera.localToWorld(direction);
    direction.sub(this.camera.position).negate().normalize();

    return {
        origin: this.camera.position,
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

GlobeControls.prototype.moveTarget = function() {

    return movingGlobeTarget;

};

// End API functions
// # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

GlobeControls.prototype.reset = function() {

    // TODO not reset target globe

    state = CONTROL_STATE.NONE;

    this.target.copy(initialTarget);
    this.camera.position.copy(initialPosition);
    this.camera.zoom = initialZoom;

    this.camera.updateProjectionMatrix();
    this.dispatchEvent(this.changeEvent);

    this.updateCameraTransformation();

};

export default GlobeControls;
