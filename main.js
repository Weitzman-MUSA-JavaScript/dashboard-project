// ============================================================
// STUDENT ORIENTED HOUSING SITE EXPLORER
// University of Pennsylvania - CPLN Course Assignment
// ============================================================

const CONFIG = {
    // Map settings
    mapCenter: [39.9526, -75.1652], // Philadelphia center
    mapZoom: 12,
    
    // Walking speed assumptions
    walkingSpeed: 80, // ~3 mph = 80 meters/minute
    bikingSpeed: 250, // ~9.5 mph = 250 meters/minute
    
    // Time thresholds in minutes -> converted to meters
    timeThresholds: {
        5: { walk: 400, bike: 1250 },
        10: { walk: 800, bike: 2500 },
        15: { walk: 1200, bike: 3750 },
        30: { walk: 2400, bike: 7500 }
    },
    
    // Amenity search radius
    amenityRadius: 500,
    
    // Default score weights
    defaultWeights: {
        distance: 0.3,
        parks: 0.2,
        grocery: 0.2,
        bikeAccess: 0.15,
        transit: 0.15
    }
};


// Fallback minimal campuses if Universities_Colleges.geojson is missing or empty
const FALLBACK_UNIVERSITIES = {
  "type":"FeatureCollection",
  "features":[
    {"type":"Feature","properties":{"name":"University of Pennsylvania"}, "geometry":{"type":"Point","coordinates":[-75.193213,39.952218]}},
    {"type":"Feature","properties":{"name":"Drexel University"}, "geometry":{"type":"Point","coordinates":[-75.189,39.956]}},
    {"type":"Feature","properties":{"name":"Temple University"}, "geometry":{"type":"Point","coordinates":[-75.157,39.981]}}
  ]
};

const DATA_BASE = './Data/';
let map;
let layers = {
    neighborhoods: null,
    universities: null,
    parks: null,
    groceryRestaurants: null,
    bikeNetwork: null,
    filteredNeighborhoods: null,
    selectedCampus: null,
    nearbyAmenities: null,
    transitStops: null
};

let data = {
    neighborhoods: null,
    universities: null,
    parks: null,
    groceryRestaurants: null,
    bikeNetwork: null,
    busStops: null,
    subwayStops: null,
    bikeShare: null
};

let state = {
    transitType: 'bus',
    selectedCampus: null,
    selectedCampusName: null,
    travelMode: 'walk',
    timeThreshold: 15,
    weights: { ...CONFIG.defaultWeights },
    filteredNeighborhoods: [],
    neighborhoodScores: {}
};

// ===================== UTILITY FUNCTIONS ====================
/**
 * Calculate distance between two points using Haversine formula
 * @param {Array} point1 - [lng, lat]
 * @param {Array} point2 - [lng, lat]
 * @returns {number} Distance in meters
 */
function haversineDistance(point1, point2) {
    const R = 6371000; // Earth's radius in meters
    const lat1 = point1[1] * Math.PI / 180;
    const lat2 = point2[1] * Math.PI / 180;
    const deltaLat = (point2[1] - point1[1]) * Math.PI / 180;
    const deltaLng = (point2[0] - point1[0]) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
}

/**
 * Get centroid of a polygon or multipolygon
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Array} [lng, lat]
 */
function getCentroid(geometry) {
    let coords;
    
    if (geometry.type === 'Polygon') {
        coords = geometry.coordinates[0];
    } else if (geometry.type === 'MultiPolygon') {
        let maxArea = 0;
        let largestRing = geometry.coordinates[0][0];
        geometry.coordinates.forEach(polygon => {
            const ring = polygon[0];
            const area = Math.abs(ring.reduce((sum, coord, i) => {
                const next = ring[(i + 1) % ring.length];
                return sum + (coord[0] * next[1]) - (next[0] * coord[1]);
            }, 0) / 2);
            if (area > maxArea) {
                maxArea = area;
                largestRing = ring;
            }
        });

    // Transit type selector
    const transitSel = document.getElementById('transitSelect');
    if (transitSel) {
        transitSel.addEventListener('change', (e) => {
            state.transitType = e.target.value;
            if (state.selectedCampus) {
                filterNeighborhoods();
            }
        });
    }

        coords = largestRing;
    } else if (geometry.type === 'Point') {
        return geometry.coordinates;
    } else {
        return null;
    }
    
    // Calculate centroid
    let sumX = 0, sumY = 0;
    coords.forEach(coord => {
        sumX += coord[0];
        sumY += coord[1];
    });
    
    return [sumX / coords.length, sumY / coords.length];
}

/**
 * @param {Array} point - [lng, lat]
 * @param {Array} polygon - Array of coordinates
 * @returns {boolean}
 */
function pointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    
    return inside;
}

/**
 * Get distance from point to nearest point on a line
 * @param {Array} point - [lng, lat]
 * @param {Array} lineCoords - Array of [lng, lat] coordinates
 * @returns {number} Distance in meters
 */
function pointToLineDistance(point, lineCoords) {
    let minDist = Infinity;
    
    for (let i = 0; i < lineCoords.length - 1; i++) {
        const segmentStart = lineCoords[i];
        const segmentEnd = lineCoords[i + 1];
        
        // Calculate distance to segment
        const dist = pointToSegmentDistance(point, segmentStart, segmentEnd);
        if (dist < minDist) {
            minDist = dist;
        }
    }
    
    return minDist;
}

/**
 * Distance from point to line segment
 */
function pointToSegmentDistance(point, segStart, segEnd) {
    const dx = segEnd[0] - segStart[0];
    const dy = segEnd[1] - segStart[1];
    
    if (dx === 0 && dy === 0) {
        return haversineDistance(point, segStart);
    }
    
    const t = Math.max(0, Math.min(1, 
        ((point[0] - segStart[0]) * dx + (point[1] - segStart[1]) * dy) / (dx * dx + dy * dy)
    ));
    
    const projection = [
        segStart[0] + t * dx,
        segStart[1] + t * dy
    ];
    
    return haversineDistance(point, projection);
}

/**
 * Format distance for display
 * @param {number} meters
 * @returns {string}
 */
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get score color based on value (0-1)
 * @param {number} score
 * @returns {string} Hex color
 */
function getScoreColor(score) {
    if (score < 0.33) {
        return '#e74c3c'; // Red
    } else if (score < 0.66) {
        return '#f39c12'; // Orange/Yellow
    } else {
        return '#27ae60'; // Green
    }
}

/**
 * Gradient color for score
 */
function getGradientColor(score) {
    const hue = score * 120;
    return `hsl(${hue}, 70%, 45%)`;
}

// ===================== DATA =========================

/**
 * Load all GeoJSON data files
 */
async function loadData() {
    showLoading(true, 'Loading data...');
    
    try {
        const [neighborhoods, universities, parks, groceryRestaurants, bikeNetwork, busStops, subwayStops, bikeShare] = await Promise.all([
            fetch(`${DATA_BASE}Philly Neighborhood.geojson`).then(r => r.json()),
            fetch(`${DATA_BASE}Universities_Colleges.geojson`).then(r => r.json()),
            fetch(`${DATA_BASE}Parks and Recreation.geojson`).then(r => r.json()),
            fetch(`${DATA_BASE}Grocery&Restaurant.geojson`).then(r => r.json()),
            fetch(`${DATA_BASE}Bike_Network.geojson`).then(r => r.json()),
            fetch(`${DATA_BASE}SEPTA_Bus_Stops.geojson`).then(r => r.json()).catch(_=>({type:'FeatureCollection',features:[]})),
            fetch(`${DATA_BASE}SEPTA_Subway_Stations.geojson`).then(r => r.json()).catch(_=>({type:'FeatureCollection',features:[]})),
            fetch(`${DATA_BASE}Indego_Stations.geojson`).then(r => r.json()).catch(_=>({type:'FeatureCollection',features:[]}))
        ]);
        
        data.neighborhoods = neighborhoods;
        data.universities = universities;
        data.parks = parks;
        data.groceryRestaurants = groceryRestaurants;
        data.bikeNetwork = bikeNetwork;
        data.busStops = busStops;
        data.subwayStops = subwayStops;
        data.bikeShare = bikeShare;

        // If universities layer is missing/empty, use fallback
        if (!universities || !universities.features || universities.features.length === 0) {
            console.warn('Universities_Colleges.geojson missing or empty. Using FALLBACK_UNIVERSITIES.');
            data.universities = FALLBACK_UNIVERSITIES;
        }

        
        // Process universities to get unique campus names
        processUniversities();
        
        console.log('Data loaded successfully');
        console.log(`- ${neighborhoods.features.length} neighborhoods`);
        console.log(`- ${universities.features.length} university buildings`);
        console.log(`- ${parks.features.length} parks`);
        console.log(`- ${groceryRestaurants.features.length} grocery/restaurants`);
        console.log(`- ${bikeNetwork.features.length} bike network segments`);
        
        showLoading(false);
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        showLoading(false);
        showError('Failed to load data. Please check that all GeoJSON files are in the data/ folder.');
        return false;
    }
}

/**
 * Process universities to extract unique campus names and their centroids
 */
function processUniversities() {
    const campusMap = new Map();
    
    data.universities.features.forEach(feature => {
        const name = feature.properties.name;
        if (!name) return;
        
        // Clean up the name
        const cleanName = name.trim();
        
        if (!campusMap.has(cleanName)) {
            campusMap.set(cleanName, {
                name: cleanName,
                buildings: [],
                centroid: null
            });
        }
        
        campusMap.get(cleanName).buildings.push(feature);
    });
    
    // Calculate centroid for each campus
    campusMap.forEach((campus, name) => {
        let sumLng = 0, sumLat = 0;
        let count = 0;
        
        campus.buildings.forEach(building => {
            const centroid = getCentroid(building.geometry);
            if (centroid) {
                sumLng += centroid[0];
                sumLat += centroid[1];
                count++;
            }
        });
        
        if (count > 0) {
            campus.centroid = [sumLng / count, sumLat / count];
        }
    });
    
    // Store processed campus data
    data.campuses = Array.from(campusMap.values())
        .filter(c => c.centroid)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Populate campus dropdown
    populateCampusDropdown();
}

// ===================== MAP ===================

/**
 * Initialize the Leaflet map
 */
function initMap() {
    // Create map
    map = L.map('map', {
        center: CONFIG.mapCenter,
        zoom: CONFIG.mapZoom,
        zoomControl: false
    });
    
    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    // Add base tile layer (CartoDB Positron for clean look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Initialize layer groups
    layers.neighborhoods = L.layerGroup().addTo(map);
    layers.universities = L.layerGroup().addTo(map);
    layers.parks = L.layerGroup().addTo(map);
    layers.groceryRestaurants = L.layerGroup().addTo(map);
    layers.bikeNetwork = L.layerGroup().addTo(map);
    layers.filteredNeighborhoods = L.layerGroup().addTo(map);
    layers.selectedCampus = L.layerGroup().addTo(map);
    layers.nearbyAmenities = L.layerGroup().addTo(map);
    
    // Add scale control
    L.control.scale({ position: 'bottomright' }).addTo(map);
}

/**
 * Add all data layers to map
 */
function addDataLayers() {
    // Add neighborhoods (initially hidden, will show filtered ones)
    addNeighborhoodsLayer();
    
    // Init transit stops group (for optional overlays)
    layers.transitStops = L.layerGroup().addTo(map);
    
    // Add universities
    addUniversitiesLayer();
    
    // Add parks (initially hidden)
    addParksLayer();
    
    // Add grocery/restaurants (initially hidden)
    addGroceryRestaurantsLayer();
    
    // Add bike network
    addBikeNetworkLayer();
}

/**
 * Add neighborhoods layer
 */
function addNeighborhoodsLayer() {
    const neighborhoodStyle = {
        color: '#3498db',
        weight: 1,
        opacity: 0.6,
        fillColor: '#3498db',
        fillOpacity: 0.1
    };
    
    L.geoJSON(data.neighborhoods, {
        style: neighborhoodStyle,
        onEachFeature: (feature, layer) => {
            const name = feature.properties.LISTNAME || feature.properties.NAME || 'Unknown';
            layer.bindTooltip(name, { sticky: true });
        }
    }).addTo(layers.neighborhoods);
}

/**
 * Add universities layer
 */
function addUniversitiesLayer() {
    const universityStyle = {
        color: '#9b59b6',
        weight: 2,
        opacity: 0.8,
        fillColor: '#9b59b6',
        fillOpacity: 0.3
    };
    
    L.geoJSON(data.universities, {
        style: universityStyle,
        onEachFeature: (feature, layer) => {
            const name = feature.properties.name || 'Unknown';
            const address = feature.properties.address || '';
            layer.bindPopup(`
                <div class="popup-content">
                    <h4>${name}</h4>
                    <p>${address}</p>
                </div>
            `);
            
            layer.on('click', () => {
                selectCampusByName(name);
            });
        }
    }).addTo(layers.universities);
}

/**
 * Add parks layer
 */
function addParksLayer() {
    const parkStyle = {
        color: '#27ae60',
        weight: 1,
        opacity: 0.7,
        fillColor: '#27ae60',
        fillOpacity: 0.3
    };
    
    L.geoJSON(data.parks, {
        style: parkStyle,
        onEachFeature: (feature, layer) => {
            const name = feature.properties.public_name || feature.properties.label || 'Park';
            layer.bindTooltip(name, { sticky: true });
        }
    }).addTo(layers.parks);
    
    // Initially hide parks
    map.removeLayer(layers.parks);
}

/**
 * Add grocery/restaurants layer
 */
function addGroceryRestaurantsLayer() {
    data.groceryRestaurants.features.forEach(feature => {
        if (feature.geometry.type !== 'Point') return;
        
        const coords = feature.geometry.coordinates;
        const name = feature.properties.name || 'Unknown';
        const type = feature.properties.amenity || feature.properties.shop || 'business';
        
        // Choose icon based on type
        let iconClass = 'amenity-marker';
        let iconHtml = '🏪';
        
        if (type === 'restaurant' || type === 'fast_food' || type === 'cafe') {
            iconHtml = '🍴';
            iconClass += ' restaurant';
        } else if (type === 'supermarket' || type === 'grocery') {
            iconHtml = '🛒';
            iconClass += ' grocery';
        }
        
        const marker = L.marker([coords[1], coords[0]], {
            icon: L.divIcon({
                className: iconClass,
                html: iconHtml,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        });
        
        marker.bindTooltip(name);
        marker.addTo(layers.groceryRestaurants);
    });
    
    // Initially hide amenities
    map.removeLayer(layers.groceryRestaurants);
}

/**
 * Add bike network layer
 */
function addBikeNetworkLayer() {
    const bikeStyle = (feature) => {
        const type = feature.properties.TYPE || '';
        let color = '#16a085';
        let weight = 2;
        let dashArray = null;
        
        if (type.includes('Separated')) {
            color = '#1abc9c';
            weight = 3;
        } else if (type.includes('Buffered')) {
            color = '#2ecc71';
            weight = 2.5;
        } else if (type.includes('Conventional')) {
            color = '#27ae60';
            weight = 2;
            dashArray = '5, 5';
        }
        
        return {
            color: color,
            weight: weight,
            opacity: 0.7,
            dashArray: dashArray
        };
    };
    
    L.geoJSON(data.bikeNetwork, {
        style: bikeStyle,
        onEachFeature: (feature, layer) => {
            const street = feature.properties.STREETNAME || 'Bike Lane';
            const type = feature.properties.TYPE || 'Unknown Type';
            layer.bindTooltip(`${street}<br><small>${type}</small>`);
        }
    }).addTo(layers.bikeNetwork);
    
    // Initially hide bike network
    map.removeLayer(layers.bikeNetwork);
}

// ===================== UI CONTROLS ==========================

/**
 * Populate campus dropdown with unique university names
 */
function populateCampusDropdown() {
    const select = document.getElementById('campusSelect');
    select.innerHTML = '<option value="">-- Select a Campus --</option>';
    
    data.campuses.forEach(campus => {
        const option = document.createElement('option');
        option.value = campus.name;
        option.textContent = `${campus.name} (${campus.buildings.length} buildings)`;
        select.appendChild(option);
    });
}

/**
 * Select campus by name
 */
function selectCampusByName(name) {
    const campus = data.campuses.find(c => c.name === name);
    if (!campus) return;
    
    state.selectedCampus = campus.centroid;
    state.selectedCampusName = campus.name;
    
    // Update dropdown
    document.getElementById('campusSelect').value = name;
    
    // Update map
    highlightSelectedCampus(campus);
    
    // Run filter
    filterNeighborhoods();
}

/**
 * Highlight selected campus on map
 */
function highlightSelectedCampus(campus) {
    layers.selectedCampus.clearLayers();
    
    // Add marker at campus centroid
    const marker = L.marker([campus.centroid[1], campus.centroid[0]], {
        icon: L.divIcon({
            className: 'campus-marker',
            html: '🎓',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        })
    });
    
    marker.bindPopup(`
        <div class="popup-content campus-popup">
            <h3>${campus.name}</h3>
            <p>${campus.buildings.length} buildings</p>
        </div>
    `);
    
    marker.addTo(layers.selectedCampus);
    
    // Add circle showing time threshold
    const radius = getThresholdDistance();
    const circle = L.circle([campus.centroid[1], campus.centroid[0]], {
        radius: radius,
        color: '#3498db',
        weight: 2,
        opacity: 0.6,
        fillColor: '#3498db',
        fillOpacity: 0.1,
        dashArray: '10, 10'
    });
    
    circle.addTo(layers.selectedCampus);
    
    // Zoom to show circle
    map.fitBounds(circle.getBounds(), { padding: [50, 50] });
}

/**
 * Threshold distance in meters based on current settings
 */
function getThresholdDistance() {
    const mode = state.travelMode === 'bike' ? 'bike' : 'walk';
    return CONFIG.timeThresholds[state.timeThreshold][mode];
}

/**
 * Distance from a point to the nearest stop of the selected transit type
 */
function getNearestTransitDistance(lnglat) {
    let features = [];
    if (state.transitType === 'bus' && data.busStops) features = data.busStops.features || [];
    else if (state.transitType === 'subway' && data.subwayStops) features = data.subwayStops.features || [];
    else if (state.transitType === 'bikeshare' && data.bikeShare) features = data.bikeShare.features || [];
    
    let minDist = Infinity;
    for (const f of features) {
        if (!f.geometry || f.geometry.type !== 'Point') continue;
        const coords = f.geometry.coordinates;
        const dist = haversineDistance(lnglat, coords);
        if (dist < minDist) minDist = dist;
    }
    return minDist;
}


/**
 * Initialize UI event listeners
 */
function initUIListeners() {
    // Campus selection
    document.getElementById('campusSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            selectCampusByName(e.target.value);
        }
    });
    
    // Travel mode
    document.querySelectorAll('input[name="travelMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.travelMode = e.target.value;
            updateBikeNetworkVisibility();
            if (state.selectedCampus) {
                highlightSelectedCampus(data.campuses.find(c => c.name === state.selectedCampusName));
                filterNeighborhoods();
            }
        });
    });
    
    // Time threshold
    document.getElementById('timeThreshold').addEventListener('change', (e) => {
        state.timeThreshold = parseInt(e.target.value);
        document.getElementById('timeValue').textContent = `${state.timeThreshold} min`;
        if (state.selectedCampus) {
            highlightSelectedCampus(data.campuses.find(c => c.name === state.selectedCampusName));
            filterNeighborhoods();
        }
    });
    
    // Weight sliders
    ['distanceWeight', 'parksWeight', 'groceryWeight', 'bikeWeight', 'transitWeight'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            const key = id.replace('Weight', '');
            const mappedKey = key === 'distance' ? 'distance' : 
                             key === 'parks' ? 'parks' : 
                             key === 'grocery' ? 'grocery' : 
                             key === 'bike' ? 'bikeAccess' : 'transit';
            state.weights[mappedKey] = parseInt(e.target.value) / 100;
            document.getElementById(`${id}Value`).textContent = `${e.target.value}%`;
            normalizeWeights(mappedKey);
            if (state.selectedCampus) {
                updateScores();
            }
        });
    });
    
    // Layer toggles
    document.getElementById('showParks').addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(layers.parks);
        } else {
            map.removeLayer(layers.parks);
        }
    });
    
    document.getElementById('showGrocery').addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(layers.groceryRestaurants);
        } else {
            map.removeLayer(layers.groceryRestaurants);
        }
    });
    
    document.getElementById('showBike').addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(layers.bikeNetwork);
        } else {
            map.removeLayer(layers.bikeNetwork);
        }
    });
    
    document.getElementById('showNeighborhoods').addEventListener('change', (e) => {
        if (e.target.checked) {
            map.addLayer(layers.neighborhoods);
        } else {
            map.removeLayer(layers.neighborhoods);
        }
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
}

/**
 * Update bike network visibility based on travel mode
 */
function updateBikeNetworkVisibility() {
    const checkbox = document.getElementById('showBike');
    if (state.travelMode === 'bike') {
        checkbox.checked = true;
        map.addLayer(layers.bikeNetwork);
    }
}

/**
 * Normalize weights to sum to 1
 */
function normalizeWeights(changedKey) {
    // For simplicity, we'll just update the display
    // In a full implementation, you might want to auto-balance weights
    updateWeightDisplay();
}

/**
 * Update weight display
 */
function updateWeightDisplay() {
    document.getElementById('distanceWeightValue').textContent = `${Math.round(state.weights.distance * 100)}%`;
    document.getElementById('parksWeightValue').textContent = `${Math.round(state.weights.parks * 100)}%`;
    document.getElementById('groceryWeightValue').textContent = `${Math.round(state.weights.grocery * 100)}%`;
    document.getElementById('bikeWeightValue').textContent = `${Math.round(state.weights.bikeAccess * 100)}%`;
    document.getElementById('transitWeightValue').textContent = `${Math.round((state.weights.transit || 0) * 100)}%`;
    
    document.getElementById('distanceWeight').value = Math.round(state.weights.distance * 100);
    document.getElementById('parksWeight').value = Math.round(state.weights.parks * 100);
    document.getElementById('groceryWeight').value = Math.round(state.weights.grocery * 100);
    document.getElementById('bikeWeight').value = Math.round(state.weights.bikeAccess * 100);
    document.getElementById('transitWeight').value = Math.round((state.weights.transit || 0) * 100);
}

/**
 * Reset all filters
 */
function resetFilters() {
    state.selectedCampus = null;
    state.selectedCampusName = null;
    state.travelMode = 'walk';
    state.timeThreshold = 15;
    state.weights = { ...CONFIG.defaultWeights };
    state.transitType = 'bus';
    state.filteredNeighborhoods = [];
    state.neighborhoodScores = {};
    
    // Reset UI
    document.getElementById('campusSelect').value = '';
    document.getElementById('timeThreshold').value = 15;
    document.getElementById('timeValue').textContent = '15 min';
    document.querySelector('input[name="travelMode"][value="walk"]').checked = true;
    
    updateWeightDisplay();
    
    // Clear layers
    layers.selectedCampus.clearLayers();
    layers.filteredNeighborhoods.clearLayers();
    layers.nearbyAmenities.clearLayers();
    
    // Clear results
    document.getElementById('resultsContent').innerHTML = `
        <div class="empty-state">
            <p>Select a campus and set your preferences to find suitable housing areas.</p>
        </div>
    `;
    
    // Reset map view
    map.setView(CONFIG.mapCenter, CONFIG.mapZoom);
}

// ===================== FILTERING & SCORING ==================

/**
 * Filter neighborhoods based on distance to campus
 */
function filterNeighborhoods() {
    if (!state.selectedCampus) return;
    
    showLoading(true, 'Analyzing neighborhoods...');
    
    const thresholdDistance = getThresholdDistance();
    
    state.filteredNeighborhoods = [];
    layers.filteredNeighborhoods.clearLayers();
    
    data.neighborhoods.features.forEach(feature => {
        const centroid = getCentroid(feature.geometry);
        if (!centroid) return;
        
        const distance = haversineDistance(centroid, state.selectedCampus);
        const transitDist = getNearestTransitDistance(centroid);
        if (distance <= thresholdDistance && transitDist <= thresholdDistance) {
            state.filteredNeighborhoods.push({
                feature: feature,
                centroid: centroid,
                distance: distance,
                transitDistance: transitDist,
                name: feature.properties.LISTNAME || feature.properties.NAME || 'Unknown'
            });
        }
    });
    
    // Calculate scores for filtered neighborhoods
    calculateScores();
    
    // Update map with filtered neighborhoods
    updateFilteredNeighborhoodsLayer();
    
    // Update results panel
    updateResultsPanel();
    
    showLoading(false);
}

/**
 * Calculate scores for all filtered neighborhoods
 */
function calculateScores() {
    state.neighborhoodScores = {};
    
    // Get max values for normalization
    let maxDistance = 0;
    let maxParks = 0;
    let maxGrocery = 0;
    let maxBikeAccess = 0;
    let maxTransitDistance = 0;
    
    // First pass: calculate raw values
    state.filteredNeighborhoods.forEach(neighborhood => {
        const metrics = calculateNeighborhoodMetrics(neighborhood);
        state.neighborhoodScores[neighborhood.name] = metrics;
        
        maxDistance = Math.max(maxDistance, metrics.distance);
        maxParks = Math.max(maxParks, metrics.parksCount);
        maxGrocery = Math.max(maxGrocery, metrics.groceryCount);
        maxBikeAccess = Math.max(maxBikeAccess, metrics.bikeAccessScore);
        maxTransitDistance = Math.max(maxTransitDistance, neighborhood.transitDistance || 0);
    });
    
    // Second pass: normalize and calculate final scores
    state.filteredNeighborhoods.forEach(neighborhood => {
        const metrics = state.neighborhoodScores[neighborhood.name];
        
        // Normalize (0-1, where higher is better)
        const distanceScore = maxDistance > 0 ? 1 - (metrics.distance / maxDistance) : 1;
        const parksScore = maxParks > 0 ? metrics.parksCount / maxParks : 0;
        const groceryScore = maxGrocery > 0 ? metrics.groceryCount / maxGrocery : 0;
        const bikeScore = maxBikeAccess > 0 ? metrics.bikeAccessScore / maxBikeAccess : 0;
        
        // Calculate weighted score
        const finalScore = (
            distanceScore * state.weights.distance +
            parksScore * state.weights.parks +
            groceryScore * state.weights.grocery +
            bikeScore * state.weights.bikeAccess
        );
        
        metrics.normalizedDistance = distanceScore;
        metrics.normalizedParks = parksScore;
        metrics.normalizedGrocery = groceryScore;
        metrics.normalizedBike = bikeScore;
        metrics.finalScore = finalScore;
    });
}

/**
 * Calculate metrics for a single neighborhood
 */
function calculateNeighborhoodMetrics(neighborhood) {
    const centroid = neighborhood.centroid;
    
    // Count nearby parks
    let parksCount = 0;
    data.parks.features.forEach(park => {
        const parkCentroid = getCentroid(park.geometry);
        if (parkCentroid) {
            const dist = haversineDistance(centroid, parkCentroid);
            if (dist <= CONFIG.amenityRadius) {
                parksCount++;
            }
        }
    });
    
    // Count nearby grocery/restaurants
    let groceryCount = 0;
    let restaurantCount = 0;
    data.groceryRestaurants.features.forEach(amenity => {
        if (amenity.geometry.type !== 'Point') return;
        const coords = amenity.geometry.coordinates;
        const dist = haversineDistance(centroid, coords);
        if (dist <= CONFIG.amenityRadius) {
            const type = amenity.properties.amenity || amenity.properties.shop;
            if (type === 'supermarket' || type === 'grocery') {
                groceryCount++;
            } else {
                restaurantCount++;
            }
        }
    });
    
    // Calculate bike access score
    let bikeAccessScore = 0;
    let minBikeDistance = Infinity;
    data.bikeNetwork.features.forEach(segment => {
        const dist = pointToLineDistance(centroid, segment.geometry.coordinates);
        if (dist < minBikeDistance) {
            minBikeDistance = dist;
        }
    });
    // Convert to score (closer is better)
    bikeAccessScore = Math.max(0, 1 - (minBikeDistance / 1000));
    
    return {
        distance: neighborhood.distance,
        parksCount: parksCount,
        groceryCount: groceryCount + restaurantCount,
        restaurantCount: restaurantCount,
        bikeAccessScore: bikeAccessScore,
        minBikeDistance: minBikeDistance,
        minTransitDistance: neighborhood.transitDistance || Infinity
    };
}

/**
 * Update scores without re-filtering
 */
function updateScores() {
    if (state.filteredNeighborhoods.length === 0) return;
    
    // Recalculate weighted scores
    state.filteredNeighborhoods.forEach(neighborhood => {
        const metrics = state.neighborhoodScores[neighborhood.name];
        if (!metrics) return;
        
        const finalScore = (
            metrics.normalizedDistance * state.weights.distance +
            metrics.normalizedParks * state.weights.parks +
            metrics.normalizedGrocery * state.weights.grocery +
            metrics.normalizedBike * state.weights.bikeAccess +
            (metrics.normalizedTransit || 0) * (state.weights.transit || 0)
        );
        
        metrics.finalScore = finalScore;
    });
    
    // Update map and results
    updateFilteredNeighborhoodsLayer();
    updateResultsPanel();
}

/**
 * Update filtered neighborhoods layer on map
 */
function updateFilteredNeighborhoodsLayer() {
    layers.filteredNeighborhoods.clearLayers();
    
    state.filteredNeighborhoods.forEach(neighborhood => {
        const score = state.neighborhoodScores[neighborhood.name]?.finalScore || 0;
        const color = getGradientColor(score);
        
        const layer = L.geoJSON(neighborhood.feature, {
            style: {
                color: color,
                weight: 2,
                opacity: 0.9,
                fillColor: color,
                fillOpacity: 0.4
            }
        });
        
        layer.on('click', () => showNeighborhoodDetail(neighborhood));
        layer.bindTooltip(`
            <strong>${neighborhood.name}</strong><br>
            Score: ${(score * 100).toFixed(0)}/100
        `, { sticky: true });
        
        layer.addTo(layers.filteredNeighborhoods);
    });
}

/**
 * Update results panel
 */
function updateResultsPanel() {
    const container = document.getElementById('resultsContent');
    
    if (state.filteredNeighborhoods.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No neighborhoods found within the selected travel time. Try increasing the time threshold.</p>
            </div>
        `;
        return;
    }
    
    // Sort by score
    const sorted = [...state.filteredNeighborhoods].sort((a, b) => {
        const scoreA = state.neighborhoodScores[a.name]?.finalScore || 0;
        const scoreB = state.neighborhoodScores[b.name]?.finalScore || 0;
        return scoreB - scoreA;
    });
    
    let html = `<div class="results-summary">
        <p>Found <strong>${sorted.length}</strong> neighborhoods within ${state.timeThreshold} min ${state.travelMode === 'bike' ? 'bike ride' : 'walk'} of ${state.selectedCampusName}</p>
    </div>`;
    
    html += '<div class="results-list">';
    
    sorted.forEach((neighborhood, index) => {
        const metrics = state.neighborhoodScores[neighborhood.name] || {};
        const score = metrics.finalScore || 0;
        const color = getGradientColor(score);
        
        html += `
            <div class="result-card" onclick="showNeighborhoodDetail(state.filteredNeighborhoods.find(n => n.name === '${neighborhood.name.replace(/'/g, "\\'")}'))">
                <div class="result-rank" style="background-color: ${color}">${index + 1}</div>
                <div class="result-info">
                    <h4>${neighborhood.name}</h4>
                    <div class="result-metrics">
                        <span class="metric" title="Distance to campus">
                            📍 ${formatDistance(neighborhood.distance)}
                        </span>
                        <span class="metric" title="Nearby parks">
                            🌳 ${metrics.parksCount || 0}
                        </span>
                        <span class="metric" title="Nearby stores/restaurants">
                            🏪 ${metrics.groceryCount || 0}
                        </span>
                        <span class="metric" title="Bike access score">
                            🚲 ${((metrics.bikeAccessScore || 0) * 100).toFixed(0)}% \
                        </span>
                        <span class="metric" title="Nearest transit stop">
                            🧭 ${formatDistance(neighborhood.transitDistance || 0)}
                        </span>
                    </div>
                </div>
                <div class="result-score">
                    <span class="score-value" style="color: ${color}">${(score * 100).toFixed(0)}</span>
                    <span class="score-label">score</span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

/**
 * Detailed view for a neighborhood
 */
function showNeighborhoodDetail(neighborhood) {
    if (!neighborhood) return;
    
    const metrics = state.neighborhoodScores[neighborhood.name] || {};
    const score = metrics.finalScore || 0;
    const color = getGradientColor(score);
    
    // Zoom to neighborhood
    const bounds = L.geoJSON(neighborhood.feature).getBounds();
    map.fitBounds(bounds, { padding: [100, 100] });
    
    // Popup with details
    const popup = L.popup()
        .setLatLng([neighborhood.centroid[1], neighborhood.centroid[0]])
        .setContent(`
            <div class="neighborhood-detail-popup">
                <h3>${neighborhood.name}</h3>
                <div class="detail-score" style="background-color: ${color}">
                    ${(score * 100).toFixed(0)}/100
                </div>
                <div class="detail-breakdown">
                    <div class="detail-row">
                        <span class="detail-label">📍 Distance to ${state.selectedCampusName}</span>
                        <span class="detail-value">${formatDistance(neighborhood.distance)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🌳 Parks nearby (500m)</span>
                        <span class="detail-value">${metrics.parksCount || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🏪 Stores/Restaurants (500m)</span>
                        <span class="detail-value">${metrics.groceryCount || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">🚲 Nearest bike lane</span>
                        <span class="detail-value">${formatDistance(metrics.minBikeDistance || 0)}</span>
                    </div>
                </div>
                <div class="score-breakdown">
                    <h4>Score Breakdown</h4>
                    <div class="score-bar">
                        <div class="score-segment" style="width: ${(metrics.normalizedDistance || 0) * state.weights.distance * 100}%; background-color: #3498db;" title="Distance: ${((metrics.normalizedDistance || 0) * state.weights.distance * 100).toFixed(0)}%"></div>
                        <div class="score-segment" style="width: ${(metrics.normalizedParks || 0) * state.weights.parks * 100}%; background-color: #27ae60;" title="Parks: ${((metrics.normalizedParks || 0) * state.weights.parks * 100).toFixed(0)}%"></div>
                        <div class="score-segment" style="width: ${(metrics.normalizedGrocery || 0) * state.weights.grocery * 100}%; background-color: #e67e22;" title="Grocery: ${((metrics.normalizedGrocery || 0) * state.weights.grocery * 100).toFixed(0)}%"></div>
                        <div class="score-segment" style="width: ${(metrics.normalizedBike || 0) * state.weights.bikeAccess * 100}%; background-color: #16a085;" title="Bike: ${((metrics.normalizedBike || 0) * state.weights.bikeAccess * 100).toFixed(0)}%"></div>
                    </div>
                    <div class="score-legend">
                        <span style="color: #3498db">● Distance</span>
                        <span style="color: #27ae60">● Parks</span>
                        <span style="color: #e67e22">● Grocery</span>
                        <span style="color: #16a085">● Bike</span>
                    </div>
                </div>
            </div>
        `)
        .openOn(map);
    
    // Highlight nearby amenities
    highlightNearbyAmenities(neighborhood);
}

/**
 * Highlight amenities near a neighborhood
 */
function highlightNearbyAmenities(neighborhood) {
    layers.nearbyAmenities.clearLayers();
    
    const centroid = neighborhood.centroid;
    
    // Add circle showing amenity radius
    L.circle([centroid[1], centroid[0]], {
        radius: CONFIG.amenityRadius,
        color: '#f39c12',
        weight: 2,
        opacity: 0.6,
        fillColor: '#f39c12',
        fillOpacity: 0.05,
        dashArray: '5, 5'
    }).addTo(layers.nearbyAmenities);
    
    // Highlight nearby parks
    data.parks.features.forEach(park => {
        const parkCentroid = getCentroid(park.geometry);
        if (parkCentroid) {
            const dist = haversineDistance(centroid, parkCentroid);
            if (dist <= CONFIG.amenityRadius) {
                L.geoJSON(park, {
                    style: {
                        color: '#27ae60',
                        weight: 3,
                        fillColor: '#27ae60',
                        fillOpacity: 0.5
                    }
                }).addTo(layers.nearbyAmenities);
            }
        }
    });
    
    // Highlight nearby grocery/restaurants
    data.groceryRestaurants.features.forEach(amenity => {
        if (amenity.geometry.type !== 'Point') return;
        const coords = amenity.geometry.coordinates;
        const dist = haversineDistance(centroid, coords);
        if (dist <= CONFIG.amenityRadius) {
            const type = amenity.properties.amenity || amenity.properties.shop;
            const icon = type === 'supermarket' || type === 'grocery' ? '🛒' : '🍴';
            
            L.marker([coords[1], coords[0]], {
                icon: L.divIcon({
                    className: 'highlighted-amenity',
                    html: icon,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                })
            }).addTo(layers.nearbyAmenities);
        }
    });

    // Highlight transit stops of selected type
    let tFeatures = [];
    if (state.transitType === 'bus' && data.busStops) tFeatures = data.busStops.features || [];
    else if (state.transitType === 'subway' && data.subwayStops) tFeatures = data.subwayStops.features || [];
    else if (state.transitType === 'bikeshare' && data.bikeShare) tFeatures = data.bikeShare.features || [];
    tFeatures.forEach(stop => {
        if (!stop.geometry || stop.geometry.type !== 'Point') return;
        const coords = stop.geometry.coordinates;
        const dist = haversineDistance(centroid, coords);
        if (dist <= CONFIG.amenityRadius) {
            const icon = state.transitType === 'bus' ? '🚌' : (state.transitType === 'subway' ? '🚇' : '🚲');
            L.marker([coords[1], coords[0]], {
                icon: L.divIcon({ className: 'highlighted-amenity', html: icon, iconSize: [28,28], iconAnchor: [14,14]})
            }).addTo(layers.nearbyAmenities);
        }
    });

}

// ===================== UI HELPERS ===========================

/**
 * Show/hide loading indicator
 */
function showLoading(show, message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    
    if (show) {
        text.textContent = message;
        overlay.classList.add('visible');
    } else {
        overlay.classList.remove('visible');
    }
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.getElementById('resultsContent');
    container.innerHTML = `
        <div class="error-state">
            <p>⚠️ ${message}</p>
        </div>
    `;
}

// ===================== INITIALIZATION =======================

/**
 * Main initialization function
 */
async function init() {
    console.log('Initializing Student Housing Site Explorer...');
    
    // Initialize map
    initMap();
    
    // Load data
    const success = await loadData();
    
    if (success) {
        addDataLayers();        
        initUIListeners();
        
        console.log('Initialization complete!');
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export for potential external use
window.HousingExplorer = {
    state,
    data,
    selectCampusByName,
    filterNeighborhoods,
    resetFilters,
    showNeighborhoodDetail
};
