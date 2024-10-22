function showAmenitiesContent() {
    let contentPanel = document.getElementById('description-panel');
    contentPanel.innerHTML = `
        <h3>Amenities</h3>
        <div class="amenities-buttons">
            <button id="compare-hawker" class="btn btn-primary active">Compare Hawkers</button>
            <button id="compare-lib" class="btn btn-primary">Compare Libraries</button>
        </div>
        <p id="description">Compare the proximity to the nearest hawker centre.</p>
        <label for="project-dropdown" style="margin-bottom: 10px; display: block;">Select a Project:</label>
        <select id="project-dropdown" class="form-select mb-3">
            <option value="">-- Select a Project --</option>
        </select>
        <p id="comparison-description">Distance to nearest hawker centre:</p>
        <div id="bar-chart"></div>
        <p id="ranking" style="margin-top: 20px;"></p>
    `;

    let projectDropdown = document.getElementById('project-dropdown');
    let rankingParagraph = document.getElementById('ranking');
    let descriptionParagraph = document.getElementById('description');
    let comparisonDescription = document.getElementById('comparison-description');

    // Initial paint properties setup
    map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
    map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
    map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-opacity', 1);
    map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 1);
    map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
    map.setPaintProperty('Parks', 'fill-opacity', 0);
    map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
    map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 0);

    // Function to sort data and render chart
    function renderChart(dataProperty, sortDirection, comparisonType) {
        // Update the comparison description
        if (comparisonType === 'haw') {
            comparisonDescription.innerHTML = "Distance to nearest hawker centre:";
        } else if (comparisonType === 'libra') {
            comparisonDescription.innerHTML = "Distance to nearest public library:";
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
    
        // Create the bar chart using D3
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
    
            // Create a tooltip div
            let tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
    
            // Create bars
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
                    if (comparisonType === 'haw') {
                        return "#c64a06";  // Hawker color
                    } else if (comparisonType === 'libra') {
                        return "#0688cd";  // Library color
                    } else {
                        return "#c64a06";
                    }
                });
    
            // Animate the width after they have been created
            bars.transition()
                .duration(700) // Animation duration
                .attr("width", d => x(d.properties[dataProperty])); // Animate to final width
    
            // Tooltips
            bars.on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .95);
                
                // Update tooltip content based on the comparison type
                let tooltipContent;
                if (dataProperty === 'NEAR_HAWKER') {
                    tooltipContent = `<b>${d.properties.Project_Name}</b><br>Distance to nearest existing hawker centre:<br>${d.properties[dataProperty].toFixed(2)} M`;
                } else if (dataProperty === 'NEAR_LIB') {
                    tooltipContent = `<b>${d.properties.Project_Name}</b><br>Distance to nearest existing library:<br>${d.properties[dataProperty].toFixed(2)} M`;
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
                    let selectedColor = activeButton === 'compare-hawker' ? '#c64a06' : (activeButton === 'compare-lib' ? '#0688cd' : '#c64a06');
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
                            return "#c64a06";
                        } 
                        let isSelected = d.properties.Project_Name === selectedProjectName;
                        if (isSelected) {
                            let rank = sortedData.findIndex(feature => feature.properties.Project_Name === selectedProjectName) + 1;
                            rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length} projects`;
                            return "#c64a06";
                        } else {
                            return "#e1e0dc";
                        }
                    } else if (comparisonType === "haw") {
                        if (selectedProjectName === "") {
                            rankingParagraph.textContent = "";
                            return "#c64a06";
                        } 
                        let isSelected = d.properties.Project_Name === selectedProjectName;
                        if (isSelected) {
                            let rank = sortedData.findIndex(feature => feature.properties.Project_Name === selectedProjectName) + 1;
                            rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length} projects`;
                            return "#c64a06";
                        } else {
                            return "#e1e0dc";
                        }
                    } else {
                        if (selectedProjectName === "") {
                            rankingParagraph.textContent = "";
                            return "#0688cd";
                        } 
                        let isSelected = d.properties.Project_Name === selectedProjectName;
                        if (isSelected) {
                            let rank = sortedData.findIndex(feature => feature.properties.Project_Name === selectedProjectName) + 1;
                            rankingParagraph.textContent = `Ranking: #${rank} out of ${sortedData.length} projects`;
                            return "#0688cd";
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
    document.getElementById('compare-hawker').addEventListener('click', function() {
        // Set active class
        this.classList.add('active');
        document.getElementById('compare-lib').classList.remove('active');

        descriptionParagraph.textContent = "Compare the proximity to the nearest hawker centre.";
        renderChart('NEAR_HAWKER', 'asc', 'haw');

        // Set hawker layer paint properties
        map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
        map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
        map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
        map.setPaintProperty('HawkerCentres', 'circle-opacity', 1);
        map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 1);
        map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
        map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
        map.setPaintProperty('Parks', 'fill-opacity', 0);
        map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
        map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 0);
    });

    document.getElementById('compare-lib').addEventListener('click', function() {
        // Set active class
        this.classList.add('active');
        document.getElementById('compare-hawker').classList.remove('active');

        descriptionParagraph.textContent = "Compare the proximity to the nearest library.";
        renderChart('NEAR_LIB', 'asc', 'libra');

        // Set library layer paint properties
        map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
        map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
        map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
        map.setPaintProperty('HawkerCentres', 'circle-opacity', 0);
        map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 0);
        map.setPaintProperty('PublicLibraries', 'circle-opacity', 1);
        map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 1);
        map.setPaintProperty('Parks', 'fill-opacity', 0);
        map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
        map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 0);
    });

    // Initial chart render
    renderChart('NEAR_HAWKER', 'asc', 'haw');

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
        renderChart(projectDropdown.value ? (descriptionParagraph.textContent.includes("hawker") ? 'NEAR_HAWKER' : 'NEAR_LIB') : 'NEAR_HAWKER', 'asc');
    });

}