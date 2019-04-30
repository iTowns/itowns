import { CameraHelper, Color, Vector3 } from 'three';
import Coordinates from 'Core/Geographic/Coordinates';
import { MAIN_LOOP_EVENTS } from 'Core/MainLoop';
import OBB from 'Renderer/OBB';
import ThreeStatsChart from './charts/ThreeStatsChart';
import OBBHelper from './OBBHelper';

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

    this.charts = [];

    this.charts.push(new ThreeStatsChart('three-info', view.mainLoop.gfxEngine.renderer));

    const charts = this.charts;
    const tileLayer = view.tileLayer;

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

    let before;
    const startChart = () => {
        before = Date.now();
    };
    const endChart = () => {
        const duration = Date.now() - before;
        // debug graphs update
        debugChartUpdate(duration);
    };

    // charts
    gui.add(state, 'displayCharts').name('Display charts').onChange((newValue) => {
        if (newValue) {
            view.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_START, startChart);
            view.addFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, endChart);
            chartDivContainer.style.display = 'flex';
        } else {
            view.removeFrameRequester(MAIN_LOOP_EVENTS.UPDATE_START, startChart);
            view.removeFrameRequester(MAIN_LOOP_EVENTS.UPDATE_END, endChart);
            chartDivContainer.style.display = 'none';
        }
        view.notifyChange();
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

    // Camera debug
    const helper = new CameraHelper(view.camera.camera3D);
    const debugCamera = view.camera.camera3D.clone();
    debugCamera.fov *= 1.5;
    debugCamera.updateProjectionMatrix();
    const g = view.mainLoop.gfxEngine;
    const r = g.renderer;
    let fogDistance = 10e10;
    const layerAtmosphere = view.getLayerById('atmosphere');
    if (layerAtmosphere) {
        fogDistance = layerAtmosphere.fog.distance;
    }
    helper.visible = false;
    view.scene.add(helper);

    // Displayed tiles boundind box
    const displayedTilesObb = new OBB();
    const displayedTilesObbHelper = new OBBHelper(displayedTilesObb);
    displayedTilesObbHelper.visible = false;
    view.scene.add(displayedTilesObb);
    displayedTilesObb.add(displayedTilesObbHelper);

    function updateFogDistance(obj) {
        if (obj.material && fogDistance) {
            obj.material.fogDistance = fogDistance;
        }
    }

    const bClearColor = new Color();
    const lookAtCameraDebug = new Vector3();
    function renderCameraDebug() {
        if (state.debugCameraWindow && debugCamera) {
            const ratio = 0.25;
            const size = { x: g.width * ratio, y: g.height * ratio };
            debugCamera.aspect = size.x / size.y;
            const camera = view.camera.camera3D;
            const coord = new Coordinates(view.referenceCrs, camera.position).as(tileLayer.extent.crs);
            const extent = view.tileLayer.info.displayed.extent;
            displayedTilesObb.setFromExtent(extent);
            displayedTilesObbHelper.visible = true;
            displayedTilesObbHelper.update(displayedTilesObb);

            // Note Method to compute near and far...
            // const bbox = displayedTilesObb.box3D.clone().applyMatrix4(displayedTilesObb.matrixWorld);
            // const distance = bbox.distanceToPoint(view.camera.camera3D.position);
            // console.log('distance', distance, distance + bbox.getBoundingSphere(sphere).radius * 2);

            // Compute position camera debug
            const altitudeCameraDebug = 1.5 * coord.z;
            coord.z = altitudeCameraDebug;
            coord.as(view.referenceCrs).toVector3(debugCamera.position);
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

            debugCamera.updateProjectionMatrix();
            if (layerAtmosphere) {
                layerAtmosphere.object3d.visible = false;
                fogDistance = 10e10;
                for (const obj of tileLayer.level0Nodes) {
                    obj.traverseVisible(updateFogDistance);
                }
            }
            helper.visible = true;
            helper.updateMatrixWorld(true);
            bClearColor.copy(r.getClearColor());
            r.setViewport(g.width - size.x, 0, size.x, size.y);
            r.setScissor(g.width - size.x, 0, size.x, size.y);
            r.setScissorTest(true);
            r.setClearColor(0xeeeeee);
            r.clear();
            r.render(view.scene, debugCamera);
            r.setScissorTest(false);
            r.setClearColor(bClearColor);
            r.setViewport(0, 0, g.width, g.height);

            helper.visible = false;
            displayedTilesObbHelper.visible = false;
            if (layerAtmosphere) {
                layerAtmosphere.object3d.visible = true;
            }
            if (layerAtmosphere) {
                fogDistance = layerAtmosphere.fog.distance;
                for (const obj of tileLayer.level0Nodes) {
                    obj.traverseVisible(updateFogDistance);
                }
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
