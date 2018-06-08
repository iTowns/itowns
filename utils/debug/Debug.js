import { CameraHelper, Color, Vector3 } from 'three';
import Coordinates from '../../src/Core/Geographic/Coordinates';
import ThreeStatsChart from './charts/ThreeStatsChart';
import CameraNearFarChart from './charts/CameraNearFarChart';
import { MAIN_LOOP_EVENTS } from '../../src/Core/MainLoop';
import PanoramaView from '../../src/Core/Prefab/PanoramaView';

/**
 * Create a debug instance attached to an itowns instance
 *
 * @Constructor
 * @param {Scene} scene the itowns Scene
 * @return {Debug} a debug instance
 */

// disabling eslint errors as it is the exported constructor
function Debug(view, datDebugTool, chartDivContainer) {
    // CHARTS
    // Create default charts div if missing
    if (!chartDivContainer) {
        chartDivContainer = document.createElement('div');
        chartDivContainer.id = 'chart-div';
        chartDivContainer.style.cssText = 'position: absolute; bottom: 0; left: 0; width: 100vw; height: 20rem; background-color: white; display: none';
        document.body.appendChild(chartDivContainer);
    }

    this.chartDivContainer = chartDivContainer;
    this.createChartContainer('three-info');
    this.createChartContainer('camera-range');

    this.charts = [];

    this.charts.push(new ThreeStatsChart('three-info', view.mainLoop.gfxEngine.renderer));
    this.charts.push(new CameraNearFarChart('camera-range', view.camera.camera3D));

    const charts = this.charts;
    const tileLayer = view.tileLayer || view.wgs84TileLayer || view.baseLayer;

    function debugChartUpdate(updateDuration) {
        const displayed = chartDivContainer.style.display != 'none';
        charts.forEach(c => c.update(displayed, updateDuration));
    }

    // DEBUG CONTROLS
    const gui = datDebugTool.addFolder('Debug Tools');

    const state = {
        displayCharts: false,
        eventsDebug: false,
        debugCameraWindow: false,
        freeze: false,
    };

    // charts
    gui.add(state, 'displayCharts').name('Display charts').onChange((newValue) => {
        if (newValue) {
            chartDivContainer.style.display = 'flex';
        } else {
            chartDivContainer.style.display = 'none';
        }
    });

    gui.add(state, 'debugCameraWindow').name('debug Camera').onChange((value) => {
        if (value) {
            view.addFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, renderCameraDebug);
        } else {
            view.removeFrameRequester(MAIN_LOOP_EVENTS.AFTER_RENDER, renderCameraDebug);
        }
        view.notifyChange();
    });

    gui.add(state, 'freeze').name('freeze update').onChange((newValue) => {
        tileLayer.frozen = newValue;
        view.notifyChange();
    });

    gui.add(state, 'eventsDebug').name('Debug event').onChange((() => {
        let eventFolder;
        return (newValue) => {
            const controls = view.controls;
            const listeners = [];
            if (newValue) {
                eventFolder = gui.addFolder('Events');

                // camera-target-updated event
                const initialPosition = new Coordinates(view.referenceCrs, controls.getCameraTargetPosition()).as('EPSG:4326');
                const roundedLat = Math.round(initialPosition.latitude() * 10000) / 10000;
                const roundedLon = Math.round(initialPosition.longitude() * 10000) / 10000;
                state.cameraTargetUpdated = `lat: ${roundedLat} lon: ${roundedLon}`;
                const cameraTargetUpdatedController = eventFolder.add(state, 'cameraTargetUpdated').name('camera-target-changed');
                const cameraTargetListener = (ev) => {
                    const positionGeo = ev.new.cameraTarget.as('EPSG:4326');
                    const roundedLat = Math.round(positionGeo.latitude() * 10000) / 10000;
                    const roundedLon = Math.round(positionGeo.longitude() * 10000) / 10000;
                    state.cameraTargetUpdated = `lat: ${roundedLat} lon: ${roundedLon}`;
                    cameraTargetUpdatedController.updateDisplay();
                };
                controls.addEventListener('camera-target-changed', cameraTargetListener);
                listeners.push({ type: 'camera-target-changed', stateName: 'cameraTargetUpdated', fn: cameraTargetListener });
            } else {
                for (const listener of listeners) {
                    controls.removeEventListener(listener.type, listener.fn);
                    delete state[listener.stateName];
                }
                gui.removeFolder('Events');
            }
        };
    })());


    let before;
    view.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_START, () => {
        before = Date.now();
    });
    view.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, () => {
        const duration = Date.now() - before;
        // debug graphs update
        debugChartUpdate(duration);
    });

    // Camera debug
    const helper = new CameraHelper(view.camera.camera3D);
    const debugCamera = view.camera.camera3D.clone();
    debugCamera.fov *= 1.5;
    debugCamera.updateProjectionMatrix();
    const g = view.mainLoop.gfxEngine;
    const r = g.renderer;
    let fogDistance = view.fogDistance;
    helper.visible = false;
    view.scene.add(helper);

    function updateFogDistance(obj) {
        if (obj.setFog && fogDistance) {
            obj.setFog(fogDistance);
        }
    }

    const bClearColor = new Color();
    const lookAtCameraDebug = new Vector3();
    function renderCameraDebug() {
        if (state.debugCameraWindow && debugCamera) {
            const size = { x: g.width * 0.2, y: g.height * 0.2 };
            debugCamera.aspect = size.x / size.y;
            const camera = view.camera.camera3D;
            const coord = new Coordinates(view.referenceCrs, camera.position).as(tileLayer.extent._crs);
            if (view instanceof PanoramaView) {
                debugCamera.position.set(0, 0, 100);
                camera.localToWorld(debugCamera.position);
                debugCamera.lookAt(camera.position);
            } else {
                // Compute position camera debug
                const altitudeCameraDebug = 1.5 * coord._values[2];
                coord._values[2] = altitudeCameraDebug;
                coord.as(view.referenceCrs).xyz(debugCamera.position);
                // Compute recoil camera
                camera.worldToLocal(debugCamera.position);
                debugCamera.position.z += altitudeCameraDebug;
                camera.localToWorld(debugCamera.position);
                // Compute target camera debug
                lookAtCameraDebug.copy(view.camera.camera3D.position);
                camera.worldToLocal(lookAtCameraDebug);
                lookAtCameraDebug.z -= altitudeCameraDebug * 1.5;
                camera.localToWorld(lookAtCameraDebug);
                debugCamera.lookAt(lookAtCameraDebug);
            }

            debugCamera.updateProjectionMatrix();
            if (view.atmosphere) {
                view.atmosphere.visible = false;
            }
            fogDistance = 10e10;
            for (const obj of tileLayer.level0Nodes) {
                obj.traverseVisible(updateFogDistance);
            }
            helper.visible = true;
            helper.updateMatrixWorld(true);
            bClearColor.copy(r.getClearColor());
            r.setViewport(g.width - size.x, g.height - size.y, size.x, size.y);
            r.setScissor(g.width - size.x, g.height - size.y, size.x, size.y);
            r.setScissorTest(true);
            r.setClearColor(0xeeeeee);
            r.clear();
            r.clearDepth();
            r.render(view.scene, debugCamera);
            r.setScissorTest(false);
            r.setClearColor(bClearColor);
            helper.visible = false;
            if (view.atmosphere) {
                view.atmosphere.visible = true;
            }
            fogDistance = view.fogDistance;
            for (const obj of tileLayer.level0Nodes) {
                obj.traverseVisible(updateFogDistance);
            }
        }
    }
}


Debug.prototype.createChartContainer = function createChartContainer(chartId) {
    const div = document.createElement('div');
    div.style.cssText = 'width: 100%; height: 100%; background-color: white;';
    this.chartDivContainer.appendChild(div);

    const chartCanvas = document.createElement('canvas');
    chartCanvas.height = '20rem';
    chartCanvas.id = chartId;
    div.appendChild(chartCanvas);
};

Debug.prototype.updateChartDivSize = function updateChartDivSize() {
    let count = 0;
    for (const div of this.chartDivContainer.getElementsByTagName('div')) {
        if (div.style.display !== 'none') {
            count++;
        }
    }
    const size = Math.floor(100 / count);
    for (const div of this.chartDivContainer.getElementsByTagName('div')) {
        if (div.style.display !== 'none') {
            div.style.width = `${size}%`;
        }
    }
    this.charts.forEach((c) => {
        c.resize();
        c.update();
    });
};

export default Debug;
