import { DebugTilesPlugin } from '3d-tiles-renderer';

import { PNTS_MODE, PNTS_SHAPE, PNTS_SIZE_MODE } from 'Renderer/PointsMaterial';
import GeometryDebug from './GeometryDebug';

export default function createOGC3DTilesDebugUI(datDebugTool, view, _3dTileslayer) {
    const gui = GeometryDebug.createGeometryDebugUI(datDebugTool, view, _3dTileslayer);

    // add wireframe
    GeometryDebug.addWireFrameCheckbox(gui, view, _3dTileslayer);

    gui.add({ frozen: _3dTileslayer.frozen }, 'frozen').onChange(((value) => {
        _3dTileslayer.frozen = value;
        view.notifyChange(_3dTileslayer);
    }));

    // Add debug plugin
    const debugTilesPlugin = new DebugTilesPlugin();
    _3dTileslayer.tilesRenderer.registerPlugin(debugTilesPlugin);

    gui.add(debugTilesPlugin, 'displayBoxBounds').name('Bounding boxes').onChange(() => {
        view.notifyChange(view.camera3D);
    });

    gui.add(debugTilesPlugin, 'displaySphereBounds').name('Bounding spheres').onChange(() => {
        view.notifyChange(view.camera3D);
    });

    gui.add(debugTilesPlugin, 'displayRegionBounds').name('Bounding regions').onChange(() => {
        view.notifyChange(view.camera3D);
    });

    // The sse Threshold for each tile
    gui.add(_3dTileslayer, 'sseThreshold', 0, 100).name('sseThreshold').onChange(() => {
        view.notifyChange(view.camera3D);
    });

    function setupPntsDebug({ scene }) {
        let hasPnts = false;
        scene.traverse((obj) => {
            if (obj.isPoints) {
                hasPnts = true;
            }
        });

        if (!hasPnts) { return; }

        const _3DTILES_PNTS_MODE = {
            CLASSIFICATION: PNTS_MODE.CLASSIFICATION,
            COLOR: PNTS_MODE.COLOR,
        };
        gui.add(_3dTileslayer, 'pntsMode', _3DTILES_PNTS_MODE).name('Display mode').onChange(() => {
            _3dTileslayer.pntsMode = +_3dTileslayer.pntsMode;
            view.notifyChange(view.camera.camera3D);
        });
        gui.add(_3dTileslayer, 'pntsShape', PNTS_SHAPE).name('Points Shape').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });
        gui.add(_3dTileslayer, 'pntsSizeMode', PNTS_SIZE_MODE).name('Pnts size mode').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });
        gui.add(_3dTileslayer, 'pntsMinAttenuatedSize', 0, 15).name('Min attenuated size').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });
        gui.add(_3dTileslayer, 'pntsMaxAttenuatedSize', 0, 15).name('Max attenuated size').onChange(() => {
            view.notifyChange(view.camera.camera3D);
        });

        _3dTileslayer.removeEventListener('load-model', setupPntsDebug);
    }

    _3dTileslayer.addEventListener('load-model', setupPntsDebug);
}
