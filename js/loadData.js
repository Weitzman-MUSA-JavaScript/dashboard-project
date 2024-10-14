
async function loadData() {
  try {
    const [rawworldData, rawLocationData, severityData, typeData, continentData, world, volCountry] = await Promise.all([
      d3.json('data/land-50m.json'),
      d3.json('data/volcano.geojson'),
      d3.csv('data/severity.csv'),
      d3.csv('data/ByType.csv'),
      d3.csv('data/ByContinent.csv'),
      d3.json('data/countries-110m.json'),
      d3.csv('data/majorEruption.csv'),
    ]);
    const worldData = topojson.feature(rawworldData, rawworldData.objects.land);
    const locationData = convertGeoJSONToJSON(rawLocationData);
    const land = topojson.feature(world, world.objects.land);
    const countries = topojson.feature(world, world.objects.countries).features;
    const borders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);


    return { worldData, locationData, severityData, typeData, continentData, land, countries, borders, volCountry };
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Function to convert GeoJSON into a simpler JSON format
function convertGeoJSONToJSON(geojson) {
  return geojson.features.map((feature) => {
    const coordinates = feature.geometry.coordinates;
    const properties = feature.properties;

    return {
      name: properties.NAME_,
      location: properties.LOCATION,
      latitude: coordinates[1],
      longitude: coordinates[0],
      elevation: properties.ELEV,
      type: properties.Type,
      status: properties.STATUS,
      continent: properties.CONTINENT,
      eruption: properties.Last_eruption,
      sealevel: properties.Sea_level,
    };
  });
}

export { loadData };
