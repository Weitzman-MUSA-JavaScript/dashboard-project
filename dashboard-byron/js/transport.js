function showTransportContent() {
    let contentPanel = document.getElementById('description-panel');
    contentPanel.innerHTML = `
        <h3>Transport Metrics</h3>
        <div class="transport-buttons">
            <button id="compare-mrt" class="btn btn-primary active">Compare MRT/LRT</button>
            <button id="compare-cycling" class="btn btn-primary">Compare Cycling Paths</button>
        </div>
        <p id="description">Compare the proximity to the nearest MRT/LRT station.</p>
        <label for="project-dropdown" style="margin-bottom: 10px; display: block;">Select a Project:</label>
        <select id="project-dropdown" class="form-select mb-3">
            <option value="">-- Select a Project --</option>
        </select>
        <p id="comparison-description">Distance to nearest MRT/LRT station:</p>
        <div id="bar-chart"></div>
        <p id="ranking" style="margin-top: 20px;"></p>
    `;

    let projectDropdown = document.getElementById('project-dropdown');
    let rankingParagraph = document.getElementById('ranking');
    let descriptionParagraph = document.getElementById('description');
    let comparisonDescription = document.getElementById('comparison-description');

    // Initial paint properties setup
    map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
    map.setPaintProperty('MRTLines_20240914', 'line-opacity', 1);
    map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 1);
    map.setPaintProperty('HawkerCentres', 'circle-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
    map.setPaintProperty('Parks', 'fill-opacity', 0);
    map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
    map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 0);

    // Function to render the bar chart
    function renderChart(dataProperty, sortDirection, comparisonType) {
        // Update the comparison description
        if (comparisonType === 'mrt') {
            comparisonDescription.innerHTML = "Distance to nearest MRT/LRT station:";
        } else if (comparisonType === 'cycling') {
            comparisonDescription.innerHTML = "Length of surrounding cycling paths and park connectors:";
        }

        let sortedData = sitesData.features.sort((a, b) => {
            return sortDirection === 'asc' ? a.properties[dataProperty] - b.properties[dataProperty] : b.properties[dataProperty] - a.properties[dataProperty];
        });

        if (sortedData) {
            projectDropdown.innerHTML = '<option value="">-- Select a Project --</option>'; // Reset dropdown
            sortedData.forEach(feature => {
                let projectName = feature.properties.Project_Name;
                let option = document.createElement('option');
                option.value = projectName;
                option.textContent = projectName;
                projectDropdown.appendChild(option);
            });
        }

        // Draw the bar chart using D3
        function drawChart() {
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

            let x = d3.scaleLinear()
                .range([0, width])
                .domain([0, d3.max(sortedData, d => d.properties[dataProperty])]);

            let y = d3.scaleBand()
                .range([0, height - margin.top - margin.bottom])
                .domain(sortedData.map(d => d.properties.Project_Name))
                .padding(0.1);

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

            // Create the bars
            let bars = chart.selectAll(".bar")
                .data(sortedData)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", 0)
                .attr("y", d => y(d.properties.Project_Name))
                .attr("width", 0) // Start width at 0 for animation
                .attr("height", y.bandwidth())
                .attr("fill", d => {
                    // Check the active comparison type and assign the corresponding color
                    if (comparisonType === 'mrt') {
                        return "#0054b7";  // mrt color
                    } else if (comparisonType === 'cycling') {
                        return "#e16d7c";  // cycling color
                    } else {
                        return "#0054b7";  // Default fallback color if needed
                    }
                });

            // Animate the width after they have been created
            bars.transition()
                .duration(700) // Animation duration
                .attr("width", d => x(d.properties[dataProperty])); // Animate to final width

            // Tooltip and event handling logic
            bars.on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .95);

                // Update tooltip content based on the comparison type
                let tooltipContent;
                if (dataProperty === 'NEAR_MRT') {
                    tooltipContent = `<b>${d.properties.Project_Name}</b><br>Distance to nearest MRT:<br>${d.properties[dataProperty].toFixed(2)} M`;
                } else if (dataProperty === 'CYCLE_M') {
                    tooltipContent = `<b>${d.properties.Project_Name}</b><br>Length of cycling paths in 1 KM buffer:<br>${d.properties[dataProperty].toFixed(2)} M`;
                }

                tooltip.html(tooltipContent)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", function(event, d) {
                projectDropdown.value = d.properties.Project_Name;
                let rank = sortedData.findIndex(feature => feature.properties.Project_Name === d.properties.Project_Name) + 1;
                rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length}`;
                bars.attr("fill", d => {
                    let activeButton = document.querySelector('.btn.active').id; // Get the active button's ID
                    let selectedColor = activeButton === 'compare-mrt' ? '#0054b7' : (activeButton === 'compare-cycling' ? '#e16d7c' : '#0054b7');
                    return d.properties.Project_Name === projectDropdown.value ? selectedColor : "#e1e0dc";
                });
                let coordinates = projectCoordinates[d.properties.Project_Name];
                map.flyTo({
                    center: coordinates,
                    zoom: 15,
                    essential: true
                });
            });

            projectDropdown.addEventListener('change', function() {
                let selectedProjectName = this.value;
                bars.attr("fill", d => {
                    if (comparisonType === "") {
                        if (selectedProjectName === "") {
                            rankingParagraph.textContent = "";
                            return "#0054b7";
                        } 
                        let isSelected = d.properties.Project_Name === selectedProjectName;
                        if (isSelected) {
                            let rank = sortedData.findIndex(feature => feature.properties.Project_Name === selectedProjectName) + 1;
                            rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length} projects`;
                            return "#0054b7";
                        } else {
                            return "#e1e0dc";
                        }
                    } else if (comparisonType === "mrt") {
                        if (selectedProjectName === "") {
                            rankingParagraph.textContent = "";
                            return "#0054b7";
                        } 
                        let isSelected = d.properties.Project_Name === selectedProjectName;
                        if (isSelected) {
                            let rank = sortedData.findIndex(feature => feature.properties.Project_Name === selectedProjectName) + 1;
                            rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length} projects`;
                            return "#0054b7";
                        } else {
                            return "#e1e0dc";
                        }
                    } else {
                        if (selectedProjectName === "") {
                            rankingParagraph.textContent = "";
                            return "#e16d7c";
                        } 
                        let isSelected = d.properties.Project_Name === selectedProjectName;
                        if (isSelected) {
                            let rank = sortedData.findIndex(feature => feature.properties.Project_Name === selectedProjectName) + 1;
                            rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length} projects`;
                            return "#e16d7c";
                        } else {
                            return "#e1e0dc";
                        }
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
        drawChart();
    }
    
    // Event listeners for buttons
    document.getElementById('compare-mrt').addEventListener('click', function() {
        // Set active class
        this.classList.add('active');
        document.getElementById('compare-cycling').classList.remove('active');

        descriptionParagraph.textContent = "Compare the proximity to MRT/LRT stations.";
        renderChart('NEAR_MRT', 'asc', 'mrt');

        // Paint properties for comparing MRT/LRT
        map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
        map.setPaintProperty('MRTLines_20240914', 'line-opacity', 1);
        map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 1);
        map.setPaintProperty('HawkerCentres', 'circle-opacity', 0);
        map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 0);
        map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
        map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
        map.setPaintProperty('Parks', 'fill-opacity', 0);
        map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
        map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 0);
    });

    document.getElementById('compare-cycling').addEventListener('click', function() {
        // Set active class
        this.classList.add('active');
        document.getElementById('compare-mrt').classList.remove('active');

        descriptionParagraph.textContent = "Compare the cycling paths.";
        renderChart('CYCLE_M', 'desc', 'cycling');

        // Paint properties for comparing cycling paths
        map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
        map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
        map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
        map.setPaintProperty('HawkerCentres', 'circle-opacity', 0);
        map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 0);
        map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
        map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
        map.setPaintProperty('Parks', 'fill-opacity', 0);
        map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
        map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 1);
    });

    // Initial chart render
    renderChart('NEAR_MRT', 'asc', 'mrt');

    map.on('click', 'Sites_v6', function(e) {
        if (e.features.length > 0) {
            const clickedProjectName = e.features[0].properties.Project_Name;
            projectDropdown.value = clickedProjectName; // Update dropdown selection

            // Trigger the change event manually to update ranking
            projectDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    // Redraw the chart on window resize
    window.addEventListener('resize', function() {
        renderChart(projectDropdown.value ? (descriptionParagraph.textContent.includes("MRT/LRT") ? 'NEAR_MRT' : 'CYCLE_M') : 'NEAR_MRT', 'asc');
    });
}