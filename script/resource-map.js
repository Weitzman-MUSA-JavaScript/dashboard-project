import { resourceIcons } from './map-styles.js';
import { zoomToResource } from './address-search.js';

export let resourceLayers = {};
export let resourceMap;
let resourceData = {};

export function initializeResourceMap(eventBus, data) {
  resourceData = data;


  if (resourceMap) {
      resourceMap.remove();
  }
  
  resourceMap = L.map('resource-map').setView([40.047591, -75.153350], 10);
    
  const mapboxKey = 'pk.eyJ1IjoiY2xhdWRsb3ciLCJhIjoiY20weTY3MDZoMDNocTJrbXpqa3lqZWJlaSJ9.3N1iXpEvsJ0GwajGVwwkTg';
  const mapboxStyle = 'mapbox/light-v11';
    
  const baseTileLayer = L.tileLayer(`https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://mapbox.com/" target="_blank">Mapbox</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
  });
    
  baseTileLayer.addTo(resourceMap);

  // Initialize layers based on initial checkbox states
  updateLayers();

  // Add event listener for checkbox changes
  document.getElementById('filter-form').addEventListener('change', updateLayers);

  return resourceMap;

  function updateLayers() {
    const filters = {
        food: document.getElementById('food-checkbox').checked,
        clothing: document.getElementById('clothing-checkbox').checked,
        showers: document.getElementById('showers-checkbox').checked,
        toilets: document.getElementById('toilets-checkbox').checked,
        intakeCenters: document.getElementById('intakeCenters-checkbox').checked,
    };
  
    Object.entries(filters).forEach(([resourceType, isChecked]) => {
        if (isChecked && !resourceLayers[resourceType]) {
            addResourceLayer(resourceType);
        } else if (!isChecked && resourceLayers[resourceType]) {
            removeResourceLayer(resourceType);
        }
    });
  }
    
  function addResourceLayer(resourceType) {
    if (resourceLayers[resourceType]) return;
  
    const geojsonData = resourceData[resourceType];
  
    resourceLayers[resourceType] = L.geoJSON(geojsonData, {
      pointToLayer: (feature, latlng) => {
        const marker = L.marker(latlng, { icon: resourceIcons[resourceType] });
  
        // Add click event to the marker to zoom and show the popup
        marker.on('click', () => {
          const resource = {
            lat: latlng.lat,
            lon: latlng.lng,
            name: feature.properties.site_name || 'Unknown',
          };
          
          zoomToResource(resource);
        });
  
        return marker;
      },
      onEachFeature: (feature, layer) => {
        const siteName = feature.properties.site_name || 'Unknown';
        layer.bindTooltip(siteName, { permanent: false, direction: 'right' });
      }
    }).addTo(resourceMap);
  }
      
  function removeResourceLayer(resourceType) {
    if (resourceLayers[resourceType]) {
        resourceMap.removeLayer(resourceLayers[resourceType]);
        delete resourceLayers[resourceType];
    }
  }
}
