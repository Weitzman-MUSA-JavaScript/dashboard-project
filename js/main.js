import { initializeSafetyMap, showCommunitiesOnMap, highlightAreaByName } from './map.js';
import { setupSearchControls } from './address-entry.js';
import { calculateSafetyTrends } from './function-tools.js';


window.appState = {
  communities: null,       
  crimeData: {},          
  safetyTrends: {},        
  currentTimeRange: '6months', 
  isInitialized: false    
};

const APP_CONSTANTS = {
  TIME_RANGES: ['6months', '1year', '2years'],
  CRIME_DATA_CACHE_DURATION: 180000,
  COMMUNITY_GEOJSON_URL: 'data/philadelphia-neighborhoods.geojson',
  CRIME_DATA_URLS: {
    '6months': ['data/incidents_part1_part2_2025.csv'],
    '1year': ['data/incidents_part1_part2_2025.csv', 'data/incidents_part1_part2_2024.csv'],
    '2years': ['data/incidents_part1_part2_2025.csv', 'data/incidents_part1_part2_2024.csv', 'data/incidents_part1_part2_2023.csv', 'data/incidents_part1_part2_2022.csv']
  }
};

const safetyMap = initializeSafetyMap();
window.safetyMap = safetyMap;

async function loadCommunities() {
  try {
    console.log('Starting to load community data...');
    const response = await fetch(APP_CONSTANTS.COMMUNITY_GEOJSON_URL);
    
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const data = await response.json();
    validateGeoJSON(data);
    const processedCommunities = processCommunityData(data);
    window.appState.communities = processedCommunities;
    window.communitiesData = processedCommunities;
    
    console.log(`Community data loading complete, ${processedCommunities.features.length} valid communities in total`);
    return processedCommunities;
  } catch (error) {
    console.error('Failed to load community data:', error);
    const emptyData = { type: 'FeatureCollection', features: [] };
    window.appState.communities = emptyData;
    window.communitiesData = emptyData;
    return emptyData;
  }
}

function validateGeoJSON(data) {
  if (!data) throw new Error('GeoJSON data is empty');
  if (data.type !== 'FeatureCollection') throw new Error('GeoJSON type must be FeatureCollection');
  if (!data.features || !Array.isArray(data.features)) throw new Error('GeoJSON missing features array');
  
  data.features.forEach((feature, index) => {
    if (!feature || feature.type !== 'Feature' || !feature.geometry || !feature.properties) {
      throw new Error(`Feature ${index + 1} is invalid (missing type/geometry/properties)`);
    }
  });
}

function processCommunityData(geoJSON) {
  const validatedFeatures = geoJSON.features.map((feature, index) => {
    if (!feature.id) {
      const name = feature.properties?.MAPNAME || feature.properties?.name || `Community_${index + 1}`;
      feature.id = name.replace(/\s+/g, '_').toLowerCase();
    }
    
    if (!feature.properties.name && feature.properties.MAPNAME) {
      feature.properties.name = feature.properties.MAPNAME;
    }
    
    return feature;
  });
  
  return { ...geoJSON, features: validatedFeatures };
}

async function loadCrimeData(timeRange = '6months') {
  const timerName = `loadCrimeData_${timeRange}`;
  console.time(timerName);
  
  try {
    
    const validRange = APP_CONSTANTS.TIME_RANGES.includes(timeRange) ? timeRange : '6months';
    const cacheKey = validRange;
    
    
    const now = Date.now();
    if (window.appState.crimeData[cacheKey] && 
        (now - window.appState.crimeData[cacheKey].timestamp) < APP_CONSTANTS.CRIME_DATA_CACHE_DURATION) {
      console.log(`Using cached ${validRange} crime data`);
      console.timeEnd(timerName);
      return window.appState.crimeData[cacheKey].data;
    }
    
    
    const fileUrls = APP_CONSTANTS.CRIME_DATA_URLS[validRange];
    const responses = await Promise.all(
      fileUrls.map(url => fetchCsvFile(url))
    );
    
   
    const csvTexts = responses.filter(text => text !== null);
    if (csvTexts.length === 0) throw new Error('All CSV files failed to load');
    
    const mergedCrimeData = mergeAndParseCsvData(csvTexts);
    
    window.appState.crimeData[cacheKey] = {
      data: mergedCrimeData,
      timestamp: now
    };
    window.crimeData = mergedCrimeData;
    
    console.log(`Loading ${validRange} crime data complete, ${mergedCrimeData.features.length} records in total`);
    console.timeEnd(timerName);
    return mergedCrimeData;
  } catch (error) {
    console.error(`Failed to load ${timeRange} crime data:', error`);
    const emptyData = { type: 'FeatureCollection', features: [] };
    window.appState.crimeData[timeRange] = { data: emptyData, timestamp: Date.now() };
    window.crimeData = emptyData;
    console.timeEnd(timerName);
    return emptyData;
  }
}


async function fetchCsvFile(url) {
  try {
    const response = await fetch(url, { headers: { 'Content-Type': 'text/csv' } });
    if (!response.ok) {
      console.warn(`Failed to load CSV: ${url}, status: ${response.status}`);
      return null;
    }
    return response.text();
  } catch (error) {
    console.warn(`CSV loading exception: ${url}`, error);
    return null;
  }
}

function mergeAndParseCsvData(csvTexts) {
  let allFeatures = [];
  
  csvTexts.forEach((csvText, index) => {
    const parsedData = parseCSV(csvText);
    if (parsedData.features.length > 0) {
      allFeatures = [...allFeatures, ...parsedData.features];
      console.log(`Parsed CSV file ${index + 1}, obtained ${parsedData.features.length} records`);
    }
  });
  
  
  if (allFeatures.length < 10000) {
    allFeatures.sort((a, b) => {
      const dateA = a.properties.dispatch_date_time || '';
      const dateB = b.properties.dispatch_date_time || '';
      return dateA.localeCompare(dateB) || 
             JSON.stringify(a.geometry.coordinates).localeCompare(JSON.stringify(b.geometry.coordinates));
    });
  }
  
  return { type: 'FeatureCollection', features: allFeatures };
}

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return { type: 'FeatureCollection', features: [] };
  
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
  const requiredFields = ['lat', 'lng', 'dispatch_date_time', 'text_general_code', 'ucr_general'];
  const missingFields = requiredFields.filter(field => !headers.includes(field));
  
  if (missingFields.length > 0) {
    console.warn(`CSV missing required fields: ${missingFields.join(', ')}`);
    return { type: 'FeatureCollection', features: [] };
  }
  
  
  const fieldIndices = {
    lat: headers.findIndex(h => h === 'lat'),
    lng: headers.findIndex(h => h === 'lng'),
    dateTime: headers.findIndex(h => h === 'dispatch_date_time'),
    crimeType: headers.findIndex(h => h === 'text_general_code'),
    ucr: headers.findIndex(h => h === 'ucr_general')
  };
  
  const features = [];
  let skippedCount = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCsvLine(line);
      const lat = parseFloat(values[fieldIndices.lat]);
      const lng = parseFloat(values[fieldIndices.lng]);
      
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        skippedCount++;
        continue;
      }
      
    
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          dispatch_date_time: values[fieldIndices.dateTime] || '',
          text_general_code: values[fieldIndices.crimeType] || '',
          ucr_general: values[fieldIndices.ucr] || '',
          dc_dist: values[headers.findIndex(h => h === 'dc_dist')] || '',
          psa: values[headers.findIndex(h => h === 'psa')] || '',
          location_block: values[headers.findIndex(h => h === 'location_block')] || '',
          hour: values[headers.findIndex(h => h === 'hour')] || ''
        }
      });
    } catch (error) {
      skippedCount++;
    }
  }
  
  console.log(`CSV parsing complete: ${features.length} valid records, skipped ${skippedCount} records`);
  return { type: 'FeatureCollection', features };
}

function parseCsvLine(line) {
  const values = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  values.push(currentValue.trim());
  return values;
}

async function preloadAllData() {
  try {
    console.log('Starting to preload data for all time ranges...');
    const communities = window.appState.communities;
    
    for (const timeRange of APP_CONSTANTS.TIME_RANGES) {
      
      const crimeData = await loadCrimeData(timeRange);
      
      const trends = calculateSafetyTrends(communities, crimeData, timeRange);
     
      window.appState.safetyTrends[timeRange] = trends;
      console.log(`Preloading ${timeRange} data complete`);
    }
    
    console.log('All time range data preloading complete');
  } catch (error) {
    console.error('Failed to preload data:', error);
  }
}


function getSelectedCrimeTypes() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const selectedTypes = [];
    const checkboxes = document.querySelectorAll('input[name="crime-type"]:checked');
    
    checkboxes.forEach(checkbox => {
      selectedTypes.push(checkbox.value);
    });
    
    return selectedTypes;
  }
  
  return [];
}

async function initializeApp() {
  try {
    console.log('Starting to initialize application...');
    
    const communities = await loadCommunities();
    await preloadAllData();
    
    const defaultRange = APP_CONSTANTS.TIME_RANGES[0];
    const defaultTrends = window.appState.safetyTrends[defaultRange];
    const selectedCrimeTypes = getSelectedCrimeTypes();
    showCommunitiesOnMap(communities, safetyMap, defaultTrends, defaultRange, selectedCrimeTypes);
    setupSearchControls(communities, safetyMap);
    bindTimeRangeChangeEvent();
    exposeGlobalFunctions();
    
    window.appState.isInitialized = true;
    console.log('Application initialization complete!');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    window.appState.isInitialized = false;
  }
}

function bindTimeRangeChangeEvent() {
  const timeRangeSelect = document.getElementById('time-range');
  if (!timeRangeSelect) return;
  
  timeRangeSelect.value = window.appState.currentTimeRange;
  timeRangeSelect.addEventListener('change', (e) => {
    const newRange = e.target.value;
    if (!APP_CONSTANTS.TIME_RANGES.includes(newRange) || newRange === window.appState.currentTimeRange) {
      return;
    }
    
    console.log(`Time range switched to: ${newRange}`);
    window.appState.currentTimeRange = newRange;
  });
}


function exposeGlobalFunctions() {
  
  window.processSingleCommunity = function (community, timeRange = null, showPopup = false) {
    if (!community || !window.appState.communities) {
      console.error('Invalid community data');
      return;
    }
    
    const currentRange = timeRange || window.appState.currentTimeRange;
    const communityId = community.id || (community.properties.MAPNAME || community.properties.name);
    const communityName = community.properties.MAPNAME || community.properties.name || 'Unknown Community';
    const trends = window.appState.safetyTrends[currentRange] || {};
    const safetyTrend = trends[communityId] || { recentCount: 0, previousCount: 0, changePercent: 0 };
    
   
    safetyTrend.currentTimeRange = timeRange;
    community.safetyTrend = safetyTrend;
    
    console.log(`Processing community: ${communityName} (${timeRange})`);
    
    
    if (showPopup) {
      showCommunityInfo(community, safetyTrend, timeRange);
    }
    
    
    highlightAreaByName(communityName, safetyMap);
    return community;
  };
  
 
  window.clearCrimeDataCache = function () {
    window.appState.crimeData = {};
    console.log('Crime data cache cleared');
  };
  
  window.loadCrimeData = loadCrimeData;
  window.calculateSafetyTrends = calculateSafetyTrends;
  window.showCommunitiesOnMap = showCommunitiesOnMap;
}


function showCommunityInfo(community, safetyTrend, timeRange = '6months') {
  const communityName = community.properties.MAPNAME || community.properties.name || 'Unknown Community';
  const timeRangeData = safetyTrend.timeRanges?.[timeRange] || safetyTrend;
  const recentCount = timeRangeData.recentCount || 0;
  const previousCount = timeRangeData.previousCount || 0;
  const changePercent = timeRangeData.changePercent || 0;
  const crimeTypes = safetyTrend.crimeTypes || {};
  
  
  const selectedTypes = getSelectedCrimeTypes();
  
  console.log(`Displaying ${communityName} details: ${recentCount} recent incidents, ${previousCount} comparison period incidents, ${changePercent}% change`);
  
  
  updateCommunityStyleOnMap(community, changePercent);
  
  
  showCommunityPopup(community, communityName, changePercent, recentCount, previousCount, crimeTypes, selectedTypes);
}


function updateCommunityStyleOnMap(community, changePercent) {
  if (!community || !safetyMap) return;
  
  const communityId = community.id || (community.properties.MAPNAME || community.properties.name);
  
  
  safetyMap.eachLayer(layer => {
    if (layer instanceof L.GeoJSON) {
      layer.setStyle((feature) => {
        const isTargetCommunity = feature.id === communityId || 
                                 (feature.properties.MAPNAME === community.properties.MAPNAME);
        
        if (isTargetCommunity) {
          
          return {
            fillColor: changePercent > 0 ? '#ff0000' : '#008000',
            weight: 2,
            opacity: 1,
            color: 'black',
            fillOpacity: 0.7
          };
        } else {
          
          return {
            fillColor: '#409EFF',
            weight: 1,
            opacity: 0.6,
            fillOpacity: 0.3
          };
        }
      });
    }
  });
}


function showCommunityPopup(community, communityName, changePercent, recentCount = 0, previousCount = 0, crimeTypes = {}, selectedTypes = []) {
  if (!community.geometry) return;
  
 
  const center = calculateCommunityCenter(community.geometry);
  if (!center) return;
  
 
  let crimeTypesHtml = '';
  
  
  const crimeTypeDisplayNames = {
    'Violent Crime - Aggravated Assault': 'Violent Crime (Aggravated Assault)',
    'Violent Crime - Robbery': 'Violent Crime (Robbery)',
    'Violent Crime - Homicide': 'Violent Crime (Homicide)',
    'Violent Crime - Rape': 'Violent Crime (Rape)',
    'Property Crime - Burglary': 'Property Crime (Burglary)',
    'Property Crime - Theft': 'Property Crime (Theft)',
    'Property Crime - Motor Vehicle Theft': 'Property Crime (Motor Vehicle Theft)',
    'Public Order Crime - Other Assault': 'Public Order Crime (Other Assault)'
  };
  
  
  const otherSpecificTypes = ['Burglary Residential', 'Motor Vehicle Theft', 'Theft from Vehicle', 'Vandalism/Criminal Mischief'];
  
  
  if (Object.keys(crimeTypes).length > 0) {
    
    let typesToShow = {};
    
    if (selectedTypes.length > 0) {
      
      selectedTypes.forEach(type => {
       
        if (type === 'Violent Crime') {
         
          let violentCrimeCount = 0;
          
          for (const [crimeTypeKey, crimeTypeCount] of Object.entries(crimeTypes)) {
            
            const isNotOtherSpecificType = !otherSpecificTypes.some(otherType => 
              crimeTypeKey.includes(otherType)
            );
            
            if (isNotOtherSpecificType) {
              violentCrimeCount += crimeTypeCount;
            }
          }
          
          typesToShow[type] = violentCrimeCount;
        } else {
          
          let found = false;
          
          for (const [crimeTypeKey, crimeTypeCount] of Object.entries(crimeTypes)) {
            if (crimeTypeKey.includes(type) || type.includes(crimeTypeKey)) {
              typesToShow[crimeTypeKey] = crimeTypeCount;
              found = true;
            }
          }
          
          if (!found) {
            typesToShow[type] = 0;
          }
        }
      });
    } else {
     
      typesToShow = crimeTypes;
    }
    
    
    if (Object.keys(typesToShow).length > 0) {
      crimeTypesHtml = '<div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">';
      crimeTypesHtml += '<h4 style="margin: 0 0 10px 0; font-size: 14px; color: #555;">Crime Type Details:</h4>';
      crimeTypesHtml += '<ul style="margin: 0; padding: 0; list-style: none;">';
      
      
      Object.entries(typesToShow).forEach(([type, count]) => {
        
        const displayName = crimeTypeDisplayNames[type] || (type.split(' - ')[1] || type);
        crimeTypesHtml += `<li style="margin: 3px 0; font-size: 12px;">${displayName}: <strong>${count}</strong></li>`;
      });
      
      crimeTypesHtml += '</ul></div>';
    }
  }
  
 
  const popupContent = `
      <div style="font-family: Arial, sans-serif; font-size: 14px;">
        <h3 style="margin-top: 0; color: #333;">${communityName}</h3>
        <div style="margin-bottom: 10px;">
          <p style="margin: 5px 0;">
            Crime event change trend: <strong style="color: ${changePercent > 0 ? '#ff0000' : '#008000'};">
              ${changePercent > 0 ? '+' : ''}${changePercent || 0}%
            </strong>
          </p>
          ${crimeTypesHtml}
        </div>
      </div>
    `;
  
  
  safetyMap.closePopup();
  L.popup({ maxWidth: 400 }) 
    .setLatLng(center) 
    .setContent(popupContent)
    .openOn(safetyMap);
}


function calculateCommunityCenter(geometry) {
  if (!geometry) return null;
  
  let coordinates = [];
  switch (geometry.type) {
    case 'Polygon':
      coordinates = geometry.coordinates[0];
      break;
    case 'MultiPolygon':
      coordinates = geometry.coordinates[0][0];
      break;
    default:
      console.warn('Unsupported geometry type:', geometry.type);
      return null;
  }
  
  
  const validCoords = coordinates.filter(coord => 
    Array.isArray(coord) && coord.length >= 2 && !isNaN(coord[0]) && !isNaN(coord[1])
  );
  
  if (validCoords.length < 3) return null;
  
  const totalLng = validCoords.reduce((sum, coord) => sum + coord[0], 0);
  const totalLat = validCoords.reduce((sum, coord) => sum + coord[1], 0);
  const avgLng = totalLng / validCoords.length;
  const avgLat = totalLat / validCoords.length;
  
  return [avgLat, avgLng];
}

initializeApp();