mapboxgl.accessToken = 'pk.eyJ1Ijoic3lsdmlhdXBlbm4iLCJhIjoiY20weTdodGpiMGt4MDJsb2UzbzZnd2FmMyJ9.H6mn-LOHFUdv7swHpM7enA'

const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/mapbox/outdoors-v12', // style URL
  center: [140, -40], // starting position [lng, lat]
  zoom: 3, // starting zoom
});

// Add geojson file
  map.on('load', ()=> {
   
    // 1. humpbackWhale (point)
      map.addLayer({
        id: "humpbackWhale-layer",
        type: "circle",
        source: {
          type: 'geojson',
          data: 'data/humpbackWhale.geojson'
        },
        paint: {
            'circle-opacity': 1,
            'circle-color': '#4a0fd4'
        }

      });

    // 2. whaleShark (point)
     map.addLayer({
      id: "whaleShark-layer",
      type: "circle",
      source: {
        type: 'geojson',
        data: 'data/whaleShark.geojson'
      },
      paint: {
          'circle-opacity': 1,
          'circle-color': '#a164db'
      }

    });

  // 3. shortFinnedPilotWhale (point)
    map.addLayer({
      id: "shortFinnedPilotWhale-layer",
      type: "circle",
      source: {
        type: 'geojson',
        data: 'data/shortFinnedPilotWhale.geojson'
      },
      paint: {
        'circle-opacity': 1,
        'circle-color': '#b744d6'
      }

  });

  // 4. blueFinWhale (point)
  map.addLayer({
    id: "blueFinWhale-layer",
    type: "circle",
    source: {
      type: 'geojson',
      data: 'data/blueFinWhale.geojson'
    },
    paint: {
      'circle-opacity': 1,
      'circle-color': '#b744d6'
    }

});

  // 5. blueWhale (point)
  map.addLayer({
    id: "blueWhale-layer",
    type: "circle",
    source: {
      type: 'geojson',
      data: 'data/blueWhale.geojson'
    },
    paint: {
      'circle-opacity': 1,
      'circle-color': '#b744d6'
    }

});

  // 6. bowheadWhale (point)
  map.addLayer({
    id: "bowheadWhale-layer",
    type: "circle",
    source: {
      type: 'geojson',
      data: 'data/bowheadWhale.geojson'
    },
    paint: {
      'circle-opacity': 1,
      'circle-color': '#b744d6'
    }

});

  // 7. falseKillerWhale (point)
  map.addLayer({
    id: "falseKillerWhale-layer",
    type: "circle",
    source: {
      type: 'geojson',
      data: 'data/falseKillerWhale.geojson'
    },
    paint: {
      'circle-opacity': 1,
      'circle-color': '#b744d6'
    }

});

  // 8. finWhale (point)
  map.addLayer({
    id: "finWhale-layer",
    type: "circle",
    source: {
      type: 'geojson',
      data: 'data/finWhale.geojson'
    },
    paint: {
      'circle-opacity': 1,
      'circle-color': '#b744d6'
    }

});

  // 9. spermWhale (point)
  map.addLayer({
    id: "spermWhale-layer",
    type: "circle",
    source: {
      type: 'geojson',
      data: 'data/spermWhale.geojson'
    },
    paint: {
      'circle-opacity': 1,
      'circle-color': '#b744d6'
    }

});

  const whaleButtons = document.querySelectorAll('.whaleButton');
  whaleButtons.forEach(button => {
    button.addEventListener('click', (event) => {

      changeWhaleTab(event);

      const species = button.getAttribute('data-species');
      updateImage(species);
      updateText(species);

    });
  });

});

  const whaleSharkCoords = [-87, 25];
  const humpbackWhaleCoords = [160,-40];
  const pilotWhaleCoords = [-74, 35];
  const blueFinWhaleCoords = [-119, 33];
  const blueWhaleCoords = [170,-64];
  const bowheadWhaleCoords = [-85, 71];
  const falseKillerWhaleCoords = [-160, 23];
  const finWhaleCoords = [-111, 26];
  const spermWhaleCoords = [-112, 28];
  
  // Creating function for the map to zoom 
  function changeWhaleTab(event) {
    const species = event.target.dataset.species;
  
      // Hide all layers first
      map.setLayoutProperty('humpbackWhale-layer', 'visibility', 'none');
      map.setLayoutProperty('whaleShark-layer', 'visibility', 'none');
      map.setLayoutProperty('shortFinnedPilotWhale-layer', 'visibility', 'none');
      map.setLayoutProperty('blueFinWhale-layer', 'visibility', 'none');
      map.setLayoutProperty('blueWhale-layer', 'visibility', 'none');
      map.setLayoutProperty('bowheadWhale-layer', 'visibility', 'none');
      map.setLayoutProperty('falseKillerWhale-layer', 'visibility', 'none');
      map.setLayoutProperty('finWhale-layer', 'visibility', 'none');
      map.setLayoutProperty('spermWhale-layer', 'visibility', 'none');
  
      // Determine which layer to show based on the clicked tab
      switch (species) {
          case 'humpbackWhale':
              map.setLayoutProperty('humpbackWhale-layer', 'visibility', 'visible');
              map.flyTo({center: humpbackWhaleCoords, zoom: 2});
              break;
          case 'whaleShark':
              map.setLayoutProperty('whaleShark-layer', 'visibility', 'visible');
              map.flyTo({center: whaleSharkCoords, zoom: 4});
              break;
          case 'pilotWhale':
              map.setLayoutProperty('shortFinnedPilotWhale-layer', 'visibility', 'visible');
              map.flyTo({center: pilotWhaleCoords, zoom: 4});
              break;
          case 'blueFinWhale':
              map.setLayoutProperty('blueFinWhaleCoords-layer', 'visibility', 'visible');
              map.flyTo({center: blueFinWhaleCoords, zoom: 5});
              break;
          case 'blueWhale':
              map.setLayoutProperty('blueWhale-layer', 'visibility', 'visible');
              map.flyTo({center: blueWhaleCoords, zoom: 3});
              break;
          case 'bowheadWhale':
              map.setLayoutProperty('bowheadWhale-layer', 'visibility', 'visible');
              map.flyTo({center: bowheadWhaleCoords, zoom: 2});
              break;
          case 'falseKillerWhale':
              map.setLayoutProperty('falseKillerWhale-layer', 'visibility', 'visible');
              map.flyTo({center: falseKillerWhaleCoords, zoom: 3});
              break;
          case 'finWhale':
              map.setLayoutProperty('finWhale-layer', 'visibility', 'visible');
              map.flyTo({center: finWhaleCoords, zoom: 5});
              break;
          case 'spermWhale':
              map.setLayoutProperty('spermWhale-layer', 'visibility', 'visible');
              map.flyTo({center: spermWhaleCoords, zoom: 5});
              break;             
          default:
              break;
      }
  
  }

  // Create function for changing image
  function updateImage(species) {
      const whaleImage = document.getElementById('whaleImage');
      let imageUrl;
  
      // Define the image based on species
      switch (species) {
          case 'humpbackWhale':
              imageUrl = './data/humpbackWhale.jpg'; 
              break;
          case 'whaleShark':
              imageUrl = './data/whaleShark.jpg'; 
              break;
          case 'pilotWhale':
              imageUrl = './data/shortFinnedPilotWhale.jpg';
              break;
          case 'blueFinWhale':
              imageUrl = './data/blueFinWhale.jpg'; 
              break;
          case 'blueWhale':
              imageUrl = './data/blueWhale.jpg'; 
              break;
          case 'bowheadWhale':
              imageUrl = './data/bowheadWhale.jpg'; 
              break;
          case 'falseKillerWhale':
              imageUrl = './data/falseKillerWhale.jpg';
              break;
          case 'finWhale':
              imageUrl = './data/finWhale.jpg'; 
              break;
          case 'spermWhale':
              imageUrl = './data/spermWhale.jpg'; 
              break;
          default:
              imageUrl = ''; // Default case
      }

      if (imageUrl) {
        whaleImage.src = imageUrl;
        whaleImage.style.display = 'block'; // Show the image
    } else {
        whaleImage.style.display = 'none'; // Hide if no valid species
    }
  }

  // Create function for updating text 
  function updateText(species) {
    const whaleDescription = document.getElementById('whaleDescription');
    const descriptions = {
        humpbackWhale: "Humpback whales are known for their long migrations and complex songs.",
        whaleShark: "Whale sharks are the largest fish species in the world and are gentle giants.",
        pilotWhale: "Short-finned pilot whales are known for their strong social bonds and intelligence.",
        blueFinWhale: "Blue fin whales are one of the largest whale species, known for their immense size.",
        blueWhale: "Blue whales are the largest animals ever known to have existed.",
        bowheadWhale: "Bowhead whales are known for their bow-shaped skulls and are found in Arctic waters.",
        falseKillerWhale: "False killer whales are known for their social behavior and close-knit pods.",
        finWhale: "Fin whales are the second-largest species of whale, known for their speed and grace.",
        spermWhale: "Sperm whales are known for their deep diving abilities and large heads."
    };
  
    whaleDescription.textContent = descriptions[species] || "No description available.";
    document.getElementById('whaleInfo').style.display = 'block';
  }



// Geolocation handling (this is an aspirational step)
// if (navigator.geolocation) {
//   navigator.geolocation.watchPosition(position => {
//       const { latitude, longitude, heading } = position.coords;

//       // Update map view and compass
//       map.setView([latitude, longitude], 12);
//       compassControl.update(heading); 
//   }, error => {
//       console.error(error);
//   });
// } else {
//   console.error('Geolocation is not supported by this browser.');
// }

// Writing a code to find the current location of user 
// function handlePositionSuccess(pos) {
//   console.log('Successfuly got position!', pos);
//   const evt = new CustomEvent('positionfound')
// }
// function handlePositionError(err) {
//   console.error('Failed to get position!', err);
// }
// navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {enableHighAccuracy: true});

