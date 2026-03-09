import {
    type Camera,
    type Scene,
    type WebGLRenderer,
    WebGLRenderTarget,
    PerspectiveCamera,
    Vector2,
} from 'three';
import { EffectComposer, RenderPass, ShaderPass } from 'postprocessing';
// import { EDLPass } from 'Renderer/Postprocessing/EDLPass';
import { EDLMaterial } from './Postprocessing/EDLMaterial';


class PointCloudRenderer {
    private _composer: EffectComposer;
    private _renderPass: RenderPass;
    private _shaderPass: ShaderPass;
    // private _edlPass: EDLPass;

    constructor(renderer: WebGLRenderer, width: number, height: number) {
        const renderTarget = new WebGLRenderTarget(width, height);
        this._composer = new EffectComposer(renderer, renderTarget);
        this._renderPass = new RenderPass();
        // this._edlPass = new EDLPass(camera, width, height);
        this._composer.addPass(this._renderPass);
        this._shaderPass = new ShaderPass(new EDLMaterial());
        this._shaderPass.renderToScreen = true;
        this._composer.addPass(this._shaderPass);
    }

    render(scene: Scene, camera: Camera) {
        this._renderPass.mainScene = scene;
        this._renderPass.mainCamera = camera;
        (this._shaderPass.fullscreenMaterial as EDLMaterial).copyCameraSettings(camera as PerspectiveCamera);
        const size = new Vector2();
        this._composer.getRenderer().getSize(size);
        (this._shaderPass.fullscreenMaterial as EDLMaterial).setSize(size.width, size.height);
        this._composer.render();
    }
}

export default PointCloudRenderer;
