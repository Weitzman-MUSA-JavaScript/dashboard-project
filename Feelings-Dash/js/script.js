mapboxgl.accessToken = 'pk.eyJ1IjoieGxsZWUiLCJhIjoiY20weTQ3M2VvMGt0MzJsb21lZXc1YTdpMCJ9.F1PUTPRCUtzGAEE3X8JNTg';

const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: "mapbox://styles/xllee/cm0y8m3k400kg01nt0sme38kw", // style URL
    center: [14.476, 50.10], // starting position [lng, lat]
    zoom: 9 // starting zoom
});


map.on('load', () => {
    map.addLayer({
      id: "2",
      type: 'circle',
      source: {
        type: 'geojson',
         data: "data/layers/emotions.geojson"
      },
      filter: ['all', ['==', "question", 1]],
      layout: { 'visibility': 'none' },
      paint: {
        "circle-color": ['get', 'color'], // Replace with the desired color
        "circle-radius": 1.4,  // Adjust as needed
        "circle-stroke-color": "transparent",
        "circle-stroke-width": 0,
        "circle-opacity":1
    },
   
    });
    map.addLayer({
        id: "1",
        type: 'circle',
        source: {
          type: 'geojson',
           data: "data/layers/emotions.geojson"
        },
        filter: ['all', ['==', "question", 2]],
        layout: { 'visibility': 'none' },
        paint: {
          "circle-color": ['get', 'color'], // Replace with the desired color
          "circle-radius": 1.4,  // Adjust as needed
          "circle-stroke-color": "transparent",
          "circle-stroke-width": 0,
          "circle-opacity":1
      },
     
      });
  });

  document.getElementById('feeling-select').addEventListener('change', function(e) {
    const selectedCategory = e.target.value;
    updateMapLayers(selectedCategory);
  });

  function updateMapLayers(category) {
    // Assuming you have multiple layers representing categories
    const categories = ['1','2'];  // List all categories here
  
    // Loop through all categories and toggle their visibility based on the selected one
    categories.forEach(function(cat) {
      if (cat === category) {
        map.setLayoutProperty(cat, 'visibility', 'visible');
      } else {
        map.setLayoutProperty(cat, 'visibility', 'none');
      }
    });
  }
 
