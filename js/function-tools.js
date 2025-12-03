// cache object
const calculationCache = {
  spatialIndex: null,
  crimeDataByTimeRange: {},
  communityBounds: new Map(),
  results: new Map()
};

function createSpatialIndex(crimeData, gridSize = 0.01) {
  const index = {};
  
  if (!crimeData || !crimeData.features) return index;
  
  crimeData.features.forEach(crime => {
    try {
      const coords = crime.geometry?.coordinates;
      if (!coords || coords.length < 2) return;
      
      const [lon, lat] = coords;
      if (isNaN(lon) || isNaN(lat)) return;
      
      const gridX = Math.floor(lon / gridSize);
      const gridY = Math.floor(lat / gridSize);
      const key = `${gridX}_${gridY}`;
      
      if (!index[key]) {
        index[key] = [];
      }
      index[key].push(crime);
    } catch (e) {
    }
  });
  
  return index;
}

// calculate community bounds
function calculateCommunityBounds(community) {
  const coords = getPolygonCoordinates(community.geometry);
  if (coords.length < 3) return null;
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  
  coords.forEach(([lat, lon]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  });
  
  return { minLat, maxLat, minLon, maxLon };
}

// check point in bounds
function isPointInBounds(lat, lon, bounds) {
  return lat >= bounds.minLat && lat <= bounds.maxLat && 
         lon >= bounds.minLon && lon <= bounds.maxLon;
}

// get crimes in community bounds
function getCrimesInCommunityBounds(community, spatialIndex, gridSize = 0.01) {
  const communityId = community.id || community.properties.name;
  
  let bounds = calculationCache.communityBounds.get(communityId);
  if (!bounds) {
    bounds = calculateCommunityBounds(community);
    if (!bounds) return [];
    calculationCache.communityBounds.set(communityId, bounds);
  }
  
  const crimes = [];
  const startX = Math.floor(bounds.minLon / gridSize);
  const endX = Math.floor(bounds.maxLon / gridSize);
  const startY = Math.floor(bounds.minLat / gridSize);
  const endY = Math.floor(bounds.maxLat / gridSize);
  
  // check all grid cells that the bounds cover
  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      const key = `${x}_${y}`;
      if (spatialIndex[key]) {
        spatialIndex[key].forEach(crime => {
          const [lon, lat] = crime.geometry.coordinates;
          if (isPointInBounds(lat, lon, bounds)) {
            crimes.push(crime);
          }
        });
      }
    }
  }
  
  return crimes;
}

function calculateSafetyTrends(communities, crimeData, timeRange = '1year', selectedCrimeTypes = null) {
  console.time('calculateSafetyTrends');
  const trends = {};
  
  // calculate safety trends for each community
  try {
    // validate community data
    if (!communities || !communities.features || !Array.isArray(communities.features)) {
      console.error('Invalid community data format');
      console.timeEnd('calculateSafetyTrends');
      return trends;
    }
    
    // validate crime data    
    if (!crimeData || !crimeData.features || crimeData.features.length === 0) {
      console.error('No crime data available');
      console.timeEnd('calculateSafetyTrends');
      return trends;
    }
    
    const now = new Date('2025-06-01');
    let recentPeriodCrimes = [];
    let previousPeriodCrimes = [];
    let dateParseErrors = 0;
    let missingDateCount = 0;
    

    const getPeriodType = (crimeDate) => {
      // last 6 months: compare recent 6 months and previous 6 months
      if (timeRange === '6months') {
        // dynamically calculate date range based on current time
        const dynamicNow = new Date();
        const sixMonthsAgo = new Date(dynamicNow);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const twelveMonthsAgo = new Date(dynamicNow);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        if (crimeDate >= sixMonthsAgo && crimeDate <= dynamicNow) {
          return 'recent'; // recent 6 months
        } else if (crimeDate >= twelveMonthsAgo && crimeDate < sixMonthsAgo) {
          return 'previous'; // previous 6 months
        }
      }
      // last year: compare this year and last year
      else if (timeRange === '1year') {
        if (crimeDate.getFullYear() === 2025) {
          return 'recent'; // this year
        } else if (crimeDate.getFullYear() === 2024) {
          return 'previous'; // kast year
        }
      }
      // last 2 years: compare recent 2 years and previous 2 years
      else if (timeRange === '2years') {
        const currentYear = now.getFullYear();
        if (crimeDate.getFullYear() === currentYear || crimeDate.getFullYear() === currentYear - 1) {
          return 'recent'; // recent 2 years
        } else if (crimeDate.getFullYear() === currentYear - 2 || crimeDate.getFullYear() === currentYear - 3) {
          return 'previous'; // previous 2 years
        }
      }
      return 'other'; // outside comparison range
    };
    
    // check if the crime type matches the selected types
    const isCrimeTypeSelected = (crime) => {
      // if no crime types are specified or none are selected, return true
      if (!selectedCrimeTypes || selectedCrimeTypes.length === 0) {
        return true;
      }
      
      // get crime type description
      const crimeDescription = crime.properties.text_general_code || '';
      
      // define other 4 specific types
      const otherSpecificTypes = ['Burglary Residential', 'Motor Vehicle Theft', 'Theft from Vehicle', 'Vandalism/Criminal Mischief'];
      
      // check if matches selected crime types
      for (const type of selectedCrimeTypes) {
        // violent crime includes all types except the other 4 specific types
        if (type === 'Violent Crime') {
          // check if not included in the other 4 specific types
          const isNotOtherSpecificType = !otherSpecificTypes.some(otherType => 
            crimeDescription.includes(otherType)
          );
          if (isNotOtherSpecificType) {
            return true;
          }
        } 
        // other types direct match
        else if (crimeDescription.includes(type)) {
          return true;
        }
      }
      
      return false;
    };
    
    // filter crimes by period type and crime type
    crimeData.features.forEach((crime, index) => {
      try {
        // first check if crime type is selected
        if (!isCrimeTypeSelected(crime)) {
        return; // skip unselected crime types
      }
        
        // explicitly use dispatch_date_time field
        const dateStr = crime.properties.dispatch_date_time;
        
        // only process crime data with explicit dates
        if (dateStr) {
          // try to parse date
          const crimeDate = new Date(dateStr);
          if (!isNaN(crimeDate.getTime())) {
            const periodType = getPeriodType(crimeDate);
            if (periodType === 'recent') {
              recentPeriodCrimes.push(crime);
            } else if (periodType === 'previous') {
              previousPeriodCrimes.push(crime);
            }
          } else {
            dateParseErrors++;
            if (dateParseErrors <= 5) {
              console.warn(`Date parsing error (${dateParseErrors}):`, dateStr);
            }
          }
        } else {
          missingDateCount++;
        }
      } catch (e) {
        console.log('Data error:', e);
      }
    });
    
    // use spatial index to speed up queries
    const recentPeriodCrimesData = { features: recentPeriodCrimes };
    const previousPeriodCrimesData = { features: previousPeriodCrimes };
    
    // create spatial index
    const recentSpatialIndex = createSpatialIndex(recentPeriodCrimesData);
    const previousSpatialIndex = createSpatialIndex(previousPeriodCrimesData);
    
    // calculate crime statistics for each community
    communities.features.forEach(community => {
      const communityName = community.properties?.MAPNAME || community.properties?.name || 'Unknown Community';
      const communityId = community.id || communityName;
      
      // extract community polygon coordinates
      const communityCoords = getPolygonCoordinates(community.geometry);
      
      if (communityCoords.length < 3) {
        trends[communityId] = {
          communityId,
          communityName,
          recentCount: 0,
          previousCount: 0,
          changePercent: 0,
          crimeTypes: {},
          timeRanges: {
            '6months': {
              recent: 0,
              previous: 0,
              changePercent: 0
            }
          }
        };
        return;
      }
      
      // use spatial index to speed up queries for crimes potentially in community
      let candidateRecentCrimes = getCrimesInCommunityBounds(community, recentSpatialIndex);
      let candidatePreviousCrimes = getCrimesInCommunityBounds(community, previousSpatialIndex);
      
      // use candidate crimes from spatial index for final point-in-polygon determination
      const communityRecentCrimes = candidateRecentCrimes.filter(crime => {
        try {
          const crimeCoords = crime.geometry && crime.geometry.coordinates;
          if (!crimeCoords || crimeCoords.length < 2) return false;
          
          const [lon, lat] = crimeCoords;
          return pointInPolygon(lat, lon, communityCoords);
        } catch (e) {
          return false;
        }
      });
      
      // count crimes in community from last year (2024)
      const communityPreviousCrimes = candidatePreviousCrimes.filter(crime => {
        try {
          const crimeCoords = crime.geometry && crime.geometry.coordinates;
          if (!crimeCoords || crimeCoords.length < 2) return false;
          
          const [lon, lat] = crimeCoords;
          return pointInPolygon(lat, lon, communityCoords);
        } catch (e) {
          return false;
        }
      });
      
      const recentCount = communityRecentCrimes.length;
      const previousCount = communityPreviousCrimes.length;
      
      // calculate percentage change
      let changePercent = 0;
      if (previousCount > 0) {
        changePercent = ((recentCount - previousCount) / previousCount) * 100;
      }
      
      // use text_general_code from CSV as crime type
      const crimeTypes = {};
      communityRecentCrimes.forEach(crime => {
        if (crime.properties?.text_general_code) {
          const type = crime.properties.text_general_code;
          crimeTypes[type] = (crimeTypes[type] || 0) + 1;
        }
      });
      
      // sort by crime type name to ensure deterministic output
      const sortedCrimeTypes = {};
      Object.keys(crimeTypes).sort().forEach(type => {
        sortedCrimeTypes[type] = crimeTypes[type];
      });
      
      // store results by different time ranges
      const timeRangeResult = {
        recent: recentCount,
        previous: previousCount,
        changePercent: Math.min(100, Math.round(changePercent))
      };
      
      // get existing time range results if they exist
      const existingTimeRanges = trends[communityId]?.timeRanges || {};
      
      trends[communityId] = {
        communityId,
        communityName,
        recentCount,
        previousCount,
        changePercent: Math.min(100, Math.round(changePercent)),
        crimeTypes: sortedCrimeTypes,
        timeRanges: {
          ...existingTimeRanges,
          [timeRange]: timeRangeResult
        }
      };
      

    });
    
    calculationCache.results = new Map(Object.entries(trends));
    
    console.timeEnd('calculateSafetyTrends');
    return trends;
  } catch (error) {
    console.error('Error calculating safety trends:', error);
    // return empty results on error, don't use default data
    console.timeEnd('calculateSafetyTrends');
    return trends;
  }
}

// extract polygon coordinates from GeoJSON geometry object
function getPolygonCoordinates(geometry) {
  const coordinates = [];
  
  if (!geometry) return coordinates;
  
  // handle different types of geometry objects
  switch (geometry.type) {
    case 'Polygon':
      // handle single polygon
      if (Array.isArray(geometry.coordinates)) {
        // only take outer boundary
        const outerRing = geometry.coordinates[0];
        if (Array.isArray(outerRing)) {
          outerRing.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2) {
              coordinates.push([coord[1], coord[0]]); // convert to [lat, lon]
            }
          });
        }
      }
      break;
    
    case 'MultiPolygon':
      // handle multiple polygons
      if (Array.isArray(geometry.coordinates)) {
        geometry.coordinates.forEach(polygon => {
          if (Array.isArray(polygon) && polygon.length > 0) {
            // also only take outer boundary of each polygon
            const outerRing = polygon[0];
            if (Array.isArray(outerRing)) {
              outerRing.forEach(coord => {
                if (Array.isArray(coord) && coord.length >= 2) {
                  coordinates.push([coord[1], coord[0]]); // convert to [lat, lon]
                }
              });
            }
          }
        });
      }
      break;
    
    case 'GeometryCollection':
      // handle geometry collection
      if (Array.isArray(geometry.geometries)) {
        geometry.geometries.forEach(subGeometry => {
          // recursively process each sub geometry object
          const subCoords = getPolygonCoordinates(subGeometry);
          coordinates.push(...subCoords);
        });
      }
      break;
    
    default:
      console.warn(`Unsupported geometry type: ${geometry.type}`);
  }
  
  // ensure coordinate array is not empty and forms a valid polygon
  if (coordinates.length < 3) {
    console.warn('Extracted coordinates insufficient to form a polygon');
  }
  
  return coordinates;
}

// point-in-polygon algorithm
function pointInPolygon(lat, lon, polygon) {
  if (!polygon || polygon.length < 3) return false;
  
  let inside = false;
  
  // iterate through each edge of the polygon
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0]; // lon, lat
    const xj = polygon[j][1], yj = polygon[j][0]; // lon, lat
    
    // check if point is on edge
    if (isPointOnLineSegment(lat, lon, yi, xi, yj, xj)) {
      return true;
    }
    
    // core ray casting algorithm logic
    const intersect = ((yi > lat) != (yj > lat)) && 
                     (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// check if point is on line segment
function isPointOnLineSegment(px, py, x1, y1, x2, y2) {
  
  if (px < Math.min(x1, x2) - 0.00001 || px > Math.max(x1, x2) + 0.00001 ||
      py < Math.min(y1, y2) - 0.00001 || py > Math.max(y1, y2) + 0.00001) {
    return false;
  }
 
  const crossProduct = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
  return Math.abs(crossProduct) < 0.00001;
}

// get safety trends for specified time range
function getSafetyTrendsForTimeRange(trends, timeRange) {
  const result = {};
  
  Object.keys(trends).forEach(communityId => {
    const trend = trends[communityId];
    const timeRangeData = trend.timeRanges[timeRange];
    
    if (timeRangeData) {
      let changePercent = 0;
      if (timeRangeData.previous > 0) {
        changePercent = ((timeRangeData.recent - timeRangeData.previous) / timeRangeData.previous) * 100;
      }
      
      result[communityId] = {
        ...trend,
        changePercent,
        recentCount: timeRangeData.recent,
        previousCount: timeRangeData.previous
      };
    } else {
      result[communityId] = trend;
    }
  });
  
  return result;
}

export {
  calculateSafetyTrends,
  getSafetyTrendsForTimeRange
}; 

function pluck(arr, key) {
  return arr.map((elem) => elem[key]);
}

function uniq(arr) {
  return [...new Set(arr)];
}

function debounce(f, timeout) {
  let timer = null;

  function wrapped(...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      
      f.apply(this, args);
      timer = null;
    }, timeout);
  }

  return wrapped;
}

window.ft = {
  pluck,
  uniq,
  debounce,
};

export { pluck, uniq, debounce };
