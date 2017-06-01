/* global menuGlobe */
import Chart from 'chart.js';
import Coordinates from '../../src/Core/Geographic/Coordinates';
import OBBHelper from './OBBHelper';
import View from '../../src/Core/View';


function createChartContainer(chartDiv, width, left, chartId) {
    const div = document.createElement('div');
    div.style = `position: absolute; bottom: 0; left: ${left}vw; width: ${width}vw; height: 20rem; background-color: white;`;
    chartDiv.appendChild(div);

    const chartCanvas = document.createElement('canvas');
    chartCanvas.heigth = '20rem';
    chartCanvas.width = `${width}vw`;
    chartCanvas.id = chartId;
    div.appendChild(chartCanvas);
}

function ObjectsChart(chartDiv, width, left) {
    createChartContainer(chartDiv, width, left, 'nb-objects');

    let lastValidCompareIndex = 0;
    const timestamp = Date.now();
    const viewLevelStartDataset = { label: 'Update 1st level', data: [{ x: 0, y: 0 }] };
    const viewUpdateDurationDataset = { label: 'Update duration (ms)', data: [{ x: 0, y: 0 }], borderColor: 'rgba(75,192,192,1)' };
    const label = ['0s'];
    const nbObjectsChart = new Chart('nb-objects', {
        type: 'line',
        data: {
            labels: label,
            datasets: [viewLevelStartDataset, viewUpdateDurationDataset],
        },
        options: {
            animation: { duration: 10 },
            scales: {
                yAxes: [{
                    display: true,
                    ticks: {
                        suggestedMin: 0, // minimum will be 0, unless there is a lower value.
                    },
                }],
            },
        },
    });

    this.update = (displayed, updateStartLevel, updateDuration) => {
        // update line graph
        // update time
        const limit = 60;
        const timeInS = Math.floor((Date.now() - timestamp) / 1000);
        const lbl = `${timeInS}s`;
        const identical = (lastValidCompareIndex > 0 && label[lastValidCompareIndex] == lbl);
        if (identical) {
            label.push('');
        } else {
            label.push(lbl);
            lastValidCompareIndex = label.length - 1;
        }

        if (label.length > limit) {
            label.shift();
            lastValidCompareIndex--;
        }

        viewLevelStartDataset.data.push({ x: 0, y: updateStartLevel });
        viewUpdateDurationDataset.data.push({ x: 0, y: updateDuration });
        if (viewLevelStartDataset.data.length > limit) {
            viewLevelStartDataset.data.shift();
            viewUpdateDurationDataset.data.shift();
        }

        if (displayed) {
            nbObjectsChart.update();
        }
    };
}

function LevelsChart(chartDiv, width, left) {
    createChartContainer(chartDiv, width, left, 'nb-visible');

    const nbVisibleLabels = [];
    const nbVisibleData = [];
    const nbDisplayedData = [];
    const nbVisibleChart = new Chart('nb-visible', {
        type: 'bar',
        data: {
            labels: nbVisibleLabels,
            datasets: [
                {
                    label: 'Visible node per level',
                    data: nbVisibleData,
                    backgroundColor: 'rgba(75, 192, 192, 1)',
                },
                {
                    label: 'Diplayed node per level',
                    data: nbDisplayedData,
                    backgroundColor: 'rgba(153, 102, 255, 1)',
                },
            ],
        },
        options: {
            scales: {
                yAxes: [{
                    display: true,
                    ticks: {
                        suggestedMin: 0, // minimum will be 0, unless there is a lower value.
                    },
                }],
            },
        },
    });

    this.update = (displayed, view) => {
        function countVisible(node, stats) {
            if (!node || !node.visible) {
                return;
            }
            if (node.level) {
                if (stats[node.level]) {
                    stats[node.level][0] += 1;
                } else {
                    stats[node.level] = [1, 0];
                }
                if (node.material.visible) {
                    stats[node.level][1] += 1;
                }
            }
            if (node.children) {
                for (const child of node.children) {
                    countVisible(child, stats);
                }
            }
        }

        // update bar graph
        const stats = {};
        countVisible(view.scene, stats);
        nbVisibleLabels.length = 0;
        nbVisibleData.length = 0;
        for (const level in stats) {
            if ({}.hasOwnProperty.call(stats, level)) {
                nbVisibleLabels[level - 1] = `${level}`;
                nbVisibleData[level - 1] = stats[level][0];
                nbDisplayedData[level - 1] = stats[level][1];
            }
        }

        if (displayed) {
            nbVisibleChart.update();
        }
    };
}

function ThreeStats(chartDiv, width, left) {
    createChartContainer(chartDiv, width, left, 'three-info');

    let lastValidCompareIndex = -1;
    const timestamp = Date.now();
    const textureDataset = { label: 'texture count', data: [{ x: 0, y: 0 }] };
    const geometryDataset = { label: 'geometry count', data: [{ x: 0, y: 0 }], borderColor: 'rgba(75,192,192,1)' };
    const label = ['0s'];
    const chart = new Chart('three-info', {
        type: 'line',
        data: {
            labels: label,
            datasets: [textureDataset, geometryDataset],
        },
        options: {
            animation: { duration: 10 },
            scales: {
                yAxes: [{
                    display: true,
                    ticks: {
                        suggestedMin: 0, // minimum will be 0, unless there is a lower value.
                    },
                }],
            },
        },
    });

    this.update = (displayed, view) => {
        const limit = 60;
        const timeInS = Math.floor((Date.now() - timestamp) / 1000);
        const lbl = `${timeInS}s`;

        const identical = (lastValidCompareIndex > 0 && label[lastValidCompareIndex] == lbl);
        if (identical) {
            label.push('');
        } else {
            label.push(lbl);
            lastValidCompareIndex = label.length - 1;
        }

        if (label.length > limit) {
            label.shift();
            lastValidCompareIndex--;
        }

        const memory = view.mainLoop.gfxEngine.renderer.info.memory;
        textureDataset.data.push({ x: timeInS, y: memory.textures });
        geometryDataset.data.push({ x: timeInS, y: memory.geometries });
        if (textureDataset.data.length > limit) {
            textureDataset.data.shift();
            geometryDataset.data.shift();
        }

        if (displayed) {
            chart.update();
        }
    };
}


/**
 * Create a debug instance attached to an itowns instance
 *
 * @Constructor
 * @param {Scene} scene the itowns Scene
 * @return {Debug} a debug instance
 */

// disabling eslint errors as it is the exported constructor
function Debug(view, viewerDiv) {
    // CHARTS
    // create charts div
    const chartDiv = document.createElement('div');
    chartDiv.id = 'chart-div';
    chartDiv.style = 'position: absolute; bottom: 0; left: 0; width: 100vw; height: 20rem; background-color: white; display: none';

    viewerDiv.appendChild(chartDiv);

    const objectChart = new ObjectsChart(chartDiv, 33, 0);
    const levelsChart = new LevelsChart(chartDiv, 33, 33);
    const threeStats = new ThreeStats(chartDiv, 33, 66);

    function debugChartUpdate(updateStartLevel, updateDuration) {
        const displayed = chartDiv.style.display != 'none';

        objectChart.update(displayed, updateStartLevel, updateDuration);
        levelsChart.update(displayed, view);
        threeStats.update(displayed, view);
    }

    // DEBUG CONTROLS
    const gui = menuGlobe.gui.addFolder('Debug Tools');

    const state = {
        showOutline: false,
        wireframe: false,
        displayCharts: false,
        eventsDebug: false,
    };

    // charts
    gui.add(state, 'displayCharts').name('Display charts').onChange((newValue) => {
        if (newValue) {
            chartDiv.style.display = 'flex';
        } else {
            chartDiv.style.display = 'none';
        }
    });

    function applyToNodeFirstMaterial(cb) {
        view.scene.traverse((object) => {
            if (object.materials) {
                cb(object.materials[0]);
            }
        });
        view.notifyChange();
    }

    // tiles outline
    gui.add(state, 'showOutline').name('Show tiles outline').onChange((newValue) => {
        for (const geometryLayer of view._layers) {
            geometryLayer.showOutline = newValue;
        }
        applyToNodeFirstMaterial((material) => {
            material.uniforms.showOutline = { value: newValue };
            material.needsUpdate = true;
        });
        view.notifyChange(true);
    });

    // tiles wireframe
    gui.add(state, 'wireframe').name('Wireframe').onChange((newValue) => {
        for (const geometryLayer of view._layers) {
            geometryLayer.wireframe = newValue;
        }
        applyToNodeFirstMaterial((material) => {
            material.wireframe = newValue;
        });
        view.notifyChange(true);
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

    // hook that to scene.update
    const ml = view.mainLoop;
    const oldUpdate = Object.getPrototypeOf(ml)._update.bind(ml);
    ml._update = function debugUpdate(view, ...args) {
        // regular itowns update
        const before = Date.now();
        oldUpdate(view, ...args);
        const duration = Date.now() - before;
        // debug graphs update
        debugChartUpdate(view._latestUpdateStartingLevel, duration);

        // obb layer update
        for (const gLayer of view._layers) {
            const obbLayerAlreadyAdded =
                view.getLayers(
                    (a, l) => l && l.id == gLayer.id && a.id.indexOf('_obb_debug') >= 0).length > 0;

            // missing obb layer -> add it
            if (!obbLayerAlreadyAdded) {
                addGeometryLayerDebugFeatures(gLayer, view, gui, state);
            }
        }
    };
}


function addGeometryLayerDebugFeatures(layer, view, gui, state) {
    const obb_layer_id = `${layer.id}_obb_debug`;

    // itowns layer definition
    const debugIdUpdate = function debugIdUpdate(context, layer, node) {
        const enabled = view.camera.camera3D.layers.test({ mask: 1 << layer.threejsLayer });

        if (!enabled) {
            return;
        }
        var n = node.children.filter(n => n.layer == obb_layer_id);

        if (node.material.visible) {
            if (n.length == 0) {
                const l = context.view.getLayers(l => l.id === obb_layer_id)[0];
                const helper = new OBBHelper(node.OBB(), `id:${node.id}`);
                helper.layer = obb_layer_id;
                const l3js = l.threejsLayer;
                helper.layers.set(l3js);
                helper.children[0].layers.set(l3js);
                node.add(helper);
                helper.updateMatrixWorld(true);

                n = helper;
            } else {
                n = n[0];
            }

            n.setMaterialVisibility(true);
            n.update(node.OBB());
        } else if (n.length > 0) {
            n[0].setMaterialVisibility(false);
        }
    };
    let debugLayer = {
        id: obb_layer_id,
        type: 'debug',
        update: debugIdUpdate,
        visible: false,
    };

    debugLayer = View.prototype.addLayer.call(view, debugLayer, layer);

    // add to debug gui
    const folder = gui.addFolder(`Geometry Layer: ${layer.id}`);

    const enabled = view.camera.camera3D.layers.test({ mask: 1 << layer.threejsLayer });
    state[layer.id] = enabled;

    folder.add(state, layer.id).name('Visible').onChange((newValue) => {
        layer.visible = newValue;
        view.notifyChange(true);
    });

    state[debugLayer.id] = false;
    folder.add(state, debugLayer.id).name('OBB visible').onChange((newValue) => {
        debugLayer.visible = newValue;
        view.notifyChange(true);
    });

    var consistencyCheck = { click: () => {
        const imageryLayers = view.getLayers(a => a.type == 'color');
        for (const node of layer.level0Nodes) {
            node.traverse((n) => {
                if (n.materials && n.materials[0].visible) {
                    n.materials[0].checkLayersConsistency(n, imageryLayers);
                }
            });
        }
    } };
    folder.add(consistencyCheck, 'click').name('Check textures');
}

// eslint-disable-next-line import/prefer-default-export
export { Debug, OBBHelper };
