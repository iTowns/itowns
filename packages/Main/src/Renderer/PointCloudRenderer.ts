import {
    type Camera,
    type Scene,
    type WebGLRenderer,
    HalfFloatType,
} from 'three';
import { EffectComposer, LambdaPass, RenderPass } from 'postprocessing';
import { View, Layer } from 'Main';
import { EDLPass } from './Postprocessing/EDLPass';

type LayerWithObject3d = Layer & { object3d: { visible: boolean } };

class PointCloudRenderer {
    private _composer: EffectComposer;
    private _edlPass: EDLPass;
    private _terrainPass: RenderPass;

    private _currentOthers: LayerWithObject3d[] = [];
    private _currentPCs: LayerWithObject3d[] = [];

    constructor(renderer: WebGLRenderer, width: number, height: number) {
        this._composer = new EffectComposer(renderer, {
            frameBufferType: HalfFloatType,
        });
        this._terrainPass = new RenderPass();
        this._edlPass = new EDLPass(width, height);

        this._composer.addPass(new LambdaPass(() => {
            this._currentOthers.forEach((l) => { l.object3d.visible = true; });
            this._currentPCs.forEach((l) => { l.object3d.visible = false; });
        }));
        this._composer.addPass(this._terrainPass);
        this._composer.addPass(new LambdaPass(() => {
            this._currentOthers.forEach((l) => { l.object3d.visible = false; });
            this._currentPCs.forEach((l) => { l.object3d.visible = true; });
        }));
        this._composer.addPass(this._edlPass);
    }

    setSize(width: number, height: number) {
        this._composer.setSize(width, height);
    }

    render(scene: Scene, camera: Camera, view: View) {
        const layers = view.getLayers(l => l.isGeometryLayer && l.visible);
        this._currentOthers = layers.filter(l => !l.isPointCloudLayer);
        this._currentPCs = layers.filter(l => l.isPointCloudLayer);

        this._composer.setMainCamera(camera);
        this._composer.setMainScene(scene);
        this._composer.render();

        // Restore visibility after all passes have run
        // Needs to be done here as Lambda pass would break final render
        this._currentOthers.forEach((l) => { l.object3d.visible = true; });
        this._currentPCs.forEach((l) => { l.object3d.visible = true; });
    }
}

export default PointCloudRenderer;
