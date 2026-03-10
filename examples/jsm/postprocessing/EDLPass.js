import {
    NoBlending,
    ShaderMaterial,
    UniformsUtils,
    AlwaysDepth,
} from 'three';
// eslint-disable-next-line
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
// eslint-disable-next-line import/extensions
import { EDLShader } from '../shaders/EDLShader.js';

/**
 * Generates a kernel of evenly distributed 2D sample directions around a circle.
 * Used for sampling neighbor depths in the EDL algorithm.
 *
 * @param {number} kernelSize - Number of sample directions
 * @returns {Float32Array} Flat array of (x, y) pairs
 */
function generateKernel(kernelSize) {
    const kernel = new Float32Array(kernelSize * 2);

    for (let i = 0; i < kernelSize; ++i) {
        const angle = (2 * Math.PI * i) / kernelSize;
        kernel[(i * 2) + 0] = Math.cos(angle);
        kernel[(i * 2) + 1] = Math.sin(angle);
    }

    return kernel;
}

// Algorithm by Christian Boucheny. See:
// - Phd thesis (page 115-127, french):
//   https://tel.archives-ouvertes.fr/tel-00438464/document
// - Implementation in Cloud Compare (last update 2022):
//   https://github.com/CloudCompare/CloudCompare/tree/master/plugins/core/GL/qEDL/shaders/EDL
// Parameters by Markus Schuetz (Potree). See:
// - Master thesis (pages 38-41):
//   https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf
// - Implementation in Potree (last update 2019):
//   https://github.com/potree/potree/blob/develop/src/materials/shaders/edl.fs

class EDLPass extends Pass {
    /**
     * @param {PerspectiveCamera | OrthographicCamera} camera
     * @param {number} width
     * @param {number} height
     * @param {number} kernelSize
     */
    constructor(camera, width = 256, height = 256, kernelSize = 8) {
        super();

        /**
         * The width of the render target.
         *
         * @type {number}
         * @default 256
         */
        this.width = width;

        /**
         * The height of the render target.
         *
         * @type {number}
         * @default 256
         */
        this.height = height;

        /**
         * Overwritten to true to ensure the render target is cleared.
         *
         * @type {boolean}
         * @default true
         */
        this.clear = true;

        /** @type {THREE.PerspectiveCamera | THREE.OrthographicCamera} */
        this.camera = camera;

        /** @type {Float32Array} */
        this._kernel = generateKernel(kernelSize);

        // edl material
        // depthWrite: true enables gl_FragDepth output for depth compositing
        // depthTest: true with AlwaysDepth ensures all fragments are processed
        // while still allowing depth buffer writes (some drivers ignore depthWrite when depthTest=false)
        this.edlMaterial = new ShaderMaterial({
            defines: { ...EDLShader.defines },
            uniforms: UniformsUtils.clone(EDLShader.uniforms),
            vertexShader: EDLShader.vertexShader,
            fragmentShader: EDLShader.fragmentShader,
            blending: NoBlending,
            depthWrite: true,
            depthTest: true,
            depthFunc: AlwaysDepth,
        });

        this.edlMaterial.defines.KERNEL_SIZE = kernelSize;
        // Set camera type define: 1 for perspective, 0 for orthographic
        this.edlMaterial.defines.PERSPECTIVE_CAMERA = camera.isPerspectiveCamera ? 1 : 0;

        const uniforms = this.edlMaterial.uniforms;
        uniforms.kernel.value = this._kernel;
        uniforms.resolution.value.set(this.width, this.height);
        uniforms.cameraNear.value = this.camera.near;
        uniforms.cameraFar.value = this.camera.far;

        this._fsQuad = new FullScreenQuad(this.edlMaterial);
    }

    /**
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;

        this.edlMaterial.uniforms.resolution.value.set(width, height);
    }

    /**
     * EDL strength controls the intensity of the edge darkening effect.
     * Higher values produce more pronounced edges.
     * @type {number}
     * @default 6000.0
     */
    get strength() {
        return this.edlMaterial.uniforms.edlStrength.value;
    }

    set strength(value) {
        this.edlMaterial.uniforms.edlStrength.value = value;
    }

    /**
     * Kernel radius in pixels for neighbor sampling.
     * Larger values sample further neighbors, creating thicker edges.
     * @type {number}
     * @default 0.7
     */
    get kernelRadius() {
        return this.edlMaterial.uniforms.kernelRadius.value;
    }

    set kernelRadius(value) {
        this.edlMaterial.uniforms.kernelRadius.value = value;
    }

    /**
     * @param {WebGLRenderer} renderer
     * @param {WebGLRenderTarget} writeBuffer
     * @param {WebGLRenderTarget} readBuffer
     */
    render(renderer, writeBuffer, readBuffer) {
        this.edlMaterial.uniforms.cameraNear.value = this.camera.near;
        this.edlMaterial.uniforms.cameraFar.value = this.camera.far;

        this.edlMaterial.uniforms.tDepth.value = readBuffer.depthTexture;
        this.edlMaterial.uniforms.tDiffuse.value = readBuffer.texture;

        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
        this._fsQuad.render(renderer);
    }

    dispose() {
        this._fsQuad.dispose();
    }
}

export { EDLPass };
