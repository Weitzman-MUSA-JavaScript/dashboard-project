import { updateWhaleStatus } from "./status_indicator.js";
import { fetchWeatherData } from "./weather.js";
import { updateImage } from "./whale_image.js";

mapboxgl.accessToken = 'pk.eyJ1Ijoic3lsdmlhdXBlbm4iLCJhIjoiY20weTdodGpiMGt4MDJsb2UzbzZnd2FmMyJ9.H6mn-LOHFUdv7swHpM7enA'

const map = new mapboxgl.Map({
  container: 'map', 
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: [140, -40], 
  zoom: 3, 
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
            'circle-color': '#b744d6'
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
          'circle-color': '#b744d6'
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

  // 4. blueWhale (point)
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

  // 5. bowheadWhale (point)
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

  // 6. falseKillerWhale (point)
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

  // 7. finWhale (point)
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

  // 8. spermWhale (point)
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

      whaleButtons.forEach(btn => btn.classList.remove('activeButton'));
      button.classList.add('activeButton');

      const lat = button.getAttribute('data-lat');
      const lon = button.getAttribute('data-lon');
      fetchWeatherData(lat, lon);

      changeWhaleTab(event);

      const species = button.getAttribute('data-species');
      updateWhaleStatus(species);

      updateImage(species);

    });
  });

});

  const whaleSharkCoords = [-87, 25];
  const humpbackWhaleCoords = [160,-40];
  const pilotWhaleCoords = [-74, 35];
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



