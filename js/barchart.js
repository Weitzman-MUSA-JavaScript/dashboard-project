import { Chart } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/auto/+esm';

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
                                text: '75-100th Percentile',
                                fillStyle: 'rgba(0, 139, 139, 0.5)',
                                strokeStyle: 'rgba(0, 139, 139, 1)',
                                lineWidth: 1,
                                hidden: false
                            },
                            {
                                text: '50-75th Percentile',
                                fillStyle: 'rgba(255, 215, 0, 0.5)',
                                strokeStyle: 'rgba(255, 215, 0, 1)',
                                lineWidth: 1,
                                hidden: false
                            },
                            {
                                text: '0-50th Percentile',
                                fillStyle: 'rgba(250, 128, 114, 0.5)',
                                strokeStyle: 'rgba(250, 128, 114, 1)',
                                lineWidth: 1,
                                hidden: false
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
            if (percentile >= 75) {
                return 'rgba(0, 139, 139, 0.5)';
            } else if (percentile >= 50) {
                return 'rgba(255, 215, 0, 0.5)';
            } else {
                return 'rgba(250, 128, 114, 0.5)';
            }
        });
    }
}

export { initChart };
