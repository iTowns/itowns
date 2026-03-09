import {
    NoBlending, ShaderMaterial, Uniform, Vector2,
    PerspectiveCamera,
    type OrthographicCamera,
} from 'three';
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

export class EDLMaterial extends ShaderMaterial {
    resolution: Vector2;

    constructor(camera?: PerspectiveCamera | OrthographicCamera) {
        super({
            name: 'EDLMaterial',
            defines: { ...EDLShader.defines },
            uniforms: {
                tDepth: new Uniform(null),
                tDiffuse: new Uniform(null),
                kernel: new Uniform(generateKernel(8)), // TODO[QB]: make kernel size configurable
                resolution: new Uniform(new Vector2()),
                cameraNear: new Uniform(null),
                cameraFar: new Uniform(null),
                kernelRadius: new Uniform(1.5),
                edlStrength: new Uniform(0.7),
            },
            blending: NoBlending,
            toneMapped: false,
            depthWrite: false,
            depthTest: false,
            fragmentShader: EDLShader.fragmentShader,
            vertexShader: EDLShader.vertexShader,
        });

        this.copyCameraSettings(camera);

        this.resolution = new Vector2();
    }

    copyCameraSettings(camera?: PerspectiveCamera | OrthographicCamera) {
        if (camera) {
            this.uniforms.cameraNear.value = camera.near;
            this.uniforms.cameraFar.value = camera.far;
            this.needsUpdate = true;
        }
    }

    setSize(width: number, height: number) {
        this.resolution.set(width, height);
    }
}
