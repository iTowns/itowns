import assert from 'assert';
import PlanarView from 'Core/Prefab/PlanarView';
import { CAMERA_TYPE } from 'Renderer/Camera';
import Extent from 'Core/Geographic/Extent';
import CameraUtils from 'Utils/CameraUtils';
import Renderer from './bootstrap';


describe('Underground Visualization', function () {
    const renderer = new Renderer();
    const extent = new Extent('EPSG:4326', -100, 100, -100, 100);

    const view = new PlanarView(renderer.domElement, extent, { renderer, camera: { type: CAMERA_TYPE.ORTHOGRAPHIC } });

    it('should decrease opacity while zooming', function () {
        let opacity0;
        const layer = view.getLayers(l => l.isPlanarLayer)[0];
        if (layer) {
            opacity0 = layer.opacity;
        }

        view.setUndergroundVisualization(true);
        const params = { range: 1000 };
        const camera = view.camera.camera3D;
        CameraUtils.transformCameraToLookAtTarget(
            view, camera, params,
        );

        let opacity1;
        if (layer) {
            opacity1 = layer.opacity;
        }

        assert.ok(opacity0 !== undefined && opacity0 > 0);
        assert.ok(opacity1 < opacity0);
    });


    it('should restore opacity when disabled', async () => {
        let opacity0;
        const layer = view.getLayers(l => l.isPlanarLayer)[0];
        if (layer) {
            opacity0 = layer.opacity;
        }
        view.setUndergroundVisualization(false);
        let opacity1;
        if (layer) {
            opacity1 = layer.opacity;
        }
        assert.ok(opacity1 > opacity0);
    });
});
