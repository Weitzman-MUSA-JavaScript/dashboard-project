//first, calling the spots layer that we output at the end of map.js
import { getSpotsLayer } from './map.js';
import { isSpotAvailable } from './spot_reservation.js';


//updating message
function updateMessage(points) {
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = `You have ${points.length} spots near your address`;
    }
}

//updating this function so that it accounts for changes in availability
async function updateSpotStyle(layer, isHighlighted = false) {
    const objCode = layer.feature.properties.obj_code;
    try {
        const available = await isSpotAvailable(objCode);
        layer.setStyle({
            //set style depending on condtions
            fillColor: isHighlighted ? "#FFD700" : (available ? "#e5e5e5" : "#ff0000"),
            color: isHighlighted ? "#FF4500" : "#ffffff",
            weight: isHighlighted ? 2 : 1,
            radius: isHighlighted ? 6 : 4,
            fillOpacity: isHighlighted ? 0.8 : 0.3
        });
    } catch (error) {
        console.error("Error updating spot style:", error);
        // Set default style in case of error
        layer.setStyle({
            fillColor: "#e5e5e5",
            color: "#ffffff",
            weight: 1,
            radius: 4,
            fillOpacity: 0.3
        });
    }
}

//then set function that highlights spots by timelimit
async function highlightPointsByTimeLimit(timeLimit) {
    //call spots layer
    const spotsLayer = getSpotsLayer();
    const updatePromises = [];
    spotsLayer.eachLayer((layer) => {
        //for all the buffer points whose opacity is 1, i.e. is in the buffer
        const isInBuffer = layer.options.opacity === 1;
        if (isInBuffer) {
            if (layer.feature.properties.timelimit === timeLimit) {
                
                updatePromises.push(updateSpotStyle(layer, true));
            } else {
                updatePromises.push(updateSpotStyle(layer, false));
            }
        }
    });
    await Promise.all(updatePromises);
}


//helper function, to reset map highlights to original
async function resetMapHighlights() {
    const spotsLayer = getSpotsLayer();
    const updatePromises = [];

    spotsLayer.eachLayer((layer) => {
        const isInBuffer = layer.options.opacity === 1;
        if (isInBuffer) {
            updatePromises.push(updateSpotStyle(layer, false));
        }
    });

    await Promise.all(updatePromises);
}


//creating the chart
function initChart(points) {
    //taking chart elements
    const chartEl = document.getElementById('chart');
    const timelimits = points.map(point => point.timelimit);
    const frequencyMap = {};
    timelimits.forEach(limit => {
        frequencyMap[limit] = (frequencyMap[limit] || 0) + 1;
    });

    const uniqueLimits = Object.keys(frequencyMap).sort((a, b) => Number(a) - Number(b));
    const frequencies = uniqueLimits.map(limit => frequencyMap[limit]);

    const options = {
        series: [{
            name: 'Number of Spots',
            data: frequencies,
            color: '#fca311'
        }],
        chart: {
            type: 'bar',
            height: 350,
            foreColor: '#ffffff',
            events: {
                //here creating an event that happens when chart elements are set
                dataPointSelection: (event, chartContext, config) => {
                    //reset highlihts
                    resetMapHighlights();
                    //else highlight points by their selected time limit
                    const selectedTimeLimit = uniqueLimits[config.dataPointIndex];
                    highlightPointsByTimeLimit(Number(selectedTimeLimit));
                },
                //if any place outside the chart is hit then reset all highlights.
                click: (event, chartContext, config) => {
                    if (config.seriesIndex === -1) {
                        resetMapHighlights();
                    }
                }
            }},
        plotOptions: {
            bar: {
                borderRadius: 4,
                borderRadiusApplication: 'end',
            }
        },
        dataLabels: {
            style: {
                colors: ['#ffffff']
              },
            enabled: true,
        },
        xaxis: {
            categories: uniqueLimits,
            style: {
                color: '#ffffff'
            },
            title: {
                text: 'Time Limit (minutes)'
            }
        },
        yaxis: {
            title: {
                text: 'Number of Spots'
            },
            style: {
                color: '#ffffff'
            },
        },
        title: {
            text: 'How long can you park?',
            align: 'center'
        }
    };

    const chart = new ApexCharts(chartEl, options);
    chart.render();
    return chart;
}

export function updateVisualizations(points = []) {
    updateMessage(points);
    return initChart(points);
}