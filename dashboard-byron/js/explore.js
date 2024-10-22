function showExploreContent() {    
    const contentPanel = document.getElementById('description-panel');
    contentPanel.innerHTML = `
        <h3>Explore Sites</h3>
        <p>Select a project to view its details.</p>
        <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" id="toggleMRT" />
        <label class="form-check-label" for="toggleMRT">Show MRT/LRT?</label>
        </div>
        <label for="project-dropdown" style="margin-bottom: 10px; display: block;">Select a Project:</label>
        <select id="project-dropdown" class="form-select mb-3">
            <option value="">-- Select a Project --</option>
        </select>
        <div id="project-details" class="mt-3"></div>
    `;
    const toggleMRT = document.getElementById('toggleMRT');

    // Populate the dropdown with BTO project names
    const projectDropdown = document.getElementById('project-dropdown');
    
    if (sitesData && sitesData.features) {
        sitesData.features.forEach(feature => {
            const projectName = feature.properties.Project_Name;
            const option = document.createElement('option');
            option.value = projectName;
            option.textContent = projectName;
            projectDropdown.appendChild(option);
        });
    }

    // Event listener for dropdown selection
    projectDropdown.addEventListener('change', function() {
        const selectedProjectName = this.value;
        const projectDetailsDiv = document.getElementById('project-details');
    
        if (selectedProjectName) {
            const selectedFeature = sitesData.features.find(feature => feature.properties.Project_Name === selectedProjectName);
            if (selectedFeature) {
                const { Units, NEAR_HAWKER, NEAR_MRT, NParks_KM2, NEAR_LIB, CYCLE_M, MATURE_KM2 } = selectedFeature.properties;
    
                // Display the selected project's details in a Bootstrap table
                projectDetailsDiv.innerHTML = `
                <h5>${selectedProjectName}</h5>
                <table class="table table-bordered table-striped project-details-table">
                    <tbody>
                        <tr>
                            <td><strong>Total number of units launched</strong></td>
                            <td>${Units}</td>
                        </tr>
                        <tr>
                            <td><strong>Distance to nearest Hawker Centre</strong></td>
                            <td>${NEAR_HAWKER.toFixed(2)} M</td>
                        </tr>
                        <tr>
                            <td><strong>Distance to nearest MRT</strong></td>
                            <td>${NEAR_MRT.toFixed(2)} M</td>
                        </tr>
                        <tr>
                            <td><strong>Area of parkland within 1KM buffer of site</strong></td>
                            <td>${NParks_KM2.toFixed(2)} KM²</td>
                        </tr>
                        <tr>
                            <td><strong>Distance to nearest library</strong></td>
                            <td>${NEAR_LIB.toFixed(2)} M</td>
                        </tr>
                        <tr>
                            <td><strong>Length of cycling paths within 1KM buffer of site</strong></td>
                            <td>${CYCLE_M.toFixed(2)} M</td>
                        </tr>
                        <tr>
                            <td><strong>Area of mature housing estates within 1KM buffer of site</strong></td>
                            <td>${MATURE_KM2.toFixed(2)} KM²</td>
                        </tr>
                    </tbody>
                </table>
            `;
            }
        } else {
            projectDetailsDiv.innerHTML = ''; // Clear details if no project is selected
        }

        if (selectedProjectName && projectCoordinates[selectedProjectName]) {
            const coordinates = projectCoordinates[selectedProjectName];
            
            map.flyTo({
                center: coordinates,
                zoom: 15,
                essential: true // this ensures smooth zooming experience
            });
        } else {
            map.flyTo({
                center: [103.809038, 1.353424],
                zoom: 10.5,
                essential: true
            });
        }
    });

    // Add click event to Sites_v6 map layer to select a project
    map.on('click', 'Sites_v6', function(e) {
        if (e.features.length > 0) {
            const clickedProjectName = e.features[0].properties.Project_Name;
            projectDropdown.value = clickedProjectName; // Update dropdown selection

            // Update project details
            projectDropdown.dispatchEvent(new Event('change'));
        }
    });

    map.setPaintProperty('Sites_v6', 'fill-opacity', 1);
    map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
    map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-opacity', 0);
    map.setPaintProperty('HawkerCentres', 'circle-stroke-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-opacity', 0);
    map.setPaintProperty('PublicLibraries', 'circle-stroke-opacity', 0);
    map.setPaintProperty('Parks', 'fill-opacity', 0);
    map.setPaintProperty('ExistingHDBDissolved', 'fill-opacity', 0);
    map.setPaintProperty('AllCyclingPathPCN', 'line-opacity', 0);

    toggleMRT.addEventListener('change', function() {
        if (this.checked) {
            // Show MRT/LRT layers
            map.setPaintProperty('MRTLines_20240914', 'line-opacity', 1);
            map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 1);
        } else {
            // Hide MRT/LRT layers
            map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
            map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
        }
    });
}

// MRT/LRT toggle button
let toggleMrtButton = document.getElementById('toggle-mrt');
let mrtVisible = false; 

toggleMrtButton.addEventListener('click', function() {
    mrtVisible = !mrtVisible; // Toggle the state

    if (mrtVisible) {
        // Show MRT/LRT layers
        map.setPaintProperty('MRTLines_20240914', 'line-opacity', 1);
        map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 1);
        toggleMrtButton.textContent = 'Hide MRT/LRT?'; // Change button text
    } else {
        // Hide MRT/LRT layers
        map.setPaintProperty('MRTLines_20240914', 'line-opacity', 0);
        map.setPaintProperty('MRTStations_20240914_v1', 'text-opacity', 0);
        toggleMrtButton.textContent = 'Show MRT/LRT?'; // Change button text
    }
});

// Code from class
// function getUserLocation() {
//     if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(position => {
//             const { latitude, longitude } = position.coords;

//             // Zoom to the user's location on the map
//             map.flyTo({
//                 center: [longitude, latitude],
//                 zoom: 14, // Adjust the zoom level as needed
//                 essential: true // This animation is essential for accessibility
//             });
//         }, () => {
//             alert('Unable to retrieve your location. Please check your location settings.');
//         });
//     } else {
//         alert('Geolocation is not supported by this browser.');
//     }
// }

