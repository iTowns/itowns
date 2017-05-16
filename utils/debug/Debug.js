/* global menuGlobe */
import Chart from 'chart.js';
import Coordinates from '../../src/Core/Geographic/Coordinates';
import OBBHelper from './OBBHelper';
import View from '../../src/Core/View';

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

    const leftChart = document.createElement('div');
    leftChart.id = 'chart-div-left';
    leftChart.style = 'position: absolute; bottom: 0; left: 0; width: 50vw; height: 20rem; background-color: white; display: flex';
    chartDiv.appendChild(leftChart);
    const rightChart = document.createElement('div');
    rightChart.id = 'chart-div-right';
    rightChart.style = 'position: absolute; bottom: 0; left: 50vw; width: 50vw; height: 20rem; background-color: white; display: flex';
    chartDiv.appendChild(rightChart);

    // line graph for nb elements
    const nbObjectsCanvas = document.createElement('canvas');
    nbObjectsCanvas.heigth = '20rem';
    nbObjectsCanvas.width = '50vw';
    nbObjectsCanvas.id = 'nb-objects';
    leftChart.appendChild(nbObjectsCanvas);

    // bar graph for nb visible elements
    const nbVisibleCanvas = document.createElement('canvas');
    nbVisibleCanvas.heigth = '20rem';
    nbVisibleCanvas.width = '50vw';
    nbVisibleCanvas.id = 'nb-visible';
    rightChart.appendChild(nbVisibleCanvas);

    const timestamp = Date.now();
    const nbObjectsDataset = { label: 'Number of objects in Scene', data: [{ x: 0, y: 0 }] };
    const nbVisibleDataset = { label: 'Number of visible objects in Scene', data: [{ x: 0, y: 0 }], borderColor: 'rgba(75,192,192,1)' };
    const nbDisplayedDataset = { label: 'Number of displayed objects in Scene', data: [{ x: 0, y: 0 }], borderColor: 'rgba(153, 102, 255, 1)' };
    const nbObjectsChartLabel = ['0s'];
    const nbObjectsChart = new Chart('nb-objects', {
        type: 'line',
        data: {
            labels: nbObjectsChartLabel,
            datasets: [nbObjectsDataset, nbVisibleDataset, nbDisplayedDataset],
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

    function debugChartUpdate() {
        function countElem(node) {
            if (!node) {
                return 0;
            }
            let count = 1; // this node
            if (node.children) {
                for (const child of node.children) {
                    count += countElem(child);
                }
            }
            return count;
        }

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
        countVisible(view.mainLoop.gfxEngine.scene3D, stats);
        let totalVisible = 0;
        let totalDisplayed = 0;
        nbVisibleLabels.length = 0;
        nbVisibleData.length = 0;
        for (const level in stats) {
            if ({}.hasOwnProperty.call(stats, level)) {
                nbVisibleLabels[level - 1] = `${level}`;
                nbVisibleData[level - 1] = stats[level][0];
                nbDisplayedData[level - 1] = stats[level][1];
                totalVisible += stats[level][0];
                totalDisplayed += stats[level][1];
            }
        }


        // update line graph
        const newCount = countElem(view.mainLoop.gfxEngine.scene3D);

        // test if we values didn't change
        if (nbObjectsDataset.data.length > 1) {
            const last = nbObjectsDataset.data.length - 1;
            if (nbObjectsDataset.data[last].y === newCount &&
                nbVisibleDataset.data[last].y === totalVisible &&
                nbDisplayedDataset.data[last].y === totalDisplayed) {
                // nothing change: drop the last point, to keep more interesting (changing)
                // data displayed
                nbObjectsDataset.data.pop();
                nbVisibleDataset.data.pop();
                nbDisplayedDataset.data.pop();
                nbObjectsChartLabel.pop();
            }
        }

        // update time
        const limit = 25;
        const timeInS = Math.floor((Date.now() - timestamp) / 1000);
        nbObjectsChartLabel.push(`${timeInS}s`);
        if (nbObjectsChartLabel.length > limit) {
            nbObjectsChartLabel.shift();
        }

        nbObjectsDataset.data.push({ x: timeInS, y: newCount });
        nbVisibleDataset.data.push({ x: timeInS, y: totalVisible });
        nbDisplayedDataset.data.push({ x: timeInS, y: totalDisplayed });
        if (nbObjectsDataset.data.length > limit) {
            nbObjectsDataset.data.shift();
            nbVisibleDataset.data.shift();
            nbDisplayedDataset.data.shift();
        }

        if (chartDiv.style.display != 'none') {
            nbObjectsChart.update();
            nbVisibleChart.update();
        }
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
        view.mainLoop.gfxEngine.scene3D.traverse((object) => {
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
    });

    // tiles wireframe
    gui.add(state, 'wireframe').name('Wireframe').onChange((newValue) => {
        for (const geometryLayer of view._layers) {
            geometryLayer.wireframe = newValue;
        }
        applyToNodeFirstMaterial((material) => {
            material.wireframe = newValue;
        });
    });

    gui.add(state, 'eventsDebug').name('Debug event').onChange((() => {
        let eventFolder;
        return (newValue) => {
            const controls = view.currentControls();
            const listeners = [];
            if (newValue) {
                eventFolder = gui.addFolder('Events');

                // camera-target-updated event
                const initialPosition = new Coordinates(view.referenceCrs, controls.getCameraTargetPosition()).as('EPSG:4326');
                const roundedLat = Math.round(initialPosition.latitude() * 10000) / 10000;
                const roundedLon = Math.round(initialPosition.longitude() * 10000) / 10000;
                state.cameraTargetUpdated = `lat: ${roundedLat} lon: ${roundedLon}`;
                const cameraTargetUpdatedController = eventFolder.add(state, 'cameraTargetUpdated').name('camera-target-updated');
                const cameraTargetListener = (ev) => {
                    const positionGeo = ev.newCameraTargetPosition.as('EPSG:4326');
                    const roundedLat = Math.round(positionGeo.latitude() * 10000) / 10000;
                    const roundedLon = Math.round(positionGeo.longitude() * 10000) / 10000;
                    state.cameraTargetUpdated = `lat: ${roundedLat} lon: ${roundedLon}`;
                    cameraTargetUpdatedController.updateDisplay();
                };
                controls.addEventListener('camera-target-updated', cameraTargetListener);
                listeners.push({ type: 'camera-target-updated', stateName: 'cameraTargetUpdated', fn: cameraTargetListener });
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
    ml._update = function debugUpdate(view) {
        // regular itowns update
        oldUpdate(view);
        // debug graphs update
        debugChartUpdate();
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
        } else if (n.length > 0) {
            n[0].setMaterialVisibility(false);
        }
    };
    const debugLayer = {
        id: obb_layer_id,
        type: 'debug',
        update: debugIdUpdate,
    };

    const threeLayer = view.mainLoop.gfxEngine.getUniqueThreejsLayer();
    View.prototype.addLayer.call(view, debugLayer, layer);
    debugLayer.threejsLayer = threeLayer;
    view.camera.camera3D.layers.disable(threeLayer);

    // add to debug gui
    const folder = gui.addFolder(`Geometry Layer: ${layer.id}`);

    const enabled = view.camera.camera3D.layers.test({ mask: 1 << layer.threeLayer });
    state[layer.id] = enabled;
    folder.add(state, layer.id).name('Visible').onChange((newValue) => {
        if (newValue) {
            view.camera.camera3D.layers.enable(layer.threeLayer);
        } else {
            view.camera.camera3D.layers.disable(layer.threeLayer);
        }
        view.notifyChange();
    });

    state[debugLayer.id] = false;
    folder.add(state, debugLayer.id).name('OBB visible').onChange((newValue) => {
        if (newValue) {
            view.camera.camera3D.layers.enable(debugLayer.threejsLayer);
        } else {
            view.camera.camera3D.layers.disable(debugLayer.threejsLayer);
        }
        view.notifyChange();
    });

    var consistencyCheck = { click: function() {
        const imageryLayers = view.getLayers(a => a.type == 'color');
        for (const node of layer.level0Nodes) {
            node.traverse((n) => {
                if (n.materials && n.materials[0].visible) {
                    n.materials[0].checkLayersConsistency(n, imageryLayers);
                }
            });
        }
    }};
    folder.add(consistencyCheck, 'click').name('Check textures');
}

export default Debug;
