document.addEventListener('DOMContentLoaded', () => {
    const popupContainer = document.getElementById('popup-container');
    const closePopupButton = document.getElementById('close-popup');

    // Close popup when the close button is clicked
    closePopupButton.addEventListener('click', () => {
        popupContainer.style.display = 'none';
    });
});

mapboxgl.accessToken = 'pk.eyJ1IjoidHV0dXRpbmQiLCJhIjoiY20weThlMHN1MDE5ZTJtcHZ6NWZ3cHZ0OSJ9.Lkd2ywOlbefcS46ePd5tuA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10', // Mapbox light theme
    center: [106.65, -6.31], // Temporary center
    zoom: 14
});

let doneLayer, notDoneLayer, highlightedLayer;
const dataPath = './data/';

// Hardcoded village coordinates
const villageCoordinates = {
    CILENGGANG: [106.667434, -6.305377],
    SAMPORA: [106.650339, -6.304853],
    PAGEDANGAN: [106.642392, -6.306665],
    KADUSIRUNG: [106.604812, -6.321499],
    JATAKE: [106.595534, -6.323114],
    MALANGNENGAH: [106.585831, -6.322439],
    SITUGADUNG: [106.614106, -6.319782],
};

// Function to fetch GeoJSON
async function fetchGeoJSON(fileName) {
    const response = await fetch(`${dataPath}${fileName}`);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
}

// Initialize the map and layers
async function initializeMap() {
    try {
        // Load phase1.geojson and fit map to its bounds
        const phase1Data = await fetchGeoJSON('phase1.geojson');
        const phase1Bounds = new mapboxgl.LngLatBounds();
        phase1Data.features.forEach(feature => {
            const coordinates = feature.geometry.coordinates[0]; // Outer ring of the polygon
            coordinates.forEach(coord => phase1Bounds.extend(coord));
        });
        map.fitBounds(phase1Bounds, { padding: 20 });

        // Load done.geojson and not_done.geojson
        const doneData = await fetchGeoJSON('done.geojson');
        const notDoneData = await fetchGeoJSON('not_done.geojson');

        // Add done.geojson layer
        map.addSource('done', { type: 'geojson', data: doneData });
        map.addLayer({
            id: 'done',
            type: 'fill',
            source: 'done',
            paint: { 'fill-color': '#00bdbd', 'fill-opacity': 0.5 }
        });

        // Add not_done.geojson layer
        map.addSource('not-done', { type: 'geojson', data: notDoneData });
        map.addLayer({
            id: 'not-done',
            type: 'fill',
            source: 'not-done',
            paint: { 'fill-color': '#ff0000', 'fill-opacity': 0.5 }
        });

        // Add a layer for highlighting selected polygons
        map.addSource('highlight', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        map.addLayer({
            id: 'highlight',
            type: 'fill',
            source: 'highlight',
            paint: { 'fill-color': '#ffff00', 'fill-opacity': 0.7 }
        });

        // Populate village dropdown
        populateVillageOptions([...doneData.features, ...notDoneData.features]);

        // Add click interaction for polygons
        addPolygonClickInteraction();
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Populate village options
function populateVillageOptions(features) {
    const villageSelect = document.getElementById('village-select');
    const uniqueVillages = Object.keys(villageCoordinates);
    uniqueVillages.forEach(village => {
        const option = document.createElement('option');
        option.value = village;
        option.textContent = village;
        villageSelect.appendChild(option);
    });

    // Add event listener for village selection
    villageSelect.addEventListener('change', () => {
        const selectedVillage = villageSelect.value;
        if (selectedVillage) zoomToVillageCenter(selectedVillage);
    });
}

// Zoom to the center of the selected village
function zoomToVillageCenter(village) {
    const center = villageCoordinates[village];
    if (center) {
        map.flyTo({ center, zoom: 14 }); // Adjust zoom level as needed
    } else {
        console.warn('Village coordinates not found.');
    }
}

// Search functionality
document.getElementById('search-btn').addEventListener('click', async () => {
    const village = document.getElementById('village-select').value;
    const nub = document.getElementById('nub-input').value;

    if (!village || !nub) {
        alert('Please select both a Village Administration and an ID.');
        return;
    }

    try {
        const [doneData, notDoneData] = await Promise.all([
            fetchGeoJSON('done.geojson'),
            fetchGeoJSON('not_done.geojson')
        ]);

        const allFeatures = [...doneData.features, ...notDoneData.features];
        const selectedFeature = allFeatures.find(
            feature =>
                feature.properties.DESA_KEL === village && feature.properties.NUB === nub
        );

        if (selectedFeature) {
            const coordinates = selectedFeature.geometry.coordinates[0]; // Outer ring of the polygon
            const center = calculatePolygonCenter(coordinates);

            // Highlight the selected polygon
            updateHighlightedFeature(selectedFeature);

            // Zoom closely to the land
            map.flyTo({ center, zoom: 18 });

            // Update the info panel
            updateInfoPanel(
                selectedFeature.properties,
                doneData.features.includes(selectedFeature)
            );
        } else {
            alert('No matching data found.');
        }
    } catch (error) {
        console.error('Search error:', error);
    }
});

// Calculate the center of a polygon
function calculatePolygonCenter(coordinates) {
    let lngSum = 0, latSum = 0, numPoints = 0;
    coordinates.forEach(coord => {
        lngSum += coord[0];
        latSum += coord[1];
        numPoints++;
    });
    return [lngSum / numPoints, latSum / numPoints];
}

// Update the highlighted polygon
function updateHighlightedFeature(feature) {
    const highlightSource = map.getSource('highlight');
    highlightSource.setData({
        type: 'FeatureCollection',
        features: [feature]
    });
}

// Add click interaction for polygons
function addPolygonClickInteraction() {
    map.on('click', 'done', e => handlePolygonClick(e));
    map.on('click', 'not-done', e => handlePolygonClick(e));
}

function handlePolygonClick(event) {
    const feature = event.features[0];
    const coordinates = feature.geometry.coordinates[0]; // Outer ring of the polygon
    const center = calculatePolygonCenter(coordinates);

    // Highlight the selected polygon
    updateHighlightedFeature(feature);

    // Fly to the polygon
    map.flyTo({ center, zoom: 18 });

    // Show popup with NUB and LUAS_UGR_M
    new mapboxgl.Popup()
        .setLngLat(center)
        .setHTML(
            `<strong>NUB:</strong> ${feature.properties.NUB}<br><strong>Area (m²):</strong> ${feature.properties.LUAS_UGR_M.toFixed(2)}`
        )
        .addTo(map);
}

// Update info panel
function updateInfoPanel(properties, isDone) {
    document.getElementById('village-info').textContent = properties.DESA_KEL;
    document.getElementById('id-info').textContent = properties.NUB;
    document.getElementById('area-info').textContent = properties.LUAS_UGR_M
    ? properties.LUAS_UGR_M.toFixed(2)
    : 'N/A';
    document.getElementById('certif-info').textContent = properties.NO_ALAS1;
    document.getElementById('remain-info').textContent = properties.SISA_TANAH;
    document.getElementById('compdate-info').textContent = 
    properties.TGL_BAPH ? new Date(properties.TGL_BAPH).toLocaleDateString() : 
    properties.TGL_PEN_PN ? new Date(properties.TGL_PEN_PN).toLocaleDateString() : 'N/A';
    document.getElementById('comptype-info').textContent = 
    properties.TGL_BAPH ? 'Monetary Recovery' : '';
    document.getElementById('compamount-info').textContent = 'TBD';
    const processInfo = document.getElementById('process-info');
    processInfo.textContent = isDone ? 'Complete' : 'Pending';
    processInfo.className = isDone ? 'complete' : 'pending';
}

// Initialize map
initializeMap();
