import {
    PerspectiveCamera,
    ShaderMaterial,
    type WebGLRenderer,
    type WebGLRenderTarget,
    Texture,
    Vector2,
} from 'three';
import { Pass } from 'postprocessing';
import { MakeEDLShader } from './EDLShader';

class EDLPass extends Pass {
    constructor(width = 256, height = 256, kernelSize = 8) {
        super('EDLPass');
        this.needsDepthTexture = true;

        this.fullscreenMaterial = MakeEDLShader(
            kernelSize,
            width,
            height,
        );
    }

    get resolution(): Vector2 {
        return (this.fullscreenMaterial as ShaderMaterial).uniforms.resolution
            .value;
    }

    get strength(): number {
        return (this.fullscreenMaterial as ShaderMaterial).uniforms.edlStrength
            .value;
    }

    set strength(value: number) {
        (this.fullscreenMaterial as ShaderMaterial).uniforms.edlStrength.value =
            value;
    }

    get kernelRadius(): number {
        return (this.fullscreenMaterial as ShaderMaterial).uniforms.kernelRadius
            .value;
    }

    set kernelRadius(value: number) {
        (
            this.fullscreenMaterial as ShaderMaterial
        ).uniforms.kernelRadius.value = value;
    }

    setDepthTexture(depthTexture: Texture): void {
        (this.fullscreenMaterial as ShaderMaterial).uniforms.tDepth.value =
            depthTexture;
    }

    setSize(width: number, height: number) {
        (
            this.fullscreenMaterial as ShaderMaterial
        ).uniforms.resolution.value.set(width, height);
    }

    copyCameraSettings() {
        const u = (this.fullscreenMaterial as ShaderMaterial).uniforms;
        u.cameraNear.value = (this.camera instanceof PerspectiveCamera ? this.camera.near : 0);
        u.cameraFar.value = (this.camera instanceof PerspectiveCamera ? this.camera.far : 1);

        (this.fullscreenMaterial as ShaderMaterial).defines.PERSPECTIVE_CAMERA =
            this.camera instanceof PerspectiveCamera ? 1 : 0;
    }

    render(
        renderer: WebGLRenderer,
        inputBuffer: WebGLRenderTarget,
        outputBuffer: WebGLRenderTarget,
    ) {
        const u = (this.fullscreenMaterial as ShaderMaterial).uniforms;
        u.tDiffuse.value = inputBuffer.texture;

        this.copyCameraSettings();

        renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
        renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.fullscreenMaterial.dispose();
    }
}

export { EDLPass };
