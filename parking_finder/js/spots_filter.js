let spotsLayer;
let timestampInput = null;

function initializeFilter(layer, map) {
  spotsLayer = layer;
  timestampInput = document.querySelector('#timestamp');
}

function filterTime(feature) {
  if (!timestampInput || !timestampInput.value) {
    console.log("No timestamp set");
    return true;
  }
  
  const timeToCheck = new Date(timestampInput.value);
  const checkTime = timeToCheck.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
  });
  const checkDay = timeToCheck.getDay();


  const { noparkdays, start_time, end_time } = feature.properties;
  

  let isDayRestricted = false;
  if (noparkdays && noparkdays.includes(checkDay)) {
    isDayRestricted = true;
    
    // If day is restricted and no time range specified, spot is unavailable
    if (!start_time || !end_time) {
        return false;  // Spot is NOT visible
    }
    
    // If day is restricted and time falls within range, spot is unavailable
    if (checkTime > start_time && checkTime < end_time) {
        return false;  // Spot is NOT visible
    }
}

return true; // Add this missing return statement
} // Add this missing closing brace

function filterSpotsByBuffer(buffer) {
  if (!spotsLayer) {
    return [];
  }

  let bufferPoints = [];
  spotsLayer.eachLayer((layer) => {
    const point = layer.feature.geometry;
    const isInBuffer = turf.booleanPointInPolygon(point, buffer);
    const isTimeAllowed = filterTime(layer.feature);

    // Still handle the layer styling for the map
    if (isInBuffer && isTimeAllowed) {
      layer.setStyle({ opacity: 1, fillOpacity: 0.8 });
      bufferPoints.push(layer.feature.properties);  // Store for charts
    } else {
      layer.setStyle({ opacity: 0, fillOpacity: 0 });
    }
  });
  
  return {
    points: bufferPoints,  // For charts/analysis
    count: bufferPoints.length  // For any code expecting the count
  };
}

export { initializeFilter, filterSpotsByBuffer };