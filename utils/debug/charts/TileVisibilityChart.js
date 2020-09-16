import Chart from 'chart.js';
import { scales, color_rose, color_blue } from './ChartConfig';

export default function TileVisibilityChart(ctx, tileLayer) {
    const nbVisibleLabels = [];
    const nbVisibleData = [];
    const nbDisplayedData = [];
    const nbVisibleChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nbVisibleLabels,
            datasets: [
                {
                    label: 'Visible node per level',
                    data: nbVisibleData,
                    backgroundColor: color_rose,
                },
                {
                    label: 'Diplayed node per level',
                    data: nbDisplayedData,
                    backgroundColor: color_blue,
                },
            ],
        },
        options: {
            scales,
        },
    });

    this.update = (displayed) => {
        function countVisible(node, stats) {
            if (!node || !node.visible) {
                return;
            }
            if (node.level >= 0 && node.layer === tileLayer) {
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
        countVisible(tileLayer.object3d, stats);
        nbVisibleLabels.length = 0;
        nbVisibleData.length = 0;
        for (const level in stats) {
            if ({}.hasOwnProperty.call(stats, level)) {
                nbVisibleLabels[level] = `${level}`;
                nbVisibleData[level] = stats[level][0];
                nbDisplayedData[level] = stats[level][1];
            }
        }

        if (displayed) {
            nbVisibleChart.update();
        }
    };

    this.resize = () => {
        nbVisibleChart.resize();
    };
}
