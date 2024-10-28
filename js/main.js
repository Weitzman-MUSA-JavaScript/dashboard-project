mapboxgl.accessToken = config.mapboxKey

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

// Create function to update images
  function updateImage(species) {
    const whaleImages = {
      humpbackWhale: [
        './data/humpbackWhale.jpg',
      ],
      whaleShark: [
        './data/whaleShark2.png',
      ],
      pilotWhale: [
        './data/pilotWhale.jpg',
      ],
      blueWhale: [
        './data/blueWhale.jpg',
      ],
      bowheadWhale: [
        './data/bowheadWhale.jpg',
      ],
      falseKillerWhale: [
        './data/falseKillerWhale.jpg',
      ],
      finWhale: [
        './data/finWhale.jpg',
      ],
      spermWhale: [
        './data/spermWhale.jpg',
      ],
    }

    const whaleImageContainer = document.getElementById('whaleImageContainer'); // A container for the images
    whaleImageContainer.innerHTML = ''; // Clear previous images

    const images = whaleImages[species];
    if (images) {
        images.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = `${species} image`;
            img.style.width = '100%'; 
            img.style.marginBottom = '10px'; 
            whaleImageContainer.appendChild(img); 
        });
    }

  }

  // Create function for updating status indicator
  function updateWhaleStatus(species) {
    const whaleSpecies = [
      { name: "humpbackWhale", iucnStatus: "LC" },
      { name: "whaleShark", iucnStatus: "NT" },
      { name: "pilotWhale", iucnStatus: "VU" },
      { name: "blueWhale", iucnStatus: "CR" },
      { name: "bowheadWhale", iucnStatus: "LC" },
      { name: "falseKillerWhale", iucnStatus: "EN" },
      { name: "finWhale", iucnStatus: "LC" },
      { name: "spermWhale", iucnStatus: "LC" }
    ];
    
    const iucnDescriptions = {
    "LC": { text: "Least Concern", color: "lightgreen" },
    "NT": { text: "Near Threatened", color: "yellow" },
    "VU": { text: "Vulnerable", color: "orange" },
    "EN": { text: "Endangered", color: "#f15757" },
    "CR": { text: "Critically Endangered", color: "red" },
    "EW": { text: "Extinct in the Wild", color: "gray" },
    "EX": { text: "Extinct", color: "black" }
    };

    const speciesName = whaleSpecies.find(s => s.name === species);
    if (!speciesName) {
      console.error('Species not found:', species);
      return;
  }

  const statusInfo = iucnDescriptions[speciesName.iucnStatus];
  if (statusInfo) {

      const statusElement = document.querySelector('.statusText');
        statusElement.innerText = statusInfo.text;
        statusElement.style.color = statusInfo.color;

  } else {
      console.error('Status information not found for:', speciesName.iucnStatus);
  }
}

function fetchWeatherData(lat, lon) {
  const apikey = config.weatherKey;
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apikey}&units=metric`;
  
  fetch(weatherUrl)
      .then(response => response.json())
      .then(data => {
          const windSpeed = data.wind.speed; // Wind speed in m/s
          const windDirection = data.wind.deg; // Wind direction in degrees
          const weatherDescription = data.weather[0].description; // Weather description
          
          updateWeatherInfo(windSpeed, windDirection, weatherDescription);
          updateWindRoseChart(windSpeed, windDirection); // Update the wind rose chart
      })
      .catch(error => console.error('Error fetching weather data:', error));
}

let windRoseChart; // Declare it globally
let windRoseData = [0, 0, 0, 0, 0, 0, 0, 0];

function initializeWindRoseChart() {
    const ctx = document.getElementById('windRoseChart').getContext('2d');
    windRoseChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
            datasets: [{
                label: 'Wind Speed (m/s)',
                data: [0, 0, 0, 0, 0, 0, 0, 0], // Initial data
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    // ... other colors
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    // ... other colors
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    beginAtZero: true,
                }
            }
        }
    });
}

function updateWindRoseChart(windSpeed, windDirection) {
  const index = Math.floor((windDirection % 360) / 45);
  windRoseData[index] += windSpeed; // Update data

  // Only attempt to destroy if windRoseChart is defined
  if (windRoseChart) {
      windRoseChart.destroy(); // Destroy the existing chart
  }

  // Re-initialize the chart
  const windSpeeds = [5, 15, 25, 35]; // Example wind speed data
const colors = windSpeeds.map(speed => {
    if (speed <= 10) return 'rgba(0, 255, 0, 0.6)'; // Light Green for low speed
    if (speed <= 20) return 'rgba(255, 255, 0, 0.6)'; // Yellow for moderate speed
    return 'rgba(255, 0, 0, 0.6)'; // Red for high speed
});

// Sample wind direction labels
const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const ctx = document.getElementById('windRoseChart').getContext('2d');
  windRoseChart = new Chart(ctx, {
      type: 'polarArea',
      data: {
          labels: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
          datasets: [{
              label: 'Wind Speed (m/s)',
              data: windRoseData, // Use updated data
              backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                  // ... other colors
              ],
              borderColor: 'white',
              borderWidth: 1
          }]
      },
      options: {
          responsive: true,
          scales: {
              r: {
                beginAtZero: true,
                grid: {
                  color: 'white'
                }
              }
            },
          plugins: {
            legend: {
              labels: {
                color: 'white' 
                }
            }
          }
      }
  });
}


function updateWeatherInfo(speed, direction, description) {
  document.getElementById('windSpeed').innerText = `Wind Speed: ${speed} m/s`;
  document.getElementById('windDirection').innerText = `Wind Direction: ${direction}°`;
  document.getElementById('weatherDescription').innerText = `Weather: ${description}`;
}

