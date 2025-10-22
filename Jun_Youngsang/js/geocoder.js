function setupGeocoder(map) {
  // Add the control to the map.
  const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    language: 'en-US',
    countries: 'us',
    mapboxgl: mapboxgl,
  });

  document.getElementById('geocoder').appendChild(geocoder.onAdd(map));
}

export { setupGeocoder };
