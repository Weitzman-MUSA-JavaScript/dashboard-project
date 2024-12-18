// assets/js/vischarts.js
import * as d3 from 'https://cdn.skypack.dev/d3';
import { columnColors } from './colors.js';

const years = [2019, 2020, 2021, 2022, 2023, 2024];
const chartColnames = ['stop_counts', 'device_counts'];

function fetchDataForCharts(GEOID) {
    if (!GEOID) {
        clearAllCharts();
        return Promise.resolve(null);
    }

    return Promise.all(
        years.map(year =>
            fetch(`assets/data/philly_${year}.geojson`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    const filtered = data.features.filter(feature => feature.properties['GEOID'] === GEOID);
                    return filtered;
                })
                .catch(() => [])
        )
    );
}

function prepareChartData(filteredData) {
    if (!filteredData) return {};
    const chartData = {};
    chartColnames.forEach(column => {
        chartData[column] = years.map((year, index) => {
            const yearData = filteredData[index];
            return (yearData.length > 0 ? yearData[0].properties[column] : 0);
        });
    });
    return chartData;
}

function createColumnChart(container, column, title, data, labels) {
    // Clear any existing SVG
    d3.select(container).selectAll('svg').remove();

    const margin = { top: 60, right: 30, bottom: 60, left: 60 };
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Create SVG with responsive viewBox and preserveAspectRatio
    const svg = d3.select(container)
        .append('svg')
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale with increased padding for slimmer bars
    const x = d3.scaleBand()
        .domain(labels)
        .range([0, width])
        .padding(0.5); // Increased padding for slimmer bars

    // Y scale
    const yMax = d3.max(data, d => d) || 1;
    const y = d3.scaleLinear()
        .domain([0, yMax * 1.1]) // Add some padding on top
        .range([height, 0]);

    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-family", "Lato");

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "12px");

    // Add gridlines
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        )
        .selectAll(".tick line")
        .attr("stroke", "#e0e0e0");

    // Add bars with shared color from columnColors
    const barColor = columnColors[column] || 'steelblue';

    // Tooltip div within the container to prevent overflow
    const tooltip = d3.select(container)
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "#fff")
        .style("padding", "5px")
        .style("border-radius", "4px")
        .style("font-size", "12px");

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d, i) => x(labels[i]))
        .attr("y", height) // Start from bottom for transition
        .attr("width", x.bandwidth())
        .attr("height", 0) // Initial height zero for transition
        .attr("fill", barColor)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`<strong>${d}</strong>`)
                .style("left", `${event.layerX + 10}px`)
                .style("top", `${event.layerY - 28}px`);
            d3.select(this).attr("fill-opacity", 0.7);
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
            d3.select(this).attr("fill-opacity", 1);
        })
        .transition() // Animate bars
        .duration(800)
        .attr("y", d => y(d))
        .attr("height", d => height - y(d));

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(title);

    // Add X axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Year");
}

function visualizeCharts(GEOID) {
    fetchDataForCharts(GEOID).then(filteredData => {
        if (!filteredData) return;
        const chartData = prepareChartData(filteredData);

        chartColnames.forEach((column, index) => {
            const container = document.getElementById(`chart${index + 1}`);
            let chartTitle = column === 'stop_counts' ? 'Number of Visits' : 'Number of Visitors';
            if (container) {
                createColumnChart(container, column, chartTitle, chartData[column], years);
            }
        });
    });
}

function clearAllCharts() {
    chartColnames.forEach((_, index) => {
        const container = document.getElementById(`chart${index + 1}`);
        if (container) {
            d3.select(container).selectAll('svg').remove();
            d3.select(container).selectAll('.tooltip').remove();
        }
    });
}

export { visualizeCharts };
