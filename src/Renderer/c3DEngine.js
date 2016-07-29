/**
 * Generated On: 2015-10-5
 * Class: c3DEngine
 * Description: 3DEngine est l'interface avec le framework webGL.
 */

/* global Uint8Array Float64Array*/

import THREE from 'THREE';
import GlobeControls from 'GlobeControls';
import Camera from 'Renderer/Camera';
import Atmosphere from 'Globe/Atmosphere';
import Capabilities from 'Core/System/Capabilities';
import RendererConstant from 'Renderer/RendererConstant';

var instance3DEngine = null;

/*
var step = function(val,stepVal)
{
    if(val<stepVal)
        return 0.0;
    else
        return 1.0;

};

var exp2 = function(expo)
{
    return Math.pow(2,expo);
};

function parseFloat2(str) {
    var float = 0, sign, order, mantiss,exp,
    int = 0, multi = 1;
    if (/^0x/.exec(str)) {
        int = parseInt(str,16);
    }else{
        for (var i = str.length -1; i >=0; i -= 1) {
            if (str.charCodeAt(i)>255) {
                console.log('Wrong string parametr');
                return false;
            }
            int += str.charCodeAt(i) * multi;
            multi *= 256;
        }
    }
    sign = (int>>>31)?-1:1;
    exp = (int >>> 23 & 0xff) - 127;
    mantissa = ((int & 0x7fffff) + 0x800000).toString(2);
    for (i=0; i<mantissa.length; i+=1){
        float += parseInt(mantissa[i])? Math.pow(2,exp):0;
        exp--;
    }
    return float*sign;
}

var decode32 = function(rgba) {
    var Sign = 1.0 - step(128.0,rgba[0])*2.0;
    var Exponent = 2.0 * (rgba[0]%128.0) + step(128.0,rgba[1]) - 127.0;
    var Mantissa = (rgba[1]%128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + parseFloat2(0x800000);
    var Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
    return Result;
};

var bf = new Float32Array([1256.211]);
var bui = new Uint8Array(bf.buffer);
var v = new THREE.Vector4().fromArray(bui);
v.set(v.w,v.z,v.y,v.x);

console.log(decode32(v.toArray()),parseFloat2(0x800000));
*/

function c3DEngine(scene, positionCamera, viewerDiv, debugMode, gLDebug) {

    //Constructor

    if (instance3DEngine !== null) {
        throw new Error("Cannot instantiate more than one c3DEngine");
    }

    THREE.ShaderChunk["logdepthbuf_pars_vertex"];

    var caps = new Capabilities();
    var NOIE = !caps.isInternetExplorer();
    this.gLDebug = gLDebug;
    this.viewerDiv = viewerDiv;
    this.debug = debugMode;
    this.scene3D = new THREE.Scene();
    this.width = this.debug ? viewerDiv.clientWidth * 0.5 : viewerDiv.clientWidth;
    this.height = viewerDiv.clientHeight;
    this.camDebug = undefined;
    this.dnear = 0.0;
    this.dfar = 0.0;
    this.stateRender = RendererConstant.FINAL;
    this.positionBuffer = null;
    this.lightingOn = false;

    this.camera = new Camera(this.width, this.height, this.debug);

    if (this.debug) {
        this.camDebug = new THREE.PerspectiveCamera(30, this.camera.ratio);

    }

    this.pickingTexture = new THREE.WebGLRenderTarget(this.width, this.height);
    this.pickingTexture.texture.minFilter = THREE.LinearFilter;
    this.pickingTexture.texture.generateMipmaps = false;
    this.pickingTexture.depthBuffer = true;

    this.renderScene = function() {

        this.renderer.clear();
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.render(this.scene3D, this.camera.camera3D);

        if (this.debug) {

            this.enableRTC(false);
            this.camera.camHelper().visible = true;

            var target = this.controls.moveTarget;
            var position = this.camera.position();

            var posDebug = new THREE.Vector3().subVectors(position, target);

            posDebug.setLength(posDebug.length() * 2.0);
            posDebug.add(target);
            posDebug.setLength((posDebug.length() - this.size) * 3.0 + this.size);

            this.camDebug.position.copy(posDebug);
            this.camDebug.lookAt(target);
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

        this.width = this.debug ? this.viewerDiv.clientWidth * 0.5 : this.viewerDiv.clientWidth;
        this.height = this.viewerDiv.clientHeight;
        this.camera.resize(this.width, this.height);
        this.scene.updateCamera();

        if (this.camDebug) {
            this.camDebug.aspect = this.camera.ratio;
            this.camDebug.updateProjectionMatrix();
        }

        this.pickingTexture.setSize(this.width, this.height);
        this.renderer.setSize(this.width, this.height);
        this.update();

    }.bind(this);

    this.scene = scene;
    this.size = this.scene.size().x;

    //
    // init camera
    //
    this.camera.setPosition(positionCamera);
    this.camera.camera3D.near = this.size * 2.333; // if near is too small --> bug no camera helper
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

    this.camera.camera3D.near = Math.max(15.0, 0.000002352 * this.size);
    this.camera.camera3D.updateProjectionMatrix();

    //
    // Create canvas
    //

    var canvas = document.createElement('canvas');
    canvas.id = 'canvasWebGL';

    //
    // Create renderer
    //

    this.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: this.gLDebug || !NOIE ? false : true
    });
    this.renderer.setPixelRatio(viewerDiv.devicePixelRatio);
    this.renderer.setSize(viewerDiv.clientWidth, viewerDiv.clientHeight);
    this.renderer.setClearColor(0x030508);
    this.renderer.autoClear = false;
    //this.viewerDiv.appendChild(canvas);
    viewerDiv.appendChild(this.renderer.domElement);

    //
    // Create Control
    //
    this.controls = new GlobeControls(this.camera.camera3D, this.renderer.domElement, this);
    this.controls.target = new THREE.Vector3(0, 0, 0);
    this.controls.damping = 0.1;
    this.controls.noPan = false;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 2.0;
    this.controls.minDistance = 30;
    this.controls.maxDistance = this.size * 8.0;
    this.controls.keyPanSpeed = 0.01;

    var gl = this.renderer.context;
    var maxTexturesUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

    var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo !== null) {

        var vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        //var renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

        if (vendor.indexOf('mesa') > -1 || vendor.indexOf('Mesa') > -1)
            maxTexturesUnits = Math.min(16, maxTexturesUnits);
    } else {
        maxTexturesUnits = Math.min(16, maxTexturesUnits);
    }

    this.glParams = {
        maxTexturesUnits: maxTexturesUnits
    };

    window.addEventListener('resize', this.onWindowResize, false);
    this.controls.addEventListener('change', this.update);

}

/**
 * TODO : temporaire
 * update control parameter in function of distance of globe
 * @returns {undefined}
 */
c3DEngine.prototype.updateControl = function() {
    var len = this.camera.position().length();
    var lim = this.size * 1.1;

    if (len < lim) {
        var t = Math.pow(Math.cos((lim - len) / (lim - this.size * 0.9981) * Math.PI * 0.5), 1.5);
        var color = new THREE.Color(0x93d5f8);
        this.renderer.setClearColor(color.multiplyScalar(1.0 - t));
    } else if (len >= lim)
        this.renderer.setClearColor(0x030508);
};

c3DEngine.prototype.enableRTC = function(enable) {
    for (var x = 0; x < this.scene3D.children.length; x++) {
        var node = this.scene3D.children[x];

        if (node.enableRTC && !(node instanceof Atmosphere))
            node.traverseVisible(enable ? this.rtcOn.bind(this) : this.rtcOff.bind(this));
        else
            node.visible = enable;

    }

};


/**
 * change state all visible nodes
 * @param {type} state new state to apply
 * @returns {undefined}
 */
c3DEngine.prototype.changeStateNodesScene = function(state) {

    // build traverse function
    var changeStateFunction = function() {
        return function(object3D) {
            object3D.changeState(state);
        }.bind(state);
    }();

    var enable = state === RendererConstant.FINAL;

    for (var x = 0; x < this.scene3D.children.length; x++) {
        var node = this.scene3D.children[x];

        if (node.changeState) {
            node.traverseVisible(changeStateFunction);
        } else {
            if (node.layer) {
                node.visible = enable ? node.layer.visible : false;
            } else {
                node.visible = enable;
            }
        }
    }
};

c3DEngine.prototype.rtcOn = function(obj3D) {
    obj3D.enableRTC(true);
    obj3D.matrixAutoUpdate = false;
};

c3DEngine.prototype.rtcOff = function(obj3D) {
    obj3D.enableRTC(false);
    obj3D.matrixWorldNeedsUpdate = true;
    obj3D.matrixAutoUpdate = true;
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

        this.changeStateNodesScene(stateRender);

    }
};

c3DEngine.prototype.renderTobuffer = function(x, y, width, height, mode) {

    // TODO Deallocate render texture
    var originalState = this.stateRender;
    this.setStateRender(mode);
    this.renderer.clear();
    // this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.setViewport(x, y, width, height);
    //this.renderer.setScissor(x, y, width, height);
    //this.renderer.setScissorTest ( true ); // TODO no change time with setScissorTest
    this.renderer.render(this.scene3D, this.camera.camera3D, this.pickingTexture);
    //this.renderer.setScissorTest ( false);
    this.setStateRender(originalState);

    //var pixelBuffer = new Float32Array(width * height * 4);
    var pixelBuffer = new Uint8Array(4);
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
    this.positionBuffer = this.renderTobuffer(0, 0, this.width, this.height, RendererConstant.DEPTH);
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

    var camera = this.camera.camera3D;

    camera.updateMatrixWorld();

    var buffer = this.renderTobuffer(mouse.x, this.height - mouse.y, 1, 1, RendererConstant.DEPTH);

    var glslPosition = new THREE.Vector3().fromArray(buffer);

    if (scene)
        scene.selectNodeId(buffer[3]);

    var worldPosition = glslPosition.applyMatrix4(camera.matrixWorld);

    if (worldPosition.length() > 10000000)
        return undefined;

    return worldPosition;

};

var unpack1K = function(color, factor) {

    var bitSh = new THREE.Vector4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
    return bitSh.dot(color) * factor;
}


/**
 *
 * @param {Vecto2D} mouse : mouse position on screen in pixel
 * @returns {int} uuid's node
 * */
c3DEngine.prototype.screenCoordsToNodeId = function(mouse) {

    var camera = this.camera.camera3D;

    camera.updateMatrixWorld();

    var buffer = this.renderTobuffer(mouse.x, this.height - mouse.y, 1, 1, RendererConstant.ID);

    var depthRGBA = new THREE.Vector4().fromArray(buffer).divideScalar(255.0);

    // unpack RGBA to float
    var unpack = unpack1K(depthRGBA, 10000);

    return Math.round(unpack);

};


/**
 *
 * @param {Vecto2D} mouse : mouse position on screen in pixel
 * Select node under mouse
 **/
c3DEngine.prototype.selectNodeAt = function(mouse) {
    this.scene.selectNodeId(this.screenCoordsToNodeId(mouse));
};

c3DEngine.prototype.getPickingPositionFromDepth = function() {

    var matrix = new THREE.Matrix4();
    matrix.elements = new Float64Array(16); // /!\ WARNING Matrix JS are in Float32Array
    var raycaster = new THREE.Raycaster();
    var screen = new THREE.Vector2();
    var pickWorldPosition = new THREE.Vector3();
    var ray = new THREE.Ray();
    var depthRGBA = new THREE.Vector4();

    return function getPickingPositionFromDepth(mouse) {

        if (mouse === undefined)
            mouse = new THREE.Vector2(Math.floor(this.width / 2), Math.floor(this.height / 2));

        var camera = this.camera.camera3D;

        camera.updateMatrixWorld();

        var buffer = this.renderTobuffer(mouse.x, this.height - mouse.y, 1, 1, RendererConstant.DEPTH);

        screen.x = ((mouse.x) / this.width) * 2 - 1;
        screen.y = -((mouse.y) / this.height) * 2 + 1;

        camera.matrixWorld.setPosition(camera.position);

        // Origin
        ray.origin.copy(camera.position);

        // Direction
        ray.direction.set(screen.x, screen.y, 0.5);
        // Unproject
        matrix.multiplyMatrices(camera.matrixWorld, matrix.getInverse(camera.projectionMatrix));
        ray.direction.applyProjection(matrix);
        ray.direction.sub(ray.origin);

        screen.x = 0;
        screen.y = 0;

        raycaster.setFromCamera(screen, camera);

        var dirCam = raycaster.ray.direction;
        var angle = dirCam.angleTo(ray.direction);

        depthRGBA.fromArray(buffer).divideScalar(255.0);

        var depth = unpack1K(depthRGBA, 100000000.0) / Math.cos(angle);

        pickWorldPosition.addVectors(camera.position, ray.direction.setLength(depth));

        if (pickWorldPosition.length() > 10000000)
            return undefined;

        return pickWorldPosition;
    };

}();

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

c3DEngine.prototype.getRTCMatrixFromCenter = function(center, camera) {

    var position = new THREE.Vector3().subVectors(camera.camera3D.position, center);
    var quaternion = new THREE.Quaternion().copy(camera.camera3D.quaternion);
    var matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    var matrixInv = new THREE.Matrix4().getInverse(matrix);
    var centerEye = new THREE.Vector4().applyMatrix4(matrixInv);
    var mvc = matrixInv.setPosition(centerEye);
    return new THREE.Matrix4().multiplyMatrices(camera.camera3D.projectionMatrix, mvc);
};

c3DEngine.prototype.getRTCMatrixFromNode = function(node, camera) {

    var camera3D = camera.camera3D;
    //var position = new THREE.Vector3().subVectors(camera3D.position, node.position);
    var positionWorld = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
    var position = new THREE.Vector3().subVectors(camera3D.position, positionWorld);
    var quaternion = new THREE.Quaternion().copy(camera3D.quaternion);
    var matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    var matrixInv = new THREE.Matrix4().getInverse(matrix);
    var model = node.matrixWorld.clone().setPosition(new THREE.Vector3());
    matrixInv.multiply(model);

    var centerEye = new THREE.Vector4().applyMatrix4(matrixInv);
    var mvc = matrixInv.setPosition(centerEye);
    return new THREE.Matrix4().multiplyMatrices(camera3D.projectionMatrix, mvc);
};

c3DEngine.prototype.setLightingOn = function(value) {
    this.lightingOn = value;
};

export default function(scene, positionCamera, debugMode, gLDebug) {
    instance3DEngine = instance3DEngine || new c3DEngine(scene, positionCamera, debugMode, gLDebug);
    return instance3DEngine;
}
