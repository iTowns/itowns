import {
    PerspectiveCamera,
    ShaderMaterial,
    WebGLRenderTarget,
    type WebGLRenderer,
    Vector2,
    Camera,
    Object3DEventMap,
    Scene,
    DepthTexture,
    UnsignedShortType,
    HalfFloatType,
    LinearSRGBColorSpace,
} from 'three';
import { Pass } from 'postprocessing';
import { MakeEDLShader } from './EDLShader';

/**
 * A post-processing pass that applies Eye-Dome Lighting (EDL)
 * to enhance depth perception in point cloud rendering.
 *
 */
class EDLPass extends Pass {
    private _activeScene: Scene | null = null;
    private _activeCamera: Camera | null = null;
    private _pointCloudRenderTarget: WebGLRenderTarget;

    constructor(width = 256, height = 256, kernelSize = 8) {
        super('EDLPass');

        this.needsDepthTexture = false;

        this.fullscreenMaterial = MakeEDLShader(kernelSize, width, height);

        this._pointCloudRenderTarget = new WebGLRenderTarget(width, height, {
            type: HalfFloatType,
        });
        this._pointCloudRenderTarget.texture.colorSpace = LinearSRGBColorSpace;
        this._pointCloudRenderTarget.depthBuffer = true;
        this._pointCloudRenderTarget.depthTexture = new DepthTexture(width, height);
        this._pointCloudRenderTarget.depthTexture.type = UnsignedShortType;
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

    set mainCamera(camera: Camera) {
        this._activeCamera = camera;
        this.copyCameraSettings();
    }

    set mainScene(scene: Scene<Object3DEventMap>) {
        this._activeScene = scene;
    }

    setSize(width: number, height: number) {
        (this.fullscreenMaterial as ShaderMaterial).uniforms.resolution.value.set(width, height);
        this._pointCloudRenderTarget.setSize(width, height);
    }

    copyCameraSettings() {
        if (!this._activeCamera) {
            return;
        }
        const u = (this.fullscreenMaterial as ShaderMaterial).uniforms;
        u.cameraNear.value = (this._activeCamera instanceof PerspectiveCamera ?
            this._activeCamera.near : null);
        u.cameraFar.value = (this._activeCamera instanceof PerspectiveCamera ?
            this._activeCamera.far : null);

        (this.fullscreenMaterial as ShaderMaterial).defines.PERSPECTIVE_CAMERA =
            this._activeCamera instanceof PerspectiveCamera ? 1 : 0;
    }

    render(
        renderer: WebGLRenderer,
        inputBuffer: WebGLRenderTarget,
        outputBuffer: WebGLRenderTarget,
    ) {
        if (!this._activeScene || !this._activeCamera) {
            return;
        }

        // Render point clouds into a dedicated RT to get color + depth
        renderer.setRenderTarget(this._pointCloudRenderTarget);
        renderer.clear(true, true, true);
        renderer.render(this._activeScene, this._activeCamera);

        // set up EDL uniforms
        const u = (this.fullscreenMaterial as ShaderMaterial).uniforms;
        u.tDiffuse.value = this._pointCloudRenderTarget.texture;
        u.tDepth.value = this._pointCloudRenderTarget.depthTexture;
        u.tScene.value = inputBuffer.texture; // background from previous passes
        u.tSceneDepth.value = inputBuffer.depthTexture;

        this.copyCameraSettings();

        // render the EDL effect
        renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
        renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.fullscreenMaterial.dispose();
        this._pointCloudRenderTarget.dispose();
    }
}

export { EDLPass };
