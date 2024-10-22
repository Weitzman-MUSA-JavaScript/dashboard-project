mapboxgl.accessToken = 'pk.eyJ1IjoiYnlyb25ubiIsImEiOiJjbTB2NG9qajYxOTE1Mmtwd3Q1aDd5cjM2In0.K6SRujI45VvXnG1vfcwbwA';

var map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will be placed
    style: 'mapbox://styles/byronnn/cm15ugzyg00dg01pc3ucid3od', // Mapbox style
    center: [103.809038, 1.353424], // Initial position [lng, lat]
    zoom: 10.5
});

// Add navigation control (zoom buttons)
var nav = new mapboxgl.NavigationControl();
map.addControl(nav, 'top-right');

// Initialize all layers with opacity set to 0
map.on('load', function() {
    // 1. Sites_v6 (fill)
    map.addLayer({
        id: "Sites_v6",
        type: "fill",
        source: {
            type: "geojson",
            data: "assets/layers/sites_v6_ranked.geojson"
        },
        paint: {
            "fill-color": "#ffa600",
            "fill-opacity": 0
        }
    });

    // Initialize the popup for tooltips
    var popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('mousemove', 'Sites_v6', function(e) {
        // Check if fill-opacity is greater than 0 (layer is visible)
        var opacity = map.getPaintProperty('Sites_v6', 'fill-opacity');
        if (opacity > 0) {
            // Get the Project_Name and Units from the hovered feature
            var projectName = e.features[0].properties.Project_Name;
            var units = e.features[0].properties.Units;

            // Create a popup and set its position to the hovered polygon
            popup
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="font-size: 1.4em; font-family: 'Barlow', sans-serif;">
                        <strong>${projectName}</strong><br>
                        Units: ${units}
                    </div>`)
                .addTo(map);
        }
    });

    // Remove the popup when the mouse leaves the polygon
    map.on('mouseleave', 'Sites_v6', function() {
        popup.remove();
    });


    // 2. MRTLines_20240914 (line)
    map.addLayer({
        id: "MRTLines_20240914",
        type: "line",
        source: {
            type: "geojson",
            data: "assets/layers/MRTLines_20240914_cleaned.geojson"
        },
        paint: {
            "line-color": ["get", "colour"],
            "line-width": 2,
            "line-opacity": 0
        }
    });

    map.on('mousemove', 'MRTLines_20240914', function(e) {
        // Check if fill-opacity is greater than 0 (layer is visible)
        var opacity = map.getPaintProperty('MRTLines_20240914', 'line-opacity');
        if (opacity > 0) {
            var lineName = e.features[0].properties.Line_Number;
            // Create a popup and set its position to the hovered polygon
            popup
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="font-size: 1.4em; font-family: 'Barlow', sans-serif;">
                        <strong>${lineName}</strong><br>
                    </div>`)
                .addTo(map);
        }
    });

    // Remove the popup when the mouse leaves the polygon
    map.on('mouseleave', 'MRTLines_20240914', function() {
        popup.remove();
    });

    // 3. MRTStations_20240914_v1 (circle)
    map.addLayer({
        id: "MRTStations_20240914_v1",
        type: "symbol",
        source: {
            type: "geojson",
            data: "assets/layers/MRTStations_20240914_v1.geojson"
        },
        minzoom: 12, // Only show MRT stations at zoom level 12 and above
        layout: {
            "text-field": ["get", "name"], // Display the name of the MRT station
            "text-font": ["Barlow Bold"], 
            "text-size": 16,
            "text-offset": [0, 0],
            "text-anchor": "top", // Anchor the text to the top of the symbol
        },
        paint: {
            "text-color": "#000000", // Text color
            "text-halo-color": "#ffffff", // White halo around text for readability
            "text-halo-width": 2, // Halo width for better contrast
            "text-opacity": 0,
        }
    });

    // 4. HawkerCentres (circle)
    map.addLayer({
        id: "HawkerCentres",
        type: "circle",
        source: {
            type: "geojson",
            data: "assets/layers/HawkerCentres_cleaned.geojson"
        },
        paint: {
            "circle-color": "#c64a06",  // Replace with the desired color
            "circle-radius": 5,  // Adjust as needed
            "circle-stroke-color": "#c64a06",
            "circle-stroke-width": 1,
            "circle-opacity": 0,
            "circle-stroke-opacity": 0
        }
    });

    map.on('mousemove', 'HawkerCentres', function(e) {
        // Check if fill-opacity is greater than 0 (layer is visible)
        var opacity = map.getPaintProperty('HawkerCentres', 'circle-opacity');
        if (opacity > 0) {
            // Get the Project_Name and Units from the hovered feature
            var hawName = e.features[0].properties.Hawker_Name;

            // Create a popup and set its position to the hovered polygon
            popup
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="font-size: 1.2em; font-family: 'Barlow', sans-serif;">
                        <strong>${hawName}</strong><br>
                    </div>`)
                .addTo(map);
        }
    });

    // Remove the popup when the mouse leaves the polygon
    map.on('mouseleave', 'HawkerCentres', function() {
        popup.remove();
    });

    // 5. PublicLibraries (circle)
    map.addLayer({
        id: "PublicLibraries",
        type: "circle",
        source: {
            type: "geojson",
            data: "assets/layers/PublicLibraries_cleaned.geojson"
        },
        paint: {
            "circle-color": "#0088cd",  // Replace with the desired color
            "circle-radius": 5,  // Adjust as needed
            "circle-stroke-color": "#0088cd",
            "circle-stroke-width": 1,
            "circle-opacity": 0,
            "circle-stroke-opacity": 0
        }
    });

    map.on('mousemove', 'PublicLibraries', function(e) {
        // Check if fill-opacity is greater than 0 (layer is visible)
        var opacity = map.getPaintProperty('PublicLibraries', 'circle-opacity');
        if (opacity > 0) {
            // Get the Project_Name and Units from the hovered feature
            var libName = e.features[0].properties.Library_Name;

            // Create a popup and set its position to the hovered polygon
            popup
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="font-size: 1.2em; font-family: 'Barlow', sans-serif;">
                        <strong>${libName}</strong><br>
                    </div>`)
                .addTo(map);
        }
    });

    // Remove the popup when the mouse leaves the polygon
    map.on('mouseleave', 'PublicLibraries', function() {
        popup.remove();
    });

    // 6. Parks (fill)
    map.addLayer({
        id: "Parks",
        type: "fill",
        source: {
            type: "geojson",
            data: "assets/layers/Parks_cleaned.geojson"
        },
        paint: {
            "fill-color": "#00c600",  // Replace with the desired color
            "fill-opacity": 0
        }
    });

    map.on('mousemove', 'Parks', function(e) {
        // Check if fill-opacity is greater than 0 (layer is visible)
        var opacity = map.getPaintProperty('Parks', 'fill-opacity');
        if (opacity > 0) {
            // Get the Project_Name and Units from the hovered feature
            var parkName = e.features[0].properties.Park_Name;

            // Create a popup and set its position to the hovered polygon
            popup
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="font-size: 1.2em; font-family: 'Barlow', sans-serif;">
                        <strong>${parkName}</strong><br>
                    </div>`)
                .addTo(map);
        }
    });

    // Remove the popup when the mouse leaves the polygon
    map.on('mouseleave', 'Parks', function() {
        popup.remove();
    });

    // 7. ExistingHDBDissolved (fill)
    map.addLayer({
        id: "ExistingHDBDissolved",
        type: "fill",
        source: {
            type: "geojson",
            data: "assets/layers/ExistingHDBDissolved.geojson"
        },
        paint: {
            "fill-color": "#b20300",  // Replace with the desired color
            "fill-opacity": 0
        }
    });

    // 8. AllCyclingPathPCN (line)
    map.addLayer({
        id: "AllCyclingPathPCN",
        type: "line",
        source: {
            type: "geojson",
            data: "assets/layers/AllCyclingPathPCN.geojson"
        },
        paint: {
            "line-color": "#e16d7c",  // Replace with the desired color
            "line-width": 2,
            "line-opacity": 0}
    });
});

// Reset button functionality
document.getElementById('reset-button').addEventListener('click', function() {
    map.flyTo({
        center: [103.809038, 1.353424],
        zoom: 10.5,
        bearing: 0,
        essential: true
    });
});
