const MAP_CONSTANTS = {
  DEFAULT_CENTER: [39.9526, -75.1652],
  DEFAULT_ZOOM: 11,
  MAX_ZOOM: 19,
  TILE_LOAD_TIMEOUT: 5000,
  VALID_TIME_RANGES: ['6months', '1year', '2years'],
  STYLES: {
    default: { fillColor: '#409EFF', color: '#409EFF', weight: 1, opacity: 1, fillOpacity: 0.6 },
    highlighted: { weight: 3, opacity: 1, fillOpacity: 0.8 },
    increased: { fillColor: '#FF0000', color: '#FF0000' },
    decreased: { fillColor: '#008000', color: '#008000' }
  },
  TILE_LAYERS: [
    {
      url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  ]
};

function initializeSafetyMap() {
  const safetyMap = L.map('safety-map', {
    zoomControl: true,
    attributionControl: true
  }).setView(MAP_CONSTANTS.DEFAULT_CENTER, MAP_CONSTANTS.DEFAULT_ZOOM);

  loadMapTiles(safetyMap);
 
  initMapState(safetyMap);

  createMapLegend(safetyMap);

  setupMapEventHandlers(safetyMap);

  bindGlobalPopupClose(safetyMap);

  window.mapApi = {
    highlightAreaByIndex: (index) => highlightAreaByIndex(index, safetyMap),
    highlightAreaByName: (name) => highlightAreaByName(name, safetyMap),
    updateMapWithTimeRange: (range, trends) => updateMapWithTimeRange(safetyMap, range, trends),
    getCurrentMap: () => safetyMap
  };

  return safetyMap;
}


function initMapState(map) {
  map.communityLayer = L.layerGroup().addTo(map);
  map.communityLayersArray = [];
  map.currentHighlightedIndex = -1;
  map.safetyTrends = null;
  map.currentTimeRange = MAP_CONSTANTS.VALID_TIME_RANGES[0];
}


function setupMapEventHandlers(map) {
  if (!map) return;

  map.updateCommunityStyles = function (trends) {
    if (!this.communityLayer) return;

    this.communityLayer.eachLayer(layer => {
      const community = layer.feature;
      const communityId = community.id || community.properties?.name || community.properties?.MAPNAME;
      const safetyTrend = trends?.[communityId] || this.safetyTrends?.[communityId];

      if (safetyTrend) {
        const baseStyle = { ...MAP_CONSTANTS.STYLES.default };
        const trendStyle = safetyTrend.changePercent > 0 
          ? MAP_CONSTANTS.STYLES.increased 
          : MAP_CONSTANTS.STYLES.decreased;
        
        layer.setStyle({ ...baseStyle, ...trendStyle });
      }
    });
  };
}


function loadMapTiles(map) {
  let currentLayerIndex = 0;

  function tryLoadNextLayer() {
    if (currentLayerIndex >= MAP_CONSTANTS.TILE_LAYERS.length) {
      const mapContainer = document.getElementById('safety-map');
      mapContainer.style.background = '#f0f0f0';
      mapContainer.style.backgroundImage = 'repeating-linear-gradient(45deg, #e0e0e0, #e0e0e0 10px, #f0f0f0 10px, #f0f0f0 20px)';
      return;
    }

    const tileLayerConfig = MAP_CONSTANTS.TILE_LAYERS[currentLayerIndex];
    if (!tileLayerConfig.url) {
      currentLayerIndex++;
      tryLoadNextLayer();
      return;
    }

    const tileLayer = L.tileLayer(tileLayerConfig.url, {
      attribution: tileLayerConfig.attribution,
      maxZoom: MAP_CONSTANTS.MAX_ZOOM,
      timeout: MAP_CONSTANTS.TILE_LOAD_TIMEOUT
    });

    tileLayer.on('error', () => {
      map.removeLayer(tileLayer);
      currentLayerIndex++;
      tryLoadNextLayer();
    });

    tileLayer.addTo(map);
  }

  tryLoadNextLayer();
}

function createMapLegend(map) {
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'info legend');
    const legendItems = [
      { className: 'default', label: 'Unselected Community' },
      { className: 'red', label: 'Crime Events Increased' },
      { className: 'green', label: 'Crime Events Decreased' }
    ];

    const labels = ['<h4> Legend</h4>'];
    legendItems.forEach(item => {
      labels.push(`
        <div class="legend-item">
          <span class="color-box ${item.className}"></span>
          <span>${item.label}</span>
        </div>
      `);
    });

    div.innerHTML = labels.join('');
    return div;
  };

  legend.addTo(map);
}

function bindGlobalPopupClose(map) {
  document.addEventListener('click', (event) => {
    const mapContainer = map.getContainer();
    const isClickInside = mapContainer.contains(event.target) ||
                          (map._popup && map._popup._container && map._popup._container.contains(event.target));

    if (!isClickInside && map._popup) {
      map.closePopup();
    }
  });
}

function handleCommunityClick(e, timeRange = '6months') {
  const layer = e.target;
  const map = layer._map;

  const communityItem = map.communityLayersArray.find(item => 
    item.layer && item.layer === layer
  );

  if (!communityItem || !communityItem.community) {
    console.warn('invalid community layer, ignore click event');
    return;
  }

  const { index: communityIndex, community, realName: communityName } = communityItem;
  const safetyTrend = community.safetyTrend || { changePercent: 0 };

  const baseStyle = { ...MAP_CONSTANTS.STYLES.default };
  const trendStyle = safetyTrend.changePercent > 0 
    ? MAP_CONSTANTS.STYLES.increased 
    : MAP_CONSTANTS.STYLES.decreased;
  const highlightStyle = { ...baseStyle, ...trendStyle, ...MAP_CONSTANTS.STYLES.highlighted };

  layer.setStyle(highlightStyle);
  layer.bringToFront();

  adjustMapViewToCommunity(layer, map);
  triggerCommunityClickHandler(community, communityIndex, timeRange);
  highlightAreaByIndex(communityIndex, map);
}

function adjustMapViewToCommunity(layer, map) {
  if (!layer.getBounds) return;

  try {
    const bounds = layer.getBounds();
    const center = bounds.getCenter();
    const targetZoom = 12;
    const currentZoom = map.getZoom();

    if (Math.abs(currentZoom - targetZoom) >= 2) {
      map.setView(center, targetZoom, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.35
      });
    } else if (!map.getBounds().contains(center)) {
      map.panTo(center, {
        animate: true,
        duration: 0.5,
        easeLinearity: 0.35
      });
    }
  } catch (error) {
    console.warn('adjustMapViewToCommunity failed:', error);
  }
}

function triggerCommunityClickHandler(community, communityIndex, timeRange) {
  console.log(`click community: ${community.realName || 'unknown'}，index: ${communityIndex}，timerange: ${timeRange}`);

  if (typeof window.processSingleCommunity === 'function') {
    try {
      window.processSingleCommunity(community, timeRange, true);
    } catch (error) {
      console.error('processSingleCommunity failed:', error);
    }
  }
}

function showCommunitiesOnMap(communities, map, safetyTrends, timeRange = '6months', selectedCrimeTypes = null) {
  if (!map || !communities?.features || !Array.isArray(communities.features)) {
    console.error('showCommunitiesOnMap failed: invalid parameters');
    return;
  }

  map.safetyTrends = safetyTrends;
  map.currentTimeRange = MAP_CONSTANTS.VALID_TIME_RANGES.includes(timeRange) 
    ? timeRange 
    : MAP_CONSTANTS.VALID_TIME_RANGES[0];
  
  map.communityLayer.clearLayers();
  map.communityLayersArray = [];

  console.log(`timerange: ${map.currentTimeRange}，total ${communities.features.length} communities`);

  const validCommunities = communities.features.filter((community, index) => {
    if (!community.geometry) {
      console.warn(`skip invalid community (index: ${index}): missing geometry`);
      return false;
    }

    try {
      community.properties = community.properties || {};
      const realName = community.properties.MAPNAME || community.properties.name || community.properties.NAME || `community ${index + 1}`;
      community.realName = realName;
      community.currentTimeRange = map.currentTimeRange;

      const communityId = community.id || realName;
      if (safetyTrends?.[communityId]) {
        community.safetyTrend = safetyTrends[communityId];
      }

      const layer = L.geoJSON(community, {
        style: () => MAP_CONSTANTS.STYLES.default
      }).addTo(map.communityLayer);

      layer.on('click', (e) => handleCommunityClick(e, map.currentTimeRange));

      map.communityLayersArray.push({
        index: index,
        layer: layer,
        community: community,
        realName: realName
      });

      return true;
    } catch (error) {
      console.warn(`process community (index: ${index}) failed:`, error);
      return false;
    }
  });

  console.log(`successfully load ${validCommunities.length} valid communities`);

  if (validCommunities.length > 0 && map.currentHighlightedIndex === -1) {
    adjustInitialMapView(map);
  }
}

function adjustInitialMapView(map) {
  try {
    const allBounds = [];
    map.communityLayer.eachLayer(layer => {
      if (layer.getBounds) {
        allBounds.push(layer.getBounds());
      }
    });

    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, bounds) => acc.extend(bounds), L.latLngBounds());
      if (combinedBounds.isValid()) {
        map.fitBounds(combinedBounds, {
          maxZoom: 13,
          duration: 1000,
          padding: [30, 30]
        });
      } else {
        map.setView(MAP_CONSTANTS.DEFAULT_CENTER, MAP_CONSTANTS.DEFAULT_ZOOM);
      }
    } else {
      map.setView(MAP_CONSTANTS.DEFAULT_CENTER, MAP_CONSTANTS.DEFAULT_ZOOM);
    }
  } catch (error) {
    console.error('adjustInitialMapView failed:', error);
    map.setView(MAP_CONSTANTS.DEFAULT_CENTER, MAP_CONSTANTS.DEFAULT_ZOOM);
  }
}

function resetAllHighlighting(map) {
  if (!map || !map.communityLayersArray?.length) return;

  map.communityLayersArray.forEach(item => {
    if (item.layer && typeof item.layer.setStyle === 'function') {
      item.layer.setStyle(MAP_CONSTANTS.STYLES.default);
    }
  });
  map.currentHighlightedIndex = -1;
}

function highlightAreaByName(searchTerm, map) {
  if (!map || !map.communityLayersArray?.length || !searchTerm?.trim()) {
    console.log('highlight community failed: invalid parameters');
    return false;
  }

  const normalizedTerm = searchTerm.trim().toLowerCase();
  const matchedItem = map.communityLayersArray.find(item => {
    const community = item.community;
    if (!community) return false;

    const name = (community.properties?.name || '').toLowerCase();
    const mapName = (community.properties?.MAPNAME || '').toLowerCase();
    const id = (community.id || '').toLowerCase();

    return name.includes(normalizedTerm) ||
           mapName.includes(normalizedTerm) ||
           id.includes(normalizedTerm) ||
           name === normalizedTerm ||
           mapName === normalizedTerm;
  });

  if (matchedItem) {
    resetAllHighlighting(map);
    highlightAreaByIndex(matchedItem.index, map);
    console.log(`highlight community: ${matchedItem.realName}`);
    return true;
  }

  console.log(`no matching community found: "${searchTerm}"`);
  return false;
}

function highlightAreaByIndex(targetIndex, map) {
  if (!map || !map.communityLayersArray?.length || targetIndex < 0) {
    console.log('highlight community failed: invalid index');
    return;
  }

  resetAllHighlighting(map);
  const targetItem = map.communityLayersArray.find(item => item.index === targetIndex);

  if (targetItem) {
    const safetyTrend = targetItem.community.safetyTrend || { changePercent: 0 };
    const highlightStyle = {
      ...MAP_CONSTANTS.STYLES.default,
      ...(safetyTrend.changePercent > 0 ? MAP_CONSTANTS.STYLES.increased : MAP_CONSTANTS.STYLES.decreased),
      ...MAP_CONSTANTS.STYLES.highlighted
    };

    targetItem.layer.setStyle(highlightStyle);
    targetItem.layer.bringToFront();
    map.currentHighlightedIndex = targetIndex;
  }
}

function updateMapWithTimeRange(map, timeRange, safetyTrends) {
  if (!map || !map.communityLayersArray?.length || !safetyTrends) {
    console.error('updateMapWithTimeRange failed: invalid parameters');
    return;
  }

  map.safetyTrends = safetyTrends;
  map.currentTimeRange = timeRange;

  updateLayersInBatches(map.communityLayersArray, safetyTrends, map);
}

function updateLayersInBatches(layersArray, safetyTrends, map, batchSize = 20) {
  let currentIndex = 0;

  function updateNextBatch() {
    const endIndex = Math.min(currentIndex + batchSize, layersArray.length);

    for (let i = currentIndex; i < endIndex; i++) {
      const item = layersArray[i];
      if (!item.community || !item.layer) continue;

      try {
        const communityId = item.community.id || item.realName;
        item.community.safetyTrend = safetyTrends[communityId] || item.community.safetyTrend;
        item.layer.setStyle(MAP_CONSTANTS.STYLES.default);
      } catch (err) {
        console.error(`update layer failed (index: ${i}):`, err);
      }
    }

    currentIndex = endIndex;
    if (currentIndex < layersArray.length) {
      requestAnimationFrame(updateNextBatch);
    } else {
      setTimeout(() => {
        if (map.currentHighlightedIndex !== -1) {
          highlightAreaByIndex(map.currentHighlightedIndex, map);
        }
      }, 0);
    }
  }

  requestAnimationFrame(updateNextBatch);
}

export {
  initializeSafetyMap,
  showCommunitiesOnMap,
  highlightAreaByIndex,
  highlightAreaByName,
  updateMapWithTimeRange
};