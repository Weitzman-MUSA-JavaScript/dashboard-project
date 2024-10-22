
async function importmapSelector(url) {
  
mapboxgl.accessToken = 'pk.eyJ1IjoieGxsZWUiLCJhIjoiY20weTQ3M2VvMGt0MzJsb21lZXc1YTdpMCJ9.F1PUTPRCUtzGAEE3X8JNTg';

const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: "mapbox://styles/xllee/cm1wx9fej00og01pgfmx363w6", // style URL
    center: [14.476, 50.10], // starting position [lng, lat]
    zoom: 10, // starting zoom
    maxZoom: 15,
    minZoom: 10,
    maxPitch: 60
});


fetch (url)
.then(response => response.json())
.then(geojson=> {
  // GeoJSON content loaded and parsed
 
  console.log("GeoJSONdata:", geojson);
  
  
  // Now you can process the GeoJSON further if needed
// Function to populate the dropdown with unique categories
function populatesentiment() {
  const dropdown = document.getElementById("sentiment-selector");//indicate that we want to target the elements within the id question-selector

  // Create a Set to store unique categories
  const categories = new Set();
  let allOption = document.createElement("option");
  allOption.text = "All";  // Display text
  allOption.value = "All";  // Value for filtering logic
  dropdown.appendChild(allOption);
  // Loop through the features in the GeoJSON feature collection
  geojson.features.forEach(feature => {
      // Access the category in the target field of each feature
      const category = feature.properties.sentiment;
      categories.add(category); // Add the category to the Set
  });

  // Add each unique category to the dropdown as an option
  categories.forEach(category => {
      let option = document.createElement("option");
      option.text = category;
      option.value = category;
      dropdown.appendChild(option);
  });
}
populatesentiment();
  // Function to populate the dropdown with unique categories

  let filteredGeojson
  let filteredGeojson2
  document.getElementById("sentiment-selector").addEventListener("change", function() {
    const selectedfeeling = this.value;
    console.log('filtering geojson', geojson)
   
     
    // Filter features by selected category
    if(selectedfeeling=='All') {
      filteredGeojson = {
      type: "FeatureCollection",
      features: geojson.features}} else {
        filteredGeojson = {
        type: "FeatureCollection",
        features: geojson.features.filter(feature => feature.properties["sentiment"] ==selectedfeeling)}};
 
    // Update the map layer's data source with filtered data
 
  if (map.getSource('locations')) {
    map.getSource('locations').setData(filteredGeojson);
    console.log('Map data updated!',filteredGeojson)
  } else {
    console.error('Source "locations" not found!');
  }
    
  const dropdown = document.getElementById("question-selector");//indicate that we want to target the elements within the id question-selector
  dropdown.innerHTML = '';
  // Create a Set to store unique categories
  const categories = new Set();
  
  let allOption = document.createElement("option");
  allOption.text = "All";  // Display text
  allOption.value = "All";  // Value for filtering logic
  dropdown.appendChild(allOption);
  // Loop through the features in the GeoJSON feature collection
  filteredGeojson.features.forEach(feature => {
      // Access the category in the target field of each feature
      const category = feature.properties.question;
      categories.add(category); // Add the category to the Set
  });

  // Add each unique category to the dropdown as an option
  categories.forEach(category => {
      let option = document.createElement("option");
      option.text = category;
      option.value = category;
      dropdown.appendChild(option);
  });
  
    // Event listener for dropdown changes
    document.getElementById("question-selector").addEventListener("change", function() {
      const selectedCategory = this.value;
      console.log('filtering geojson', filteredGeojson)
      // Filter features by selected category
    
      // Filter features by selected category
      if(selectedCategory=='All') {
        filteredGeojson2 = filteredGeojson} else {
          filteredGeojson2 = {
          type: "FeatureCollection",
          features: geojson.features.filter(feature => feature.properties["question"] ==selectedCategory)}};
      
      console.log(filteredGeojson2);
    
      // Update the map layer's data source with filtered data
      // Check if the source exists before updating the data
      if (map.getSource('locations')) {
        map.getSource('locations').setData(filteredGeojson2);
        console.log('Map data updated!',filteredGeojson2)
      } else {
        console.error('Source "locations" not found!');
      }
        });
}); 
  map.on('load', () => {
    /* Add the data to your map as a layer */
    map.addLayer({
      id: 'locations',
      type: 'circle',
      /* Add a GeoJSON source containing place coordinates and information. */
      source: {
        type: 'geojson',
        data: geojson
      },
      paint: {
        'circle-radius': 1,
        'circle-color': 'black'
      }
      
    });
    console.log('Map layer "locations" added successfully.');
    // Create a popup, but don't add it to the map yet.
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
  });

  map.on('mouseenter', 'locations', (e) => {
      // Change the cursor style as a UI indicator.
      map.getCanvas().style.cursor = 'pointer';

      // Copy coordinates array.
      const coordinates = e.features[0].geometry.coordinates.slice();
      const description = e.features[0].properties.comment_EN;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      if (['mercator', 'equirectangular'].includes(map.getProjection().name)) {
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }
      }

      // Populate the popup and set its coordinates
      // based on the feature found.
      popup.setLngLat(coordinates).setHTML(description).addTo(map);
  });

  map.on('mouseleave', 'places', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
  });

    


  

  });

})

.catch(error => console.error('Error loading GeoJSON:', error));
}

export {importmapSelector};