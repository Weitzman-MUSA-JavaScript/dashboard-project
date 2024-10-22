function showNatureContent() {
    let contentPanel = document.getElementById('description-panel');
    contentPanel.innerHTML = `
        <h3>Nature Metrics</h3>
        <p>View the nature-related data and metrics for the selected sites.</p>
        <label for="project-dropdown" style="margin-bottom: 10px; display: block;">Select a Project:</label>
        <select id="project-dropdown" class="form-select mb-3">
            <option value="">-- Select a Project --</option>
        </select>
        <p>Area of surrounding parkland:</p>
        <div id="bar-chart"></div>
        <p id="ranking" style="margin-top: 20px;"></p>
    `;

    let projectDropdown = document.getElementById('project-dropdown');
    let rankingParagraph = document.getElementById('ranking');

    // Sort data based on NParks_KM2 in descending order (more parks = better!)
    let sortedData = sitesData.features.sort((a, b) => b.properties.NParks_KM2 - a.properties.NParks_KM2);

    if (sortedData) {
        sortedData.forEach(feature => {
            let projectName = feature.properties.Project_Name;
            let option = document.createElement('option');
            option.value = projectName;
            option.textContent = projectName;
            projectDropdown.appendChild(option);
        });
    }

    // Render the bar chart using D3
    function renderChart() {
        // Clear the previous SVG
        d3.select("#bar-chart").select("svg").remove();

        let containerWidth = document.getElementById('bar-chart').clientWidth;
        let height = 400;

        let svg = d3.select("#bar-chart")
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", height);

        let margin = { top: 20, right: 20, bottom: 30, left: 120 };
        let width = containerWidth - margin.left - margin.right;

        let chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        let x = d3.scaleLinear()
            .range([0, width])
            .domain([0, d3.max(sortedData, d => d.properties.NParks_KM2)]);

        let y = d3.scaleBand()
            .range([0, height - margin.top - margin.bottom])
            .domain(sortedData.map(d => d.properties.Project_Name))
            .padding(0.1);

        // Axes
        chart.append("g")
            .call(d3.axisLeft(y))
            .style("font-size", "80%")
            .style("font-family", "Barlow");

        chart.append("g")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .call(d3.axisBottom(x))
            .style("font-size", "50%")
            .style("font-family", "Barlow");
    
    // Create tooltip
    let tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

    // Bars
    let bars = chart.selectAll(".bar")
        .data(sortedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.properties.Project_Name))
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .attr("fill", "#28c600") // Default color
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .95);
            tooltip.html(`<b>${d.properties.Project_Name}</b><br>Area of surrounding parkland:<br>${d.properties.NParks_KM2.toFixed(2)} KM²`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function(event, d) {
            // Change dropdown selection
            projectDropdown.value = d.properties.Project_Name;

            // Update ranking
            let rank = sortedData.findIndex(feature => feature.properties.Project_Name === d.properties.Project_Name) + 1;
            rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length}`;

            // Update bar colors based on selected project
            bars.attr("fill", d => d.properties.Project_Name === projectDropdown.value ? "#28c600" : "#e1e0dc");

            // Zoom to selected project on the map
            let coordinates = projectCoordinates[d.properties.Project_Name];
            map.flyTo({
                center: coordinates,
                zoom: 15,
                essential: true
            });
        });

        // Transition to animate bars to their full width
        bars.transition()
        .duration(700)
        .attr("width", d => x(d.properties.NParks_KM2));

        // Dropdown listener
        projectDropdown.addEventListener('change', function () {
        let selectedProjectName = this.value;

        // Update bar colors based on selected project
        bars.attr("fill", d => {
            if (selectedProjectName === "") {
                rankingParagraph.textContent = ""; // Clear ranking if no project selected
                return "#28c600"; // All green if no project is selected
            }
            let isSelected = d.properties.Project_Name === selectedProjectName;
            if (isSelected) {
                // Update ranking
                let rank = sortedData.findIndex(feature => feature.properties.Project_Name === selectedProjectName) + 1;
                rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length} projects`;
                return "#28c600"; // Highlight selected project
            } else {
                return "#e1e0dc"; // Other projects grey
            }
        });

        if (selectedProjectName && projectCoordinates[selectedProjectName]) {
            let coordinates = projectCoordinates[selectedProjectName];
            map.flyTo({
                center: coordinates,
                zoom: 15,
                essential: true
            });
        } else {
            map.flyTo({
                center: [103.809038, 1.353424],
                zoom: 10.5,
                essential: true
            });
        }
    });
    }

    // Initial chart render
    renderChart();

    // Redraw the chart on window resize
    window.addEventListener('resize', renderChart);
    
    map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
    map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
    map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
    map.setPaintProperty('Parks', 'fill-opacity', 1);
    map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
    map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 0);

    // Add click event to Sites_v6 map layer to select a project
    map.on('click', 'Sites_v6', function(e) {
        if (e.features.length > 0) {
            const clickedProjectName = e.features[0].properties.Project_Name;
            projectDropdown.value = clickedProjectName; // Update dropdown selection

            // Trigger the change event manually to update ranking
            projectDropdown.dispatchEvent(new Event('change'));
        }
    });
}