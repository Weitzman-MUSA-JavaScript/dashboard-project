function updateMessage(points) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = `You have ${points.length} spots in your neighbourhood`;
    }
}

function initChart(points) {
    const chartEl = document.getElementById('chart');
    
    if (!chartEl) {
        console.error('Chart element not found');
        return;
    }

    // Extract time limits directly from points
    const timelimits = points.map(point => point.timelimit);

    // Count frequency of each time limit
    const frequencyMap = {};
    timelimits.forEach(limit => {
        frequencyMap[limit] = (frequencyMap[limit] || 0) + 1;
    });

    // Convert to arrays for ApexCharts
    const uniqueLimits = Object.keys(frequencyMap).sort((a, b) => Number(a) - Number(b));
    const frequencies = uniqueLimits.map(limit => frequencyMap[limit]);

    const options = {
        series: [{
            name: 'Number of Spots',
            data: frequencies,
            color: '#0af'
        }],
        chart: {
            type: 'bar',
            height: 350,
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                borderRadiusApplication: 'end',
            }
        },
        dataLabels: {
            enabled: true,
        },
        xaxis: {
            categories: uniqueLimits,
            title: {
                text: 'Time Limit (minutes)'
            }
        },
        yaxis: {
            title: {
                text: 'Number of Spots'
            }
        },
        title: {
            text: 'Distribution of Parking Time Limits',
            align: 'center'
        }
    };

    const chart = new ApexCharts(chartEl, options);
    chart.render();

    return chart;
}

function updateVisualizations(points = []) {
    updateMessage(points);
    return initChart(points);
}

export { updateVisualizations };