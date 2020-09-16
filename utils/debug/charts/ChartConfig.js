import Chart from 'chart.js';

Chart.defaults.global.defaultFontColor = '#b0b0b0';

export const scales =  {
    yAxes: [{
        display: true,
        ticks: {
            suggestedMin: 0, // minimum will be 0, unless there is a lower value.
        },
        gridLines: {
            color: '#606060',
            zeroLineColor: '#606060',
        },
    }],
};

export const color_rose = '#e7c9e5';
export const color_blue = '#64a6bd';
export const backgroundChartDiv = '#404040';

export default {};
