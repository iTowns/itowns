/**
 * Generated On: 2015-10-5
 * Class: c3DEngine
 * Description: 3DEngine est l'interface avec le framework webGL.
 */

/* global Uint8Array, Float64Array, document, window, Image */

import * as THREE from 'three';
import Capabilities from '../Core/System/Capabilities';
import { unpack1K } from './LayeredMaterial';

function c3DEngine(rendererOrDiv, options = {}) {
    const NOIE = !Capabilities.isInternetExplorer();
    // pick sensible default options
    if (options.antialias === undefined) {
        options.antialias = true;
    }
    if (options.alpha === undefined) {
        options.alpha = true;
    }
    if (options.logarithmicDepthBuffer === undefined) {
        options.logarithmicDepthBuffer = this.gLDebug || NOIE;
    }

    const renderer = rendererOrDiv.domElement ? rendererOrDiv : undefined;
    const viewerDiv = renderer ? undefined : rendererOrDiv;

    this.width = (renderer ? renderer.domElement : viewerDiv).clientWidth;
    this.height = (renderer ? renderer.domElement : viewerDiv).clientHeight;

    this.positionBuffer = null;
    this._nextThreejsLayer = 1;

    this.fullSizeRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height);
    this.fullSizeRenderTarget.texture.minFilter = THREE.LinearFilter;
    this.fullSizeRenderTarget.texture.generateMipmaps = false;

    this.renderView = function renderScene(view) {
        this.renderer.setViewport(0, 0, this.width, this.height);
        this.renderer.clear();
        this.renderer.render(view.scene, view.camera.camera3D);
    }.bind(this);

    this.onWindowResize = function onWindowResize(w, h) {
        this.width = w;
        this.height = h;
        this.fullSizeRenderTarget.setSize(this.width, this.height);
        this.renderer.setSize(this.width, this.height);
    }.bind(this);

    // Create renderer
    try {
        this.renderer = renderer || new THREE.WebGLRenderer({
            canvas: document.createElement('canvas'),
            antialias: options.antialias,
            alpha: options.alpha,
            logarithmicDepthBuffer: options.logarithmicDepthBuffer,
        });
    } catch (ex) {
        // eslint-disable-next-line no-console
        console.error('Failed to create WebGLRenderer', ex);
        this.renderer = null;
    }

    if (!this.renderer) {
        // from Detector.js
        const element = document.createElement('div');
        element.id = 'webgl-error-message';
        element.style.fontFamily = 'monospace';
        element.style.fontSize = '13px';
        element.style.fontWeight = 'normal';
        element.style.textAlign = 'center';
        element.style.background = '#fff';
        element.style.color = '#000';
        element.style.padding = '1.5em';
        element.style.width = '400px';
        element.style.margin = '5em auto 0';
        element.innerHTML = window.WebGLRenderingContext ? [
            'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />',
            'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.<br>',
            'See also <a href="https://www.khronos.org/webgl/wiki/BlacklistsAndWhitelists">graphics card blacklisting</a>',
        ].join('\n') : [
            'Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>',
            'Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.<br>',
            'You can also try another browser like Firefox or Chrome.',
        ].join('\n');
        viewerDiv.appendChild(element);
        throw new Error('WebGL unsupported');
    }

    if (!renderer && options.logarithmicDepthBuffer) {
        // We don't support logarithmicDepthBuffer when EXT_frag_depth is missing.
        // So recreated a renderer if needed.
        if (!this.renderer.extensions.get('EXT_frag_depth')) {
            const _canvas = this.renderer.domElement;
            this.renderer.dispose();
            this.renderer = new THREE.WebGLRenderer({
                canvas: _canvas,
                antialias: options.antialias,
                alpha: options.alpha,
                logarithmicDepthBuffer: false,
            });
        }
    }

    // Let's allow our canvas to take focus
    // The condition below looks weird, but it's correct: querying tabIndex
    // returns -1 if not set, but we still need to explicitly set it to force
    // the tabindex focus flag to true (see
    // https://www.w3.org/TR/html5/editing.html#specially-focusable)
    if (this.renderer.domElement.tabIndex === -1) {
        this.renderer.domElement.tabIndex = -1;
    }

    Capabilities.updateCapabilities(this.renderer);

    this.renderer.setClearColor(0x030508);
    this.renderer.autoClear = false;
    this.renderer.sortObjects = true;

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
    const current = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(buffer);
    this.renderer.setViewport(0, 0, buffer.width, buffer.height);
    this.renderer.setScissor(x, y, width, height);
    this.renderer.setScissorTest(true);
    this.renderer.clearTarget(buffer, true, true, false);
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

const depthRGBA = new THREE.Vector4();
c3DEngine.prototype.depthBufferRGBAValueToOrthoZ = function depthBufferRGBAValueToOrthoZ(depthBufferRGBA, camera) {
    depthRGBA.fromArray(depthBufferRGBA).divideScalar(255.0);

    if (Capabilities.isLogDepthBufferSupported()) {
        const gl_FragDepthEXT = unpack1K(depthRGBA);
        const logDepthBufFC = 2.0 / (Math.log(camera.far + 1.0) / Math.LN2);
        // invert function : gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
        return Math.pow(2.0, 2.0 * gl_FragDepthEXT / logDepthBufFC);
    } else {
        let gl_FragCoord_Z = unpack1K(depthRGBA);
        gl_FragCoord_Z = gl_FragCoord_Z * 2.0 - 1.0;
        return 2.0 * camera.near * camera.far / (camera.far + camera.near - gl_FragCoord_Z * (camera.far - camera.near));
    }
};


export default c3DEngine;
