/**
 * Generated On: 2015-10-5
 * Class: c3DEngine
 * Description: 3DEngine est l'interface avec le framework webGL.
 */

/* global Uint8Array, Float64Array, document, window, Image */

import * as THREE from 'three';
import Capabilities from '../Core/System/Capabilities';

function c3DEngine(viewerDiv, renderer) {
    var NOIE = !Capabilities.isInternetExplorer();
    this.viewerDiv = viewerDiv;

    this.width = (renderer ? renderer.domElement : viewerDiv).clientWidth;
    this.height = (renderer ? renderer.domElement : viewerDiv).clientHeight;

    this.positionBuffer = null;
    this._nextThreejsLayer = 0;

    this.fullSizeRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height);
    this.fullSizeRenderTarget.texture.minFilter = THREE.LinearFilter;
    this.fullSizeRenderTarget.texture.generateMipmaps = false;

    this.renderView = function renderScene(view) {
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.clear();
        this.renderer.render(view.scene, view.camera.camera3D);
    }.bind(this);

    this.onWindowResize = function onWindowResize() {
        this.width = this.viewerDiv.clientWidth;
        this.height = this.viewerDiv.clientHeight;
        this.fullSizeRenderTarget.setSize(this.width, this.height);
        this.renderer.setSize(this.viewerDiv.clientWidth, this.height);
    }.bind(this);

    //
    // Create canvas
    //
    var canvas = document.createElement('canvas');

    //
    // Create renderer
    //
    this.renderer = renderer || new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: this.gLDebug || NOIE,
    });

    Capabilities.updateCapabilities(this.renderer);

    this.renderer.setClearColor(0x030508);
    this.renderer.autoClear = false;
    this.renderer.sortObjects = false;

    if (!renderer) {
        this.renderer.setPixelRatio(viewerDiv.devicePixelRatio);
        this.renderer.setSize(viewerDiv.clientWidth, viewerDiv.clientHeight);
        viewerDiv.appendChild(this.renderer.domElement);
    }
}

/*
 * return
 */
c3DEngine.prototype.getWindowSize = function getWindowSize() {
    return new THREE.Vector2(this.width, this.height);
};

/**
 * return renderer THREE.js
 * @returns {undefined|c3DEngine_L7.THREE.WebGLRenderer}
 */
c3DEngine.prototype.getRenderer = function getRenderer() {
    return this.renderer;
};

c3DEngine.prototype.renderViewTobuffer = function renderViewTobuffer(view, buffer, x, y, width, height) {
    // TODO Deallocate render texture
    const current = this.renderer.getCurrentRenderTarget();
    this.renderer.setRenderTarget(buffer);
    this.renderer.setViewport(0, 0, buffer.width, buffer.height);
    this.renderer.setScissor(x, y, width, height);
    this.renderer.setScissorTest(true);
    this.renderer.clear();
    this.renderer.render(view.scene, view.camera.camera3D, buffer);
    this.renderer.setScissorTest(false);
    var pixelBuffer = new Uint8Array(4 * width * height);
    this.renderer.readRenderTargetPixels(buffer, x, y, width, height, pixelBuffer);
    this.renderer.setRenderTarget(current);

    return pixelBuffer;
};

c3DEngine.prototype.bufferToImage = function bufferToImage(pixelBuffer, width, height) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

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

c3DEngine.prototype.getRTCMatrixFromCenter = (function getRTCMatrixFromCenterFn() {
    const position = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    return function getRTCMatrixFromCenter(center, camera) {
        position.subVectors(camera.camera3D.position, center);
        matrix.copy(camera.camera3D.matrixWorld);
        matrix.setPosition(position);
        matrix.getInverse(matrix);
        return new THREE.Matrix4().multiplyMatrices(camera.camera3D.projectionMatrix, matrix);
    };
}());

c3DEngine.prototype.getRTCMatrixFromNode = function getRTCMatrixFromNode(node, camera) {
    // TODO: Simplify this function like getRTCMatrixFromCenter()
    var camera3D = camera.camera3D;
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

c3DEngine.prototype.getUniqueThreejsLayer = function getUniqueThreejsLayer() {
    // We use three.js Object3D.layers feature to manage visibility of
    // geometry layers; so we need an internal counter to assign a new
    // one to each new geometry layer.
    // Warning: only 32 ([0, 31]) different layers can exist.
    if (this._nextThreejsLayer > 31) {
        // eslint-disable-next-line no-console
        console.warn('Too much three.js layers. Starting from now all of them will use layerMask = 31');
        this._nextThreejsLayer = 31;
    }

    const result = this._nextThreejsLayer++;

    return result;
};

export default c3DEngine;
