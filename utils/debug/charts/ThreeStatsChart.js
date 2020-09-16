import Chart from 'chart.js';
import { scales, color_rose, color_blue } from './ChartConfig';

export default function ThreeStatsChart(ctx, renderer) {
    let lastValidCompareIndex = -1;
    const timestamp = Date.now();
    const textureDataset = { label: 'texture count', data: [{ x: 0, y: 0 }], borderColor: color_rose, borderWidth: 1.5, pointRadius: 1 };
    const geometryDataset = { label: 'geometry count', data: [{ x: 0, y: 0 }], borderColor: color_blue, borderWidth: 1.5, pointRadius: 1 };
    const label = ['0s'];
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: label,
            datasets: [textureDataset, geometryDataset],
        },
        options: {
            animation: { duration: 10 },
            scales,
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
