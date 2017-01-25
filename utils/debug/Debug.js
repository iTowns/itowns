/* global menuGlobe */
import Chart from 'chart.js';

/**
 * Create a debug instance attached to an itowns instance
 *
 * @Constructor
 * @param {Scene} scene the itowns Scene
 * @return {Debug} a debug instance
 */
// disabling eslint errors as it is the exported constructor
function Debug(scene) {
    // CHARTS
    // create charts div
    const chartDiv = document.createElement('div');
    chartDiv.id = 'chart-div';
    chartDiv.style = 'position: absolute; bottom: 0; left: 0; width: 100vw; height: 20rem; background-color: white; display: none';

    scene.viewerDiv.appendChild(chartDiv);

    // line graph for nb elements
    const nbObjectsCanvas = document.createElement('canvas');
    nbObjectsCanvas.heigth = '20rem';
    nbObjectsCanvas.width = '40rem';
    nbObjectsCanvas.id = 'nb-objects';
    chartDiv.appendChild(nbObjectsCanvas);

    const timestamp = Date.now();
    const nbObjectsDataset = { label: 'Number of object in Scene', data: [{ x: 0, y: 0 }] };
    const nbObjectsChartLabel = ['0s'];
    const nbObjectsChart = new Chart('nb-objects', {
        type: 'line',
        data: {
            labels: nbObjectsChartLabel,
            datasets: [nbObjectsDataset],
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

    function updateNbObjectsChart() {
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

        const timeInS = Math.floor((Date.now() - timestamp) / 1000);

        const limit = 50;
        nbObjectsChartLabel.push(`${timeInS}s`);
        if (nbObjectsChartLabel.length > limit) {
            nbObjectsChartLabel.shift();
        }
        nbObjectsDataset.data.push({ x: timeInS, y: countElem(scene.gfxEngine.scene3D) });
        if (nbObjectsDataset.data.length > limit) {
            nbObjectsDataset.data.shift();
        }
        nbObjectsChart.update();
    }

    // hook that to scene.update
    const oldUpdate = Object.getPrototypeOf(scene).update.bind(scene);
    scene.update = function debugUpdate() {
        oldUpdate();
        updateNbObjectsChart();
    };

    // DEBUG CONTROLS
    const gui = menuGlobe.gui.addFolder('Debug Tools');

    const state = {
        showOutline: false,
        wireframe: false,
        displayCharts: false,
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
        scene.getMap().tiles.children[0].traverse((object) => {
            if (object.materials) {
                cb(object.materials[0]);
            }
        });
        scene.renderScene3D();
    }

    // tiles outline
    gui.add(state, 'showOutline').name('Show tiles outline').onChange((newValue) => {
        scene.map.layersConfiguration.getGeometryLayers()[0].showOutline = newValue;
        applyToNodeFirstMaterial((material) => {
            material.uniforms.showOutline = { value: newValue };
        });
    });

    // tiles wireframe
    gui.add(state, 'wireframe').name('Wireframe').onChange((newValue) => {
        scene.map.layersConfiguration.getGeometryLayers()[0].wireframe = newValue;
        applyToNodeFirstMaterial((material) => {
            material.wireframe = newValue;
        });
    });
}
window.Debug = Debug;
