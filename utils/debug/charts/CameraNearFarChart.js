import Chart from 'chart.js';

export default function CameraNearFarChart(chartId, camera) {
    let lastValidCompareIndex = -1;
    const timestamp = Date.now();
    const label = ['0s'];
    const chart = new Chart(chartId, {
        type: 'line',
        data: {
            labels: label,
            datasets: [
                {
                    label: 'near',
                    data: [Math.round(camera.near)],
                    fill: '-1',
                },
                {
                    label: 'far',
                    data: [Math.round(camera.far)],
                    fill: '-1',
                },
            ],
        },
        options: {
            animation: { duration: 10 },
            scales: {
                yAxes: [{
                    stacked: true,
                }],
            },
        },
    });

    this.update = (displayed) => {
        if (!displayed) {
            return;
        }

        const f = Math.round(camera.far);
        const n = Math.round(camera.near);

        const count = chart.data.datasets[1].data.length;
        if (f == chart.data.datasets[1].data[count - 1] &&
            n == chart.data.datasets[0].data[count - 1]) {
            return;
        }

        const timeInS = Math.floor((Date.now() - timestamp) / 1000);
        const lbl = `${timeInS}s`;
        const identical = (lastValidCompareIndex > 0 && label[lastValidCompareIndex] == lbl);
        if (identical) {
            label.push('');
        } else {
            label.push(lbl);
            lastValidCompareIndex = label.length - 1;
        }

        chart.data.datasets[0].data.push(n);
        chart.data.datasets[1].data.push(f);

        const limit = 60;
        if (chart.data.datasets[0].data.length > limit) {
            chart.data.datasets[0].data.shift();
            chart.data.datasets[1].data.shift();
            label.shift();
        }

        if (displayed) {
            chart.update();
        }
    };

    this.resize = () => {
        chart.resize();
    };
}
