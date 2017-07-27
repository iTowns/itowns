import Chart from 'chart.js';

export default function TileObjectsChart(chartId, tileLayer) {
    let lastValidCompareIndex = 0;
    const timestamp = Date.now();
    const viewLevelStartDataset = { label: 'Update 1st level', data: [{ x: 0, y: 0 }] };
    const viewUpdateDurationDataset = { label: 'Update duration (ms)', data: [{ x: 0, y: 0 }], borderColor: 'rgba(75,192,192,1)' };
    const label = ['0s'];
    const nbObjectsChart = new Chart(chartId, {
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

    this.update = (displayed, updateDuration) => {
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

        viewLevelStartDataset.data.push({ x: 0, y: tileLayer._latestUpdateStartingLevel });
        viewUpdateDurationDataset.data.push({ x: 0, y: updateDuration });
        if (viewLevelStartDataset.data.length > limit) {
            viewLevelStartDataset.data.shift();
            viewUpdateDurationDataset.data.shift();
        }

        if (displayed) {
            nbObjectsChart.update();
        }
    };

    this.resize = () => {
        nbObjectsChart.resize();
    };
}
