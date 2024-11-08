import { Chart } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/auto/+esm';
import { bb } from 'https://cdn.jsdelivr.net/npm/billboard.js@3.14.0/+esm';

const chartInstances = {};

function initChart(chartEl, positionMedians, statNames, playerStats, playerPercentiles) {

    if (chartInstances[chartEl.id]) {
        chartInstances[chartEl.id].destroy();
    }

    const data = {
        labels: statNames,
        datasets: [
            {
                label: 'Player Percentiles',
                data: playerPercentiles,
                backgroundColor: getColor(),
                borderColor: getColor(),
                borderWidth: 1,
                barThickness: 'flex',
                maxBarThickness: 70,
                borderRadius: 10,
                borderSkipped: false,
                minBarLength: 10
            }
        ]
    };

    const options = {
        plugins: {
            title: {
                display: true,
                text: "Athlete Percentiles",
            },
            legend: {
                display: true,
                labels: {
                    generateLabels: function (chart) {
                        return [
                            {
                                text: '80+ Percentile',
                                fillStyle: 'rgba(0, 139, 139, 0.5)',
                                strokeStyle: 'rgba(0, 139, 139, 0.5)',
                                lineWidth: 1
                            },
                            {
                                text: '60-79 Percentile',
                                fillStyle: 'rgba(60, 179, 113, 0.5)',
                                strokeStyle: 'rgba(60, 179, 113, 0.5)',
                                lineWidth: 1
                            },
                            {
                                text: '40-59 Percentile',
                                fillStyle: 'rgba(255, 215, 0, 0.5)',
                                strokeStyle: 'rgba(255, 215, 0, 0.5)',
                                lineWidth: 1
                            },
                            {
                                text: '20-39 Percentile',
                                fillStyle: 'rgba(250, 128, 114, 0.5)',
                                strokeStyle: 'rgba(250, 128, 114, 0.5)',
                                lineWidth: 1
                            },
                            {
                                text: '0-19 Percentile',
                                fillStyle: 'rgba(220, 20, 60, 0.5)',
                                strokeStyle: 'rgba(220, 20, 60, 0.5)',
                                lineWidth: 1
                            }
                        ];
                    }
                }
            },
            tooltip: {
                usePointStyle: true,
                callbacks: {
                    label: function (context) {
                        const index = context.dataIndex;
                        const statName = context.label;
                        const playerStat = playerStats[index];
                        const positionMedian = positionMedians[index];
                        const percentile = playerPercentiles[index];

                        return [
                            `${statName}`,
                            `Player Stat: ${playerStat}`,
                            `Position Median: ${positionMedian}`,
                            `Percentile: ${percentile}%`
                        ];
                    },
                    labelPointStyle: function (context) {
                        return {
                            pointStyle: 'star'
                        };
                    }
                }
            }
        },
        indexAxis: 'y',
        aspectRatio: 2,
        scales: {
            x: {
                beginAtZero: true,
                min: 0,
                max: 100
            }
        },
        elements: {
            bar: {
                minBarLength: 40
            }
        },
        responsive: true
    };

    chartInstances[chartEl.id] = new Chart(chartEl, { type: 'bar', data, options });

    function getColor() {
        return playerPercentiles.map(percentile => {
            if (percentile >= 80) {
                return 'rgba(0, 139, 139, 0.5)';
            } else if (percentile >= 60) {
                return 'rgba(60, 179, 113, 0.5)';
            } else if (percentile >= 40) {
                return 'rgba(255, 215, 0, 0.5)';
            } else if (percentile >= 20) {
                return 'rgba(250, 128, 114, 0.5)';
            } else {
                return 'rgba(220, 20, 60, 0.5)';
            }
        });
    }
}

export { initChart };
