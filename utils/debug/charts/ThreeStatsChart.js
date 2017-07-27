import Chart from 'chart.js';

export default function ThreeStatsChart(chartId, renderer) {
    let lastValidCompareIndex = -1;
    const timestamp = Date.now();
    const textureDataset = { label: 'texture count', data: [{ x: 0, y: 0 }] };
    const geometryDataset = { label: 'geometry count', data: [{ x: 0, y: 0 }], borderColor: 'rgba(75,192,192,1)' };
    const label = ['0s'];
    const chart = new Chart(chartId, {
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

    this.update = (displayed) => {
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

        const memory = renderer.info.memory;
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

    this.resize = () => {
        chart.resize();
    };
}
