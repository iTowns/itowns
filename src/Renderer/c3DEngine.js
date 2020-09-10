/**
 * Generated On: 2015-10-5
 * Class: c3DEngine
 * Description: 3DEngine est l'interface avec le framework webGL.
 */

import * as THREE from 'three';
import Capabilities from 'Core/System/Capabilities';
import { unpack1K } from 'Renderer/LayeredMaterial';
import { WEBGL } from 'ThreeExtended/WebGL';
import Label2DRenderer from 'Renderer/Label2DRenderer';

const depthRGBA = new THREE.Vector4();
class c3DEngine {
    constructor(rendererOrDiv, options = {}) {
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

        if (options.isWebGL2 === undefined) {
            options.isWebGL2 = true;
        }

        const renderer = rendererOrDiv.domElement ? rendererOrDiv : undefined;
        const viewerDiv = renderer ? renderer.domElement : rendererOrDiv;

        this.width = viewerDiv.clientWidth;
        this.height = viewerDiv.clientHeight;

        this.positionBuffer = null;
        this._nextThreejsLayer = 1;

        this.fullSizeRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height);
        this.fullSizeRenderTarget.texture.minFilter = THREE.LinearFilter;
        this.fullSizeRenderTarget.texture.magFilter = THREE.NearestFilter;
        this.fullSizeRenderTarget.depthBuffer = true;
        this.fullSizeRenderTarget.depthTexture = new THREE.DepthTexture();
        this.fullSizeRenderTarget.depthTexture.type = THREE.UnsignedShortType;

        this.renderView = function _(view) {
            this.renderer.clear();
            this.renderer.render(view.scene, view.camera.camera3D);
            this.label2dRenderer.render(view.scene, view.camera.camera3D);
        }.bind(this);

        this.onWindowResize = function _(w, h) {
            this.width = w;
            this.height = h;
            this.fullSizeRenderTarget.setSize(this.width, this.height);
            this.renderer.setSize(this.width, this.height);
            this.label2dRenderer.setSize(this.width, this.height);
        }.bind(this);

        // Create renderer
        try {
            this.label2dRenderer = new Label2DRenderer();
            this.label2dRenderer.setSize(this.width, this.height);
            viewerDiv.appendChild(this.label2dRenderer.domElement);

            this.renderer = renderer || new (options.isWebGL2 ? THREE.WebGLRenderer : THREE.WebGL1Renderer)({
                canvas: document.createElement('canvas'),
                antialias: options.antialias,
                alpha: options.alpha,
                logarithmicDepthBuffer: options.logarithmicDepthBuffer,
            });
            this.renderer.domElement.style.position = 'relative';
            this.renderer.domElement.style.zIndex = 0;
            this.renderer.domElement.style.top = 0;
        } catch (ex) {
            const versionWebGL = options.isWebGL2 ? '2' : '1';
            console.error(`Failed to create WebGLRenderer webGL ${versionWebGL}.`);
            this.renderer = null;
        }

        if (!this.renderer) {
            if (!WEBGL.isWebGLAvailable()) {
                viewerDiv.appendChild(WEBGL.getErrorMessage(1));
            } else if (!WEBGL.isWebGL2Available()) {
                viewerDiv.appendChild(WEBGL.getErrorMessage(2));
            }

            throw new Error('WebGL unsupported');
        }

        if (!renderer && options.logarithmicDepthBuffer) {
            // We don't support logarithmicDepthBuffer when EXT_frag_depth is missing.
            // So recreated a renderer if needed.
            if (!this.renderer.capabilities.isWebGL2 && !this.renderer.extensions.get('EXT_frag_depth')) {
                this.renderer.dispose();
                this.renderer = new (options.isWebGL2 ? THREE.WebGLRenderer : THREE.WebGL1Renderer)({
                    canvas: document.createElement('canvas'),
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
        this.renderer.debug.checkShaderErrors = __DEBUG__;

        if (!renderer) {
            this.renderer.setPixelRatio(viewerDiv.devicePixelRatio);
            this.renderer.setSize(viewerDiv.clientWidth, viewerDiv.clientHeight);
            viewerDiv.appendChild(this.renderer.domElement);
        }
    }

    getWindowSize() {
        return new THREE.Vector2(this.width, this.height);
    }

    /**
     * return renderer THREE.js
     * @returns {undefined|THREE.WebGLRenderer}
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * Render view to a Uint8Array.
     *
     * @param {View} view - The view to render
     * @param {object} [zone] - partial zone to render
     * @param {number} zone.x - x (in view coordinate)
     * @param {number} zone.y - y (in view coordinate)
     * @param {number} zone.width - width of area to render (in pixels)
     * @param {number} zone.height - height of area to render (in pixels)
     * @return {THREE.RenderTarget} - Uint8Array, 4 bytes per pixel. The first pixel in
     * the array is the bottom-left pixel.
     */
    renderViewToBuffer(view, zone) {
        if (!zone) {
            zone = {
                x: 0,
                y: 0,
                width: this.width,
                height: this.height,
            };
        }

        zone.buffer = zone.buffer || new Uint8Array(4 * zone.width * zone.height);

        this.renderViewToRenderTarget(view, this.fullSizeRenderTarget, zone);

        this.renderer.readRenderTargetPixels(
            this.fullSizeRenderTarget,
            zone.x, this.height - (zone.y + zone.height), zone.width, zone.height, zone.buffer);

        return zone.buffer;
    }

    /**
     * Render view to a THREE.RenderTarget.
     *
     * @param {View} view - The view to render
     * @param {THREE.RenderTarget} [target] - destination render target. Default value: full size render target owned by c3DEngine.
     * @param {object} [zone] - partial zone to render (zone x/y uses view coordinates) Note: target must contain complete zone
     * @return {THREE.RenderTarget} - the destination render target
     */
    renderViewToRenderTarget(view, target, zone) {
        if (!target) {
            target = this.fullSizeRenderTarget;
        }
        const current = this.renderer.getRenderTarget();

        // Don't use setViewport / setScissor on renderer because they would affect
        // on screen rendering as well. Instead set them on the render target.
        // Example : this.fullSizeRenderTarget.viewport.set(0, 0, target.width, target.height);
        if (zone) {
            this.fullSizeRenderTarget.scissor.set(
                zone.x,
                target.height - (zone.y + zone.height),
                zone.width,
                zone.height);
            this.fullSizeRenderTarget.scissorTest = true;
        }

        this.renderer.setRenderTarget(target);
        this.renderer.clear(true, true, false);
        this.renderer.render(view.scene, view.camera.camera3D);
        this.renderer.setRenderTarget(current);

        this.fullSizeRenderTarget.scissorTest = false;
        return target;
    }

    bufferToImage(pixelBuffer, width, height) {
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
    }

    getUniqueThreejsLayer() {
        // We use three.js Object3D.layers feature to manage visibility of
        // geometry layers; so we need an internal counter to assign a new
        // one to each new geometry layer.
        // Warning: only 32 ([0, 31]) different layers can exist.
        if (this._nextThreejsLayer > 31) {
            console.warn('Too much three.js layers. Starting from now all of them will use layerMask = 31');
            this._nextThreejsLayer = 31;
        }

        const result = this._nextThreejsLayer++;

        return result;
    }

    depthBufferRGBAValueToOrthoZ(depthBufferRGBA, camera) {
        depthRGBA.fromArray(depthBufferRGBA).divideScalar(255.0);

        if (Capabilities.isLogDepthBufferSupported()) {
            const gl_FragDepthEXT = unpack1K(depthRGBA);
            const logDepthBufFC = 2.0 / (Math.log(camera.far + 1.0) / Math.LN2);
            // invert function : gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
            return 2 ** (2 * gl_FragDepthEXT / logDepthBufFC);
        } else {
            let gl_FragCoord_Z = unpack1K(depthRGBA);
            gl_FragCoord_Z = gl_FragCoord_Z * 2.0 - 1.0;
            return 2.0 * camera.near * camera.far / (camera.far + camera.near - gl_FragCoord_Z * (camera.far - camera.near));
        }
    }
}

export default c3DEngine;
