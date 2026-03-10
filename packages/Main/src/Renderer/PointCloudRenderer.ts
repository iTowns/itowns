import {
    type Camera,
    type Scene,
    type WebGLRenderer,
    HalfFloatType,
} from 'three';
import { EffectComposer, LambdaPass, RenderPass } from 'postprocessing';
import { View, Layer } from 'Main';
import { EDLPass } from './Postprocessing/EDLPass';
import { OutputPass } from './Postprocessing/OutputPass';
import { SwapPass } from './Postprocessing/SwapPass';

/**
 * According to this issue, using a SwapPass and OutputPass is required
 * when rendering using the same depth texture in multiple passes
 * https://github.com/pmndrs/postprocessing/discussions/564
 *
 * This should be fixed in postprocessing v7, which is in alpha as of 10-03-2026
 */

type LayerWithObject3d = Layer & { object3d: { visible: boolean } };

class PointCloudRenderer {
    private _composer: EffectComposer;
    private _renderPass: RenderPass;
    private _edlPass: EDLPass;
    private _terrainPass: RenderPass;

    private _currentPCs: LayerWithObject3d[] = [];
    private _currentOthers: LayerWithObject3d[] = [];

    constructor(renderer: WebGLRenderer, width: number, height: number) {
        this._composer = new EffectComposer(renderer, {
            frameBufferType: HalfFloatType,
        });
        this._renderPass = new RenderPass();
        this._edlPass = new EDLPass(width, height);
        this._terrainPass = new RenderPass();
        // Prevent clearing point cloud
        this._terrainPass.clearPass.enabled = false;

        this._composer.addPass(new LambdaPass(() => {
            this._currentOthers.forEach((l) => { l.object3d.visible = false; });
        }));
        this._composer.addPass(this._renderPass);
        this._composer.addPass(this._edlPass);
        // Swap input and output buffers
        this._composer.addPass(new SwapPass());
        this._composer.addPass(new LambdaPass(() => {
            this._currentOthers.forEach((l) => { l.object3d.visible = true; });
            this._currentPCs.forEach((l) => { l.object3d.visible = false; });
        }));
        this._composer.addPass(this._terrainPass);
        this._composer.addPass(new LambdaPass(() => {
            this._currentPCs.forEach((l) => { l.object3d.visible = true; });
        }));
        // Render to screen
        this._composer.addPass(new OutputPass());
    }

    setSize(width: number, height: number) {
        this._composer.setSize(width, height);
    }

    render(scene: Scene, camera: Camera, view: View) {
        const layers = view.getLayers(l => l.isGeometryLayer && l.visible);
        this._currentPCs = layers.filter(l => l.isPointCloudLayer);
        this._currentOthers = layers.filter(l => !l.isPointCloudLayer);

        this._composer.setMainCamera(camera);
        this._composer.setMainScene(scene);
        this._composer.render();
    }
}

export default PointCloudRenderer;
