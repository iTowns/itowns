// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

import THREE from 'three';

function GlobeControls(object, domElement, engine) {

    this.object = object;
    this.cloneObject = object.clone();

    this.domElement = (domElement !== undefined) ? domElement : document;
    // API

    // Set to false to disable this control
    this.enabled = true;

    // "target" sets the location of focus, where the control orbits around
    // and where it pans with respect to.
    this.target = new THREE.Vector3();

    this.engine = engine;

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
    this.keyPanSpeed = 7.0; // pixels moved per arrow key push

    // Set to true to automatically rotate around the target
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    // TODO ATTENTION trick pas correct minPolarAngle = 0.01
    this.minPolarAngle = 0.01; // radians
    this.maxPolarAngle = Math.PI; // radians

    this.radius = null;
    this.theta = null;
    this.phi = null;

    this.time = 0;
    //var timeStart = 500;

    this.ptScreenClick = new THREE.Vector2();
    var pickOnGlobe = new THREE.Vector3();
    var pickOnGlobeNorm = new THREE.Vector3();
    var rayonPointGlobe = engine.size;
    var raycaster = new THREE.Raycaster();

    // How far you can orbit horizontally, upper and lower limits.
    // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
    this.minAzimuthAngle = -Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    // Set to true to disable use of the keys
    this.noKeys = false;

    // The four arrow keys
    this.keys = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        BOTTOM: 40,
        SPACE: 32,
        SHIFT: 16,
        CTRL: 17,
        S: 83
    };

    // Mouse buttons
    this.mouseButtons = {
        PANORAMIC: THREE.MOUSE.LEFT,
        ZOOM: THREE.MOUSE.MIDDLE,
        PAN: THREE.MOUSE.RIGHT
    };

    this.globeTargetX = new THREE.Vector3(1000, 1000, 1000);

    this.keyCtrl = false;
    this.keyShift = false;
    this.keyS = false;


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

    var theta = null;
    var phi = null;
    var phiDelta = 0;
    var thetaDelta = 0;
    var quatGlobe = new THREE.Quaternion();

    var scale = 1;
    var pan = new THREE.Vector3();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    var STATE = {
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

    var state = STATE.NONE;

    // for reset

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.zoom0 = this.object.zoom;

    // so camera.up is the orbit axis

    //var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    //var quatInverse = quat.clone().inverse();

    // events

    var changeEvent = {
        type: 'change'
    };
    var startEvent = {
        type: 'start'
    };
    var endEvent = {
        type: 'end'
    };

    this.getPointGlobe = function() {
        return pickOnGlobe;
    };

    this.setPointGlobe = function(point) {

        rayonPointGlobe = point.length();

        var mouse = new THREE.Vector2();

        mouse.x = (this.ptScreenClick.x / this.domElement.clientWidth) * 2 - 1;
        mouse.y = -(this.ptScreenClick.y / this.domElement.clientHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, this.cloneObject);

        var intersection = this.intersectSphere(raycaster.ray);

        pickOnGlobe.copy(intersection);

        // pick position on sphere
        pickOnGlobeNorm = pickOnGlobe.clone().normalize();

    };

    this.intersectSphere = function(ray) {

        var c = new THREE.Vector3();
        var pc = ray.closestPointToPoint(c);
        var r = rayonPointGlobe;
        var a = pc.length();

        if (a > r)
            return undefined; // new THREE.Vector3();


        if (ray.origin.length() > rayonPointGlobe) {
            var d = ray.direction.clone();
            var b = Math.sqrt(r * r - a * a);
            d.setLength(b);

            return new THREE.Vector3().subVectors(pc, d);
        } else
            return undefined;

    };

    this.toSpherical = function(point) {
        var pTheta = Math.atan2(point.x, point.z);
        var pPhi = Math.atan2(Math.sqrt(point.x * point.x + point.z * point.z), point.y);

        return new THREE.Vector2(pTheta, pPhi);

    };

    this.rotateLeft = function(angle) {

        if (angle === undefined) {

            angle = getAutoRotationAngle();

        }

        thetaDelta -= angle;

    };

    this.rotateUp = function(angle) {

        if (angle === undefined) {

            angle = getAutoRotationAngle();

        }

        phiDelta -= angle;

    };

    // pass in distance in world space to move left
    this.panLeft = function(distance) {

        var te = this.object.matrix.elements;

        // get X column of matrix
        panOffset.set(te[0], te[1], te[2]);
        panOffset.multiplyScalar(-distance);

        pan.add(panOffset);

    };

    // pass in distance in world space to move up
    this.panUp = function(distance) {

        var te = this.object.matrix.elements;

        // get Y column of matrix
        panOffset.set(te[4], te[5], te[6]);
        panOffset.multiplyScalar(distance);

        pan.add(panOffset);

    };

    // pass in x,y of change desired in pixel space,
    // right and down are positive
    this.pan = function(deltaX, deltaY) {

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        if (scope.object instanceof THREE.PerspectiveCamera) {

            // perspective
            var position = scope.object.position;
            var offset = position.clone().sub(scope.target);
            var targetDistance = offset.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

            // we actually don't use screenWidth, since perspective camera is fixed to screen height
            scope.panLeft(2 * deltaX * targetDistance / element.clientHeight);
            scope.panUp(2 * deltaY * targetDistance / element.clientHeight);

        } else if (scope.object instanceof THREE.OrthographicCamera) {

            // orthographic
            scope.panLeft(deltaX * (scope.object.right - scope.object.left) / element.clientWidth);
            scope.panUp(deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight);

        } else {

            // camera neither orthographic or perspective
            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - pan disabled.');

        }

    };

    this.dollyIn = function(dollyScale) {

        if (dollyScale === undefined) {

            dollyScale = getZoomScale();

        }

        if (scope.object instanceof THREE.PerspectiveCamera) {

            scale /= dollyScale;

        } else if (scope.object instanceof THREE.OrthographicCamera) {

            scope.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
            scope.object.updateProjectionMatrix();
            scope.dispatchEvent(changeEvent);

        } else {

            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - dolly/zoom disabled.');

        }

    };

    this.dollyOut = function(dollyScale) {

        if (dollyScale === undefined) {

            dollyScale = getZoomScale();

        }

        if (scope.object instanceof THREE.PerspectiveCamera) {

            scale *= dollyScale;

        } else if (scope.object instanceof THREE.OrthographicCamera) {

            scope.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
            scope.object.updateProjectionMatrix();
            scope.dispatchEvent(changeEvent);

        } else {

            //console.warn('WARNING: GlobeControls.js encountered an unknown camera type - dolly/zoom disabled.');

        }

    };


    this.updateTarget = function() {
        if (!space) {
            this.target = new THREE.Vector3();
        } else {
            var target = this.object.position.clone().setLength(2);

            this.target = new THREE.Vector3().subVectors(this.object.position, target);

            this.object.lookAt(this.target);
        }
    };

    this.rot = function(point, lscale) {


        // angle from z-axis around y-axis

        theta = Math.atan2(point.x, point.z);

        // angle from y-axis

        phi = Math.atan2(Math.sqrt(point.x * point.x + point.z * point.z), point.y);

        if (this.autoRotate && state === STATE.NONE) {

            this.rotateLeft(getAutoRotationAngle());

        }

        theta += thetaDelta;
        phi += phiDelta;

        // restrict theta to be between desired limits
        theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, theta));

        // restrict phi to be between desired limits
        phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));
        var radius = point.length() * lscale;

        // restrict phi to be betwee EPS and PI-EPS
        phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));

        // restrict radius to be between desired limits
        radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));

        // move target to panned location
        //this.target.add( pan );

        point.x = radius * Math.sin(phi) * Math.sin(theta);
        point.y = radius * Math.cos(phi);
        point.z = radius * Math.sin(phi) * Math.cos(theta);

        //console.log(theta + ' - ' + phi);

    };

    this.setRange = function(pRange) {

        scale = pRange / this.globeTarget.position.distanceTo(this.object.position);
        state = STATE.ORBIT;
        this.update();
        state = STATE.NONE;
        newTarget();
    };

    this.getRay = function() {

        var direction = new THREE.Vector3(0, 0, 1);
        object.localToWorld(direction);
        direction.sub(object.position).negate().normalize();


        return {
            origin: object.position,
            direction: direction
        };

    };

    this.getTilt = function() {
        return phi * 180 / Math.PI;
    };

    this.getHeading = function() {
        return theta * 180 / Math.PI;
    };

    this.getTiltRad = function() {
        return phi;
    };

    this.getHeadingRad = function() {
        return theta;
    };

    this.setTilt = function(tilt) {
        phiDelta = (tilt * Math.PI / 180 - this.getTiltRad());
        state = STATE.ORBIT;
        this.update();
        state = STATE.NONE;
    };

    this.setHeading = function(heading) {
        thetaDelta = (heading * Math.PI / 180 - this.getHeadingRad());
        state = STATE.ORBIT;
        this.update();
        state = STATE.NONE;
    };

    this.setCenter = function(position) {

        var center = this.globeTarget.position;
        this.object.updateMatrixWorld();
        this.cloneObject = this.object.clone();
        this.ptScreenClick.x = this.domElement.width / 2;
        this.ptScreenClick.y = this.domElement.height / 2;
        this.setPointGlobe(center);
        var vFrom = center.clone().normalize();
        var vTo = position.normalize();
        quatGlobe.setFromUnitVectors(vFrom, vTo);
        state = STATE.MOVE_GLOBE;
        this.update();
        newTarget();
        state = STATE.NONE;
    };

    this.update = function() {


        var position = (state === STATE.MOVE_GLOBE) ? this.cloneObject.position : this.object.position;

        if (state === STATE.MOVE_GLOBE) {
            offset.copy(position);
        } else {
            offset.copy(this.globeTarget.worldToLocal(position.clone()));
        }

        var offGT = this.globeTarget.position.clone();

        if (state === STATE.MOVE_GLOBE) {
            offGT.applyQuaternion(quatGlobe);
            this.moveTarget.copy(offGT);
            this.object.position.copy(offset.applyQuaternion(quatGlobe));
            this.object.up.copy(offGT.clone().normalize());

        } else if (state !== STATE.PANORAMIC) {

            //offset.applyQuaternion( quat );
            this.rot(offset, scale);
            // rotate point back to "camera-up-vector-is-up" space
            //offset.applyQuaternion( quatInverse );

            this.object.position.copy(this.globeTarget.localToWorld(offset.clone()));

        }

        if (state === STATE.PANORAMIC) {

            this.object.worldToLocal(this.moveTarget);
            var normal = this.object.position.clone().normalize().applyQuaternion(this.object.quaternion.clone().inverse());
            var quaternion = new THREE.Quaternion().setFromAxisAngle(normal, thetaDelta);
            quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), phiDelta));
            this.moveTarget.applyQuaternion(quaternion);
            this.object.localToWorld(this.moveTarget);
            this.object.up.copy(this.moveTarget.clone().normalize());
            this.object.lookAt(this.moveTarget);

        } else {
            this.object.lookAt(offGT); // Usual CASE (not rotating around camera axe)
        }

        quatGlobe.set(0, 0, 0, 1);
        thetaDelta = 0;
        phiDelta = 0;
        scale = 1;
        pan.set(0, 0, 0);

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (lastPosition.distanceToSquared(this.object.position) > EPS || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {

            this.dispatchEvent(changeEvent);

            lastPosition.copy(this.object.position);
            lastQuaternion.copy(this.object.quaternion);

        }
    };

    this.getSpace = function() {
        return space;
    };

    this.reset = function() {

        state = STATE.NONE;

        this.target.copy(this.target0);
        this.object.position.copy(this.position0);
        this.object.zoom = this.zoom0;

        this.object.updateProjectionMatrix();
        this.dispatchEvent(changeEvent);

        this.update();

    };

    this.getPolarAngle = function() {

        return phi;

    };

    this.getAzimuthalAngle = function() {

        return theta;

    };

    function getAutoRotationAngle() {

        return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

    }

    function getZoomScale() {

        return Math.pow(0.95, scope.zoomSpeed);

    }

    function onMouseDown(event) {

        if (scope.enabled === false) return;
        event.preventDefault();

        quatGlobe.set(0, 0, 0, 1);

        if (event.button === scope.mouseButtons.PANORAMIC) {
            if (scope.noRotate === true) return;

            if (scope.keyCtrl) {
                state = STATE.ORBIT;
            } else if (scope.keyShift) {
                state = STATE.PANORAMIC;
            } else if (scope.keyS) {

                // If the key 'S' is down, the engine selects node under mouse
                var mouse = new THREE.Vector2(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
                scope.engine.selectNodeAt(mouse);
                scope.engine.update();

            } else {

                state = STATE.MOVE_GLOBE;

                scope.object.updateMatrixWorld();
                scope.cloneObject = scope.object.clone();
                scope.ptScreenClick.x = event.clientX - event.target.offsetLeft;
                scope.ptScreenClick.y = event.clientY - event.target.offsetTop;

                var point = scope.engine.getPickingPositionFromDepth(scope.ptScreenClick);

                scope.engine.renderScene();

                // calcul de la sphere qui passe par ce point
                if (point)
                    scope.setPointGlobe(point);

            }

            rotateStart.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);


        } else if (event.button === scope.mouseButtons.ZOOM) {
            if (scope.noZoom === true) return;

            state = STATE.DOLLY;

            dollyStart.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);

        } else if (event.button === scope.mouseButtons.PAN) {
            if (scope.noPan === true) return;

            state = STATE.PAN;

            panStart.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);

        }


        if (state !== STATE.NONE) {
            domElement.addEventListener('mousemove', onMouseMove, false);
            domElement.addEventListener('mouseup', onMouseUp, false);
            scope.dispatchEvent(startEvent);
        }

    }

    function onMouseMove(event) {

        if (scope.enabled === false) return;

        event.preventDefault();

        //var element = scope.domElement === document ? scope.domElement.body.viewerDiv : scope.domElement;

        if (state === STATE.ORBIT || state === STATE.PANORAMIC) {

            if (scope.noRotate === true) return;

            rotateEnd.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
            rotateDelta.subVectors(rotateEnd, rotateStart);

            // rotating across whole screen goes 360 degrees around
            if (!space) {
                scope.rotateLeft(2 * Math.PI * rotateDelta.x / scope.domElement.clientWidth * scope.rotateSpeed);

                // rotating up and down along whole screen attempts to go 360, but limited to 180
                scope.rotateUp(2 * Math.PI * rotateDelta.y / scope.domElement.clientHeight * scope.rotateSpeed);

            } else {

                scope.rotateLeft(rotateDelta.x);

                // rotating up and down along whole screen attempts to go 360, but limited to 180
                scope.rotateUp(rotateDelta.y);
            }


            rotateStart.copy(rotateEnd);

        } else if (state === STATE.DOLLY) {

            if (scope.noZoom === true) return;

            dollyEnd.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
            dollyDelta.subVectors(dollyEnd, dollyStart);

            if (dollyDelta.y > 0) {

                scope.dollyIn();

            } else if (dollyDelta.y < 0) {

                scope.dollyOut();

            }

            dollyStart.copy(dollyEnd);

        } else if (state === STATE.PAN) {

            if (scope.noPan === true) return;

            panEnd.set(event.clientX - event.target.offsetLeft, event.clientY - event.target.offsetTop);
            panDelta.subVectors(panEnd, panStart);

            scope.pan(panDelta.x, panDelta.y);

            panStart.copy(panEnd);

        } else if (state === STATE.MOVE_GLOBE) {

            var mouse = new THREE.Vector2();

            mouse.x = ((event.clientX - event.target.offsetLeft) / domElement.clientWidth) * 2 - 1;
            mouse.y = -((event.clientY - event.target.offsetTop) / domElement.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, scope.cloneObject);

            var intersection = scope.intersectSphere(raycaster.ray);

            if (intersection)

                quatGlobe.setFromUnitVectors(intersection.normalize(), pickOnGlobeNorm);

        }

        if (state !== STATE.NONE) scope.update();

    }

    function newTarget() {
        // Update target camera {START}

        var positionTarget = scope.engine.getPickingPositionFromDepth();
        scope.engine.renderScene();
        var distanceTarget = positionTarget.distanceTo(scope.object.position);

        scope.object.worldToLocal(scope.moveTarget);
        scope.moveTarget.setLength(distanceTarget);
        scope.object.localToWorld(scope.moveTarget);
        computeTarget();
        // Update target camera  {END}
    }

    function onMouseUp( /* event */ ) {

        if (scope.enabled === false) return;

        domElement.removeEventListener('mousemove', onMouseMove, false);
        domElement.removeEventListener('mouseup', onMouseUp, false);
        scope.dispatchEvent(endEvent);

        newTarget();
        state = STATE.NONE;

    }

    function onMouseWheel(event) {

        if (scope.enabled === false || scope.noZoom === true || state !== STATE.NONE) return;

        event.preventDefault();
        event.stopPropagation();

        var delta = 0;

        if (event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9

            delta = event.wheelDelta;

        } else if (event.detail !== undefined) { // Firefox

            delta = -event.detail;

        }

        if (delta > 0) {

            scope.dollyOut();

        } else if (delta < 0) {

            scope.dollyIn();

        }

        scope.update();
        scope.dispatchEvent(startEvent);
        scope.dispatchEvent(endEvent);

    }

    function onKeyUp( /*event*/ ) {

        if (scope.enabled === false || scope.noKeys === true || scope.noPan === true) return;

        scope.keyCtrl = false;
        scope.keyShift = false;
        scope.keyS = false;

    }

    function onKeyDown(event) {


        if (scope.enabled === false || scope.noKeys === true || scope.noPan === true) return;
        scope.keyCtrl = false;
        scope.keyShift = false;

        switch (event.keyCode) {

            case scope.keys.UP:
                scope.pan(0, scope.keyPanSpeed);
                scope.update();
                break;

            case scope.keys.BOTTOM:
                scope.pan(0, -scope.keyPanSpeed);
                scope.update();
                break;

            case scope.keys.LEFT:
                scope.pan(scope.keyPanSpeed, 0);
                scope.update();
                break;

            case scope.keys.RIGHT:
                scope.pan(-scope.keyPanSpeed, 0);
                scope.update();
                break;
            case scope.keys.SPACE:
                space = !space;
                scope.updateTarget();
                scope.update();
                break;
            case scope.keys.CTRL:
                //computeVectorUp();
                scope.keyCtrl = true;
                break;
            case scope.keys.SHIFT:
                //computeVectorUp();
                scope.keyShift = true;
                break;
            case scope.keys.S:
                // WARNING loop !!!
                scope.keyS = true;
                break;

        }
    }

    function touchstart(event) {

        if (scope.enabled === false) return;

        switch (event.touches.length) {

            case 1: // one-fingered touch: rotate

                if (scope.noRotate === true) return;

                state = STATE.TOUCH_ROTATE;

                rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
                break;

            case 2: // two-fingered touch: dolly

                if (scope.noZoom === true) return;

                state = STATE.TOUCH_DOLLY;

                var dx = event.touches[0].pageX - event.touches[1].pageX;
                var dy = event.touches[0].pageY - event.touches[1].pageY;
                var distance = Math.sqrt(dx * dx + dy * dy);
                dollyStart.set(0, distance);
                break;

            case 3: // three-fingered touch: pan

                if (scope.noPan === true) return;

                state = STATE.TOUCH_PAN;

                panStart.set(event.touches[0].pageX, event.touches[0].pageY);
                break;

            default:

                state = STATE.NONE;

        }

        if (state !== STATE.NONE) scope.dispatchEvent(startEvent);

    }

    function touchmove(event) {

        if (scope.enabled === false) return;

        event.preventDefault();
        event.stopPropagation();

        var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

        switch (event.touches.length) {

            case 1: // one-fingered touch: rotate

                if (scope.noRotate === true) return;
                if (state !== STATE.TOUCH_ROTATE) return;

                rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                rotateDelta.subVectors(rotateEnd, rotateStart);

                // rotating across whole screen goes 360 degrees around
                scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);
                // rotating up and down along whole screen attempts to go 360, but limited to 180
                scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

                rotateStart.copy(rotateEnd);

                scope.update();
                break;

            case 2: // two-fingered touch: dolly

                if (scope.noZoom === true) return;
                if (state !== STATE.TOUCH_DOLLY) return;

                var dx = event.touches[0].pageX - event.touches[1].pageX;
                var dy = event.touches[0].pageY - event.touches[1].pageY;
                var distance = Math.sqrt(dx * dx + dy * dy);

                dollyEnd.set(0, distance);
                dollyDelta.subVectors(dollyEnd, dollyStart);

                if (dollyDelta.y > 0) {

                    scope.dollyOut();

                } else if (dollyDelta.y < 0) {

                    scope.dollyIn();

                }

                dollyStart.copy(dollyEnd);

                scope.update();
                break;

            case 3: // three-fingered touch: pan

                if (scope.noPan === true) return;
                if (state !== STATE.TOUCH_PAN) return;

                panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
                panDelta.subVectors(panEnd, panStart);

                scope.pan(panDelta.x, panDelta.y);

                panStart.copy(panEnd);

                scope.update();
                break;

            default:

                state = STATE.NONE;

        }

    }

    function touchend( /* event */ ) {

        if (scope.enabled === false) return;

        scope.dispatchEvent(endEvent);
        state = STATE.NONE;
        scope.keyCtrl = false;
        scope.keyShift = false;
        scope.keyS = false;

    }

    function computeTarget() { // Compute the new target center position

        scope.globeTarget.position.copy(scope.moveTarget);
        scope.globeTarget.lookAt(scope.moveTarget.clone().multiplyScalar(2));
        scope.globeTarget.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
        scope.globeTarget.updateMatrixWorld();

    }

    this.domElement.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    }, false);
    this.domElement.addEventListener('mousedown', onMouseDown, false);
    this.domElement.addEventListener('mousewheel', onMouseWheel, false);
    this.domElement.addEventListener('DOMMouseScroll', onMouseWheel, false); // firefox

    this.domElement.addEventListener('touchstart', touchstart, false);
    this.domElement.addEventListener('touchend', touchend, false);
    this.domElement.addEventListener('touchmove', touchmove, false);

    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);

    // force an update at start

    this.globeTarget = new THREE.Object3D();
    this.moveTarget = new THREE.Vector3();
    thetaDelta = 0;
    phiDelta = 0;

    this.update();

    var ray = new THREE.Ray(this.object.position, this.object.position.clone().normalize().negate());

    this.moveTarget = this.intersectSphere(ray);

    computeTarget();

    state = STATE.MOVE_GLOBE;
    this.update();

    state = STATE.ORBIT;

    // TODO à Simplifier

    this.update();
    thetaDelta = -theta;
    this.update();
    state = STATE.NONE;

    this.engine.scene3D.add(this.globeTarget);
    //this.globeTarget.add( new THREE.AxisHelper( 500000 ));

}

GlobeControls.prototype = Object.create(THREE.EventDispatcher.prototype);
GlobeControls.prototype.constructor = GlobeControls;

export default GlobeControls;
