/**
 * Generated On: 2015-10-5
 * Class: c3DEngine
 * Description: 3DEngine est l'interface avec le framework webGL.
 */

define('Renderer/c3DEngine', [
    'THREE',
    'OrbitControls',
    'GlobeControls',
    'Renderer/Camera',
    'Globe/Atmosphere',
    'Renderer/DepthMaterial',
    'Renderer/BasicMaterial'
], function(
    THREE,
    OrbitControls,
    GlobeControls,
    Camera,
    Atmosphere,
    DepthMaterial,
    BasicMaterial) {

    var instance3DEngine = null;
    var RENDER = {
        FINAL: 0,
        PICKING: 1
    };

    function c3DEngine() {
        //Constructor

        if (instance3DEngine !== null) {
            throw new Error("Cannot instantiate more than one c3DEngine");
        }

        THREE.ShaderChunk["logdepthbuf_pars_vertex"];

        this.debug = false;
        //this.debug      = true;
        this.scene = undefined;
        this.scene3D = new THREE.Scene();
        this.width = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
        this.height = window.innerHeight;

        this.renderer = undefined;
        this.controls = undefined;
        this.camera = undefined;
        this.camDebug = undefined;
        this.size = 1.0;
        this.dnear = 0.0;
        this.dfar = 0.0;
        this.stateRender = RENDER.FINAL;
        this.positionBuffer = null;
        this.time = 0.;  // Global time iterator use for any animation
        this.reqAF = null; // reference the animation frame to cancel it
        this.animationOn = false;
        if(this.animationOn) this.animateTime();
        this.initCamera();

        var material = new BasicMaterial(new THREE.Color(1, 0, 0));
        var material2 = new BasicMaterial(new THREE.Color(0, 0, 1));
        var geometry = new THREE.CylinderGeometry(0.6, 0.01, 2, 32);
        this.dummy = new THREE.Mesh(geometry, material);
        this.dummy2 = new THREE.Mesh(geometry, material2);

        this.dummy2.material.enableRTC(false);
        this.dummy.material.enableRTC(false);

        //        this.scene3D.add(this.dummy);
        //        this.scene3D.add(this.dummy2);

        this.pickingTexture = new THREE.WebGLRenderTarget(this.width, this.height);
        this.pickingTexture.texture.minFilter = THREE.LinearFilter;
        this.pickingTexture.texture.generateMipmaps = false;
        this.pickingTexture.texture.type = THREE.FloatType;
        this.pickingTexture.depthBuffer = true;

        this.renderScene = function() {

            this.renderer.clear();
            this.renderer.setViewport(0, 0, this.width, this.height);
            this.renderer.render(this.scene3D, this.camera.camera3D);

            if (this.debug) {

                this.enableRTC(false);
                this.camera.camHelper().visible = true;
                this.renderer.setViewport(this.width, 0, this.width, this.height);
                this.renderer.render(this.scene3D, this.camDebug);
                this.enableRTC(true);
                this.camera.camHelper().visible = false;
            }

        }.bind(this);

        this.update = function() {
            this.camera.update();
            this.updateControl();
            this.scene.wait();
            this.renderScene();

        }.bind(this);

        this.onWindowResize = function() {

            this.width = this.debug ? window.innerWidth * 0.5 : window.innerWidth;
            this.height = window.innerHeight;
            this.camera.resize(this.width, this.height);

            this.scene.updateCamera();

            if (this.camDebug) {
                this.camDebug.aspect = this.camera.ratio;
                this.camDebug.updateProjectionMatrix();
            }

            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.update();
            this.renderScene();
        }.bind(this);

    };

    /**
     * Intialisation camera and debug camera
     * @returns {undefined}
     */
    c3DEngine.prototype.initCamera = function() {
        this.camera = new Camera(this.width, this.height, this.debug);

        if (this.controls instanceof THREE.OrbitControls)
            this.scene3D.add(this.camera.camera3D);

        if (this.debug) {
            this.camDebug = new THREE.PerspectiveCamera(30, this.camera.ratio);

        }
    };

    /**
     * Initialisation renderer THREE.js
     * @returns {undefined}
     */
    c3DEngine.prototype.initRenderer = function() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x030508);
        this.renderer.autoClear = false;

        document.body.appendChild(this.renderer.domElement);
    };

    /**
     * 
     * @param {type} scene
     * @param {type} position
     * @returns {undefined}
     */
    c3DEngine.prototype.init = function(scene, position) {

        this.scene = scene;
        this.size = this.scene.size().x;
        this.camera.setPosition(position);

        // if near is too small --> bug no camera helper
        this.camera.camera3D.near = this.size * 2.333;
        this.camera.camera3D.far = this.size * 10;
        this.camera.camera3D.updateProjectionMatrix();
        this.camera.camera3D.updateMatrixWorld(true);

        if (this.debug) {

            this.camDebug.position.x = -this.size * 6;
            this.camDebug.lookAt(new THREE.Vector3(0, 0, 0));
            this.camDebug.near = this.size * 0.1;
            this.camDebug.far = this.size * 10;
            this.camDebug.updateProjectionMatrix();
            this.camera.createCamHelper();
            this.scene3D.add(this.camera.camHelper());
            var axisHelper = new THREE.AxisHelper(this.size * 1.33);
            this.scene3D.add(axisHelper);
        }

        if (this.controls instanceof THREE.GlobeControls) {
            var axisHelper = new THREE.AxisHelper(this.size * 1.33);
            this.scene3D.add(axisHelper);
        }

        this.camera.camera3D.near = Math.max(15.0, 0.000002352 * this.size);
        this.camera.camera3D.updateProjectionMatrix();
        this.initRenderer();
        this.initControls(this.size);

        //this.controls.target        = target;        
        window.addEventListener('resize', this.onWindowResize, false);
        this.controls.addEventListener('change', this.update);

    };

    /**
     * TODO : temporaire
     * update control parameter in function of distance of globe
     * @returns {undefined}
     */
    c3DEngine.prototype.updateControl = function() {
        var len = this.camera.position().length();
        var lim = this.size * 1.3;

        if (len < lim) {
            var t = Math.pow(Math.cos((lim - len) / (lim - this.size * 0.9981) * Math.PI * 0.5), 1.5);
            if (this.controls instanceof THREE.OrbitControls) {
                this.controls.zoomSpeed = t * 2.0;
                this.controls.rotateSpeed = 0.8 * t;
            }
            var color = new THREE.Color(0x93d5f8);

            this.renderer.setClearColor(color.multiplyScalar(1.0 - t));
        } else if (len >= lim && this.controls.zoomSpeed !== 1.0) {
            this.controls.zoomSpeed = 1.0;
            this.controls.rotateSpeed = 1.0;
            this.renderer.setClearColor(0x030508);
        }
    };

    c3DEngine.prototype.enableRTC = function(enable) {
        for (var x = 0; x < this.scene3D.children.length; x++) {
            var node = this.scene3D.children[x];

            if (node.enableRTC)
                node.traverseVisible(enable ? this.rtcOn.bind(this) : this.rtcOff.bind(this));
            else
                node.visible = enable;

        }

    };

    c3DEngine.prototype.enablePickingRender = function(enable) {
        for (var x = 0; x < this.scene3D.children.length; x++) {
            var node = this.scene3D.children[x];

            if (node.enablePickingRender)
                node.traverseVisible(enable ? this.pickingOn.bind(this) : this.pickingOff.bind(this));
            else
                node.visible = !enable;
        }
    };

    c3DEngine.prototype.rtcOn = function(obj3D) {
        obj3D.enableRTC(true);
    };

    c3DEngine.prototype.rtcOff = function(obj3D) {
        obj3D.enableRTC(false);
    };

    c3DEngine.prototype.pickingOn = function(obj3D) {
        obj3D.enablePickingRender(true);
    };

    c3DEngine.prototype.pickingOff = function(obj3D) {
        obj3D.enablePickingRender(false);
    };

    /**
     */
    c3DEngine.prototype.style2Engine = function() {
        //TODO: Implement Me 

    };

    /**
     * @documentation Initialisation of controls camera
     * @param {type} size
     * @returns {undefined}
     */

    c3DEngine.prototype.initControls = function(size) {

        //this.controls   = new THREE.OrbitControls( this.camera.camera3D,this.renderer.domElement );        
        this.controls = new THREE.GlobeControls(this.camera.camera3D, this.renderer.domElement, this);

        this.controls.target = new THREE.Vector3(0, 0, 0);
        this.controls.damping = 0.1;
        this.controls.noPan = false;
        this.controls.rotateSpeed = 0.8;
        this.controls.zoomSpeed = 1.0;
        this.controls.minDistance = 30;
        this.controls.maxDistance = size * 8.0;
        this.controls.keyPanSpeed = 0.01;

    };

    /**
     * TODO : to delete
     * @param {type} mesh
     * @param {type} texture
     * @returns {undefined}
     */
    c3DEngine.prototype.setTexture = function(mesh, texture) {
        //TODO: Implement Me         
        mesh.material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            map: texture
        });
    };

    /**
     * add nodeMesh in scene 3D
     * @param {type} node
     * @returns {undefined}
     */
    c3DEngine.prototype.add3DScene = function(node) {

        if (Array.isArray(node))

            this.scene3D.add.apply(this.scene3D, node);

        else

            this.scene3D.add(node);

    };
    

    c3DEngine.prototype.removeAll = function() {

           this.scene3D.children = [];

    };

    /**
     */
    c3DEngine.prototype.precision = function() {
        //TODO: Implement Me 

    };

    /*
     * return 
     */
    c3DEngine.prototype.getWindowSize = function() {

        return new THREE.Vector2(this.width, this.height);
    };

    /**
     * return renderer THREE.js
     * @returns {undefined|c3DEngine_L7.THREE.WebGLRenderer}
     */
    c3DEngine.prototype.getRenderer = function() {

        return this.renderer;
    };

    c3DEngine.prototype.setStateRender = function(stateRender) {
        if (this.stateRender !== stateRender) {
            this.stateRender = stateRender;

            switch (this.stateRender) {
                case RENDER.FINAL:
                    this.enablePickingRender(false);
                    break;
                case RENDER.PICKING:
                    this.enablePickingRender(true);
                    break;
                default:
                    this.stateRender = RENDER.FINAL;
                    this.enablePickingRender(false);
            }
        }
    };

    c3DEngine.prototype.updatePositionBuffer = function() {


    };

    c3DEngine.prototype.renderTobuffer = function(x, y, width, height, mode) {

        // TODO Deallocate render texture
        var originalState = this.stateRender;
        this.setStateRender(mode);
        this.renderer.clear();
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.render(this.scene3D, this.camera.camera3D, this.pickingTexture);
        this.setStateRender(originalState);

        var pixelBuffer = new Float32Array(width * height * 4);
        this.renderer.readRenderTargetPixels(this.pickingTexture, x, y, width, height, pixelBuffer);

        return pixelBuffer;
    };

    c3DEngine.prototype.bufferToImage = function(pixelBuffer, width, height) {

        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        // size the canvas to your desired image
        canvas.width = width;
        canvas.height = height;

        var imgData = ctx.getImageData(0, 0, width, height);
        imgData.data.set(pixelBuffer);

        ctx.putImageData(imgData, 0, 0);

        // create a new img object
        var image = new Image();

        // set the img.src to the canvas data url
        image.src = canvas.toDataURL();

        return image;

    };

    c3DEngine.prototype.updatePositionBuffer = function() {
        this.camera.camera3D.updateMatrixWorld();
        this.dummy.visible = false;
        this.positionBuffer = this.renderTobuffer(0, 0, this.width, this.height, RENDER.PICKING);
        this.dummy.visible = true;
        this.renderScene(); // TODO debug to remove white screen, but why?    

    };

    c3DEngine.prototype.pickingInPositionBuffer = function(mouse, scene) {

        if (this.positionBuffer === null)
            this.updatePositionBuffer();

        if (mouse === undefined)
            mouse = new THREE.Vector2(Math.floor(this.width / 2), Math.floor(this.height / 2));

        var coord = new THREE.Vector2(mouse.x, this.height - mouse.y);

        var i = (coord.y * this.width + coord.x) * 4;

        if (scene)
            scene.selectNodeId(this.positionBuffer[i + 3]);

        var glslPosition = new THREE.Vector3(this.positionBuffer[i + 0], this.positionBuffer[i + 1], this.positionBuffer[i + 2]);

        var worldPosition = glslPosition.applyMatrix4(this.camera.camera3D.matrixWorld);

        return worldPosition;

    };

    /**
     * 
     * @param {type} mouse : mouse position on screen in pixel
     * @param {type} scene     
     * @returns THREE.Vector3 position cartesien in world space
     * */
    c3DEngine.prototype.getPickingPosition = function(mouse, scene) {
        if (mouse === undefined)
            mouse = new THREE.Vector2(Math.floor(this.width / 2), Math.floor(this.height / 2));

        this.camera.camera3D.updateMatrixWorld();

        this.dummy.visible = false;

        var buffer = this.renderTobuffer(mouse.x, this.height - mouse.y, 1, 1, RENDER.PICKING);
        this.dummy.visible = true;

        var glslPosition = new THREE.Vector3().fromArray(buffer);

        if (scene)
            scene.selectNodeId(buffer[3]);

        var worldPosition = glslPosition.applyMatrix4(this.camera.camera3D.matrixWorld);

        return worldPosition;

    };

    c3DEngine.prototype.placeDummy = function(dummy, position) {
        dummy.position.copy(position);
        var size = position.clone().sub(this.camera.position()).length() / 200; // TODO distance                
        dummy.scale.copy(new THREE.Vector3(size, size, size));
        dummy.lookAt(new THREE.Vector3());
        dummy.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
        dummy.translateY(size);
        dummy.updateMatrix();
        dummy.updateMatrixWorld();
    };

    c3DEngine.prototype.cartesianToGeo = function(position) {
        
        // TODO move to core
        var p = position.clone();
        p.x = -position.x;
        p.y = position.z;
        p.z = position.y;

        var R = p.length();
        var a = 6378137;
        var b = 6356752.3142451793;
        var e = Math.sqrt((a * a - b * b) / (a * a));
        var f = 1 - Math.sqrt(1 - e * e);
        var rsqXY = Math.sqrt(p.x * p.x + p.y * p.y);

        var theta = Math.atan2(p.y, p.x);
        var nu = Math.atan(p.z / rsqXY * ((1 - f) + e * e * a / R));

        var sinu = Math.sin(nu);
        var cosu = Math.cos(nu);

        var phi = Math.atan((p.z * (1 - f) + e * e * a * sinu * sinu * sinu) / ((1 - f) * (rsqXY - e * e * a * cosu * cosu * cosu)));

        var h = (rsqXY * Math.cos(phi)) + p.z * Math.sin(phi) - a * Math.sqrt(1 - e * e * Math.sin(phi) * Math.sin(phi));

        console.log(theta / Math.PI * 180 + ' ' + phi / Math.PI * 180 + ' ' + h);
    };
    
    c3DEngine.prototype.getRTCMatrixFromCenter = function(center, camera ) {
       
        var position    = new THREE.Vector3().subVectors(camera.camera3D.position,center);
        var quaternion  = new THREE.Quaternion().copy(camera.camera3D.quaternion);       
        var matrix      = new THREE.Matrix4().compose(position,quaternion,new THREE.Vector3(1,1,1));
        var matrixInv   = new THREE.Matrix4().getInverse(matrix);  
        var centerEye   = new THREE.Vector4().applyMatrix4(matrixInv) ;                        
        var mvc         = matrixInv.setPosition(centerEye);      
        return            new THREE.Matrix4().multiplyMatrices(camera.camera3D.projectionMatrix,mvc);
    };
    
    c3DEngine.prototype.getRTCMatrixFromNode = function(node, camera) {

        var camera3D = camera.camera3D;  
        var position = new THREE.Vector3().subVectors(camera3D.position, node.position);
        var quaternion = new THREE.Quaternion().copy(camera3D.quaternion);
        var matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
        var matrixInv = new THREE.Matrix4().getInverse(matrix);
        var model = node.matrixWorld.clone().setPosition(new THREE.Vector3());
        matrixInv.multiply(model);

        var centerEye = new THREE.Vector4().applyMatrix4(matrixInv);
        var mvc = matrixInv.setPosition(centerEye);
        return new THREE.Matrix4().multiplyMatrices(camera3D.projectionMatrix, mvc);
    };
    
    c3DEngine.prototype.setAnimationOn = function(bool){
        
        this.animationOn = bool;
        if(this.animationOn) this.animateTime();
          else
               window.cancelAnimationFrame(this.reqAF);
    };
    
    // Todo: should move to the main rendering function with its own refresh
    c3DEngine.prototype.animateTime = function() {

        this.time += 0.01;
        if(this.scene)
            this.scene.browserScene.updateMaterialUniform('time',this.time);
        this.reqAF = requestAnimationFrame(this.animateTime.bind(this));
    };

    return function(scene) {
        instance3DEngine = instance3DEngine || new c3DEngine(scene);
        return instance3DEngine;
    };

});
