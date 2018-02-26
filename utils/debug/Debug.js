import Coordinates from '../../src/Core/Geographic/Coordinates';
import ThreeStatsChart from './charts/ThreeStatsChart';
import { MAIN_LOOP_EVENTS } from '../../src/Core/MainLoop';

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

    function debugChartUpdate(updateDuration) {
        const displayed = chartDivContainer.style.display != 'none';
        charts.forEach(c => c.update(displayed, updateDuration));
    }

    // DEBUG CONTROLS
    const gui = datDebugTool.addFolder('Debug Tools');

    const state = {
        displayCharts: false,
        eventsDebug: false,
    };

    // charts
    gui.add(state, 'displayCharts').name('Display charts').onChange((newValue) => {
        if (newValue) {
            chartDivContainer.style.display = 'flex';
        } else {
            chartDivContainer.style.display = 'none';
        }
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
