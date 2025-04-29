import {
    NoBlending,
    ShaderMaterial,
    UniformsUtils,
} from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { EDLShader } from '../shaders/EDLShader.js';

/**
 * @param {number} kernelSize
 * @returns {Float32Array}
 */
function generateVectors(kernelSize) {
    const kernel = new Float32Array(kernelSize * 2);

    for (let i = 0; i < kernelSize; ++i) {
        const rotation = (2 * i) + (Math.PI / kernelSize);
        kernel[(i * 2) + 0] = Math.cos(rotation);
        kernel[(i * 2) + 1] = Math.sin(rotation);
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
     * @param {THREE.PerspectiveCamera | THREE.OrthographicCamera} camera
     * @param {number} width
     * @param {number} height
     * @param {number} kernelSize
     */
    constructor(camera, width, height, kernelSize = 16) {
        super();

        /** @type {number} */
        this.width = width ?? 512;
        /** @type {number} */
        this.height = height ?? 512;

        this.clear = true;

        /** @type {THREE.PerspectiveCamera | THREE.OrthographicCamera} */
        this.camera = camera;

        /** @type {Float32Array} */
        this._kernel = generateVectors(kernelSize);

        // edl material
        this.edlMaterial = new ShaderMaterial({
            defines: { ...EDLShader.defines },
            uniforms: UniformsUtils.clone(EDLShader.uniforms),
            vertexShader: EDLShader.vertexShader,
            fragmentShader: EDLShader.fragmentShader,
            blending: NoBlending,
        });

        this.edlMaterial.defines.KERNEL_SIZE = kernelSize;

        const uniforms = this.edlMaterial.uniforms;
        uniforms.kernel.value = this._kernel;
        uniforms.resolution.value.set(this.width, this.height);
        uniforms.cameraNear.value = this.camera.near;
        uniforms.cameraFar.value = this.camera.far;

        this._fsQuad = new FullScreenQuad();
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
     * @param {WebGLRenderer} renderer
     * @param {WebGLRenderTarget} writeBuffer
     * @param {WebGLRenderTarget} readBuffer
     */
    render(renderer, writeBuffer, readBuffer) {
        this.edlMaterial.uniforms.tDepth.value = readBuffer.depthTexture;
        this.edlMaterial.uniforms.tDiffuse.value = readBuffer.texture;

        renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);

        this._fsQuad.material = this.edlMaterial;
        this._fsQuad.render(renderer);
    }

    dispose() {
        this._fsQuad.dispose();
    }
}

export { EDLPass };
