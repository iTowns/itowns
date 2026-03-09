import {
    NoBlending,
    ShaderMaterial,
    UniformsUtils,
    AlwaysDepth,
    Uniform,
    Vector2,
    type PerspectiveCamera,
    type WebGLRenderer,
    type WebGLRenderTarget,
} from 'three';
import { Effect, EffectAttribute } from 'postprocessing';
// eslint-disable-next-line import/extensions
import { EDLShader } from './EDLShader';

/**
 * Generates a kernel of evenly distributed 2D sample directions around a
 * circle.
 * Used for sampling neighbor depths in the EDL algorithm.
 */
function generateKernel(kernelSize: number): Float32Array {
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

class EDLPass extends Effect {
    width: number;
    height: number;
    camera: PerspectiveCamera;
    _kernel: Float32Array;
    edlMaterial: ShaderMaterial;

    constructor(camera: PerspectiveCamera, width = 256, height = 256, kernelSize = 8) {
        super('EDLPass', EDLShader.fragmentShader, {
            // TODO[QB]: blend function
            attributes: EffectAttribute.DEPTH,
            defines: new Map([
                ['KERNEL_SIZE', '8'],
                ['PERSPECTIVE_CAMERA', '1'],
            ]),
            uniforms: new Map<string, Uniform>([
                ['tDepth', new Uniform(null)],
                ['tDiffuse', new Uniform(null)],
                ['kernel', new Uniform(null)],
                ['resolution', new Uniform(new Vector2())],
                ['cameraNear', new Uniform(null)],
                ['cameraFar', new Uniform(null)],
                ['kernelRadius', new Uniform(1.5)],
                ['edlStrength', new Uniform(0.7)],
            ]),
        });

        /**
         * The width of the render target.
         */
        this.width = width;

        /**
         * The height of the render target.
         */
        this.height = height;

        this.camera = camera;

        this._kernel = generateKernel(kernelSize);

        // edl material
        // depthWrite: true enables gl_FragDepth output for depth compositing
        // depthTest: true with AlwaysDepth ensures all fragments are processed
        // while still allowing depth buffer writes (some drivers ignore
        // depthWrite when depthTest=false)
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

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;

        this.edlMaterial.uniforms.resolution.value.set(width, height);
    }

    get strength(): number {
        return this.edlMaterial.uniforms.edlStrength.value;
    }

    set strength(value: number) {
        this.edlMaterial.uniforms.edlStrength.value = value;
    }

    get kernelRadius(): number {
        return this.edlMaterial.uniforms.kernelRadius.value;
    }

    set kernelRadius(value: number) {
        this.edlMaterial.uniforms.kernelRadius.value = value;
    }

    render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
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
