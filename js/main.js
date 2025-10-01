const mapElement = document.querySelector('#map');
const map = L.map(mapElement).setView([39.9526, -75.1652], 12);
const initialCenter = [39.9526, -75.1652];
const initialZoom = 12;

const mapboxKey = 'pk.eyJ1IjoiYXNobGV5MjAyNCIsImEiOiJjbTRxZDV1OXoxMzNxMmpxMnZnOHd1cW5oIn0.5-usMmqNLkoFO-G2OGDmcw';
const mapboxStyle = 'mapbox/light-v10';

const baseTileLayer = L.tileLayer(`http://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}?access_token=${mapboxKey}`, {
  tileSize: 512,
  zoomOffset: -1,
  maxZoom: 18,
  opacity: 0.8,
  attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
});
baseTileLayer.addTo(map);

const lotIcon = L.icon({
  iconUrl: 'pic/icon.png',
  iconSize: [48, 48],
});

function onEachFeature(feature, layer) {
  if (feature.properties && feature.properties.ADDRESS) {
    const tooltipContent = `<br>Address: ${feature.properties.ADDRESS}`;
    layer.bindTooltip(tooltipContent, {
      permanent: false,
      direction: 'top',
      className: 'custom-tooltip',
    });
  }
}

const markers = [];

fetch('data/phs_landcare.geojson')
  .then((response) => response.json())
  .then((data) => {
    L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        if (feature.properties && feature.properties.address) {
          layer.bindTooltip(`<strong>Address:</strong> ${feature.properties.address}`);

          markers.push({ layer, feature });

          layer.on('click', () => {
            const center = layer.getBounds().getCenter();
            map.setView(center, 18);

            layer.setStyle({
              color: '#e6852a',
              weight: 3,
              opacity: 1,
            });

            setTimeout(() => {
              layer.setStyle({
                color: '#3388ff',
                weight: 3,
                opacity: 0.6,
              });
            }, 1000);
          });
        }
      },
    }).addTo(map);

    displaySidebarList(data);
  });


function displaySidebarList(geojsonData) {
  const siteList = document.querySelector('.site-list');
  siteList.innerHTML = '<h3>Address List</h3>';

  const resetButton = document.createElement('button');
  resetButton.textContent = 'Original View';
  resetButton.classList.add('reset-button');
  resetButton.style.marginBottom = '10px';
  resetButton.style.display = 'block';

  resetButton.addEventListener('click', () => {
    map.setView(initialCenter, initialZoom);
    displaySidebarList(geojsonData);
  });

  siteList.appendChild(resetButton);

  geojsonData.features.forEach((feature, index) => {
    const { address } = feature.properties;

    const siteItem = document.createElement('div');
    siteItem.classList.add('site-item');

    const siteAddress = document.createElement('p');
    siteAddress.textContent = `${address}`;
    siteAddress.classList.add('site-address');
    siteItem.appendChild(siteAddress);

    siteItem.addEventListener('click', () => {
      const { layer } = markers[index];
      const center = layer.getBounds().getCenter();
      map.setView(center, 18);

      layer.setStyle({
        color: '#e6852a',
        weight: 3,
        opacity: 1,
      });

      setTimeout(() => {
        layer.setStyle({
          color: '#3388ff',
          weight: 4,
          opacity: 0.6,
        });
      }, 2000);
    });

    siteList.appendChild(siteItem);
  });
}

const zipFilterButton = document.getElementById('zipFilterButton');
const addressFilterButton = document.getElementById('addressFilterButton');
const zipInput = document.getElementById('zipInput');
const addressInput = document.getElementById('addressInput');
const resetZipButton = document.getElementById('resetZipButton');
const resetAddressButton = document.getElementById('resetAddressButton');

zipFilterButton.addEventListener('click', () => {
  const zipCode = zipInput.value.trim();

  fetch('data/phs_landcare.geojson')
    .then((response) => response.json())
    .then((data) => {
      const filteredFeatures = data.features.filter((feature) => {
        return String(feature.properties.zipcode) === String(zipCode);
      });

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.GeoJSON ) {
          map.removeLayer(layer);
        }
      });

      const geoJsonLayer = L.geoJSON(filteredFeatures, {
        style: {
          color: '#e6852a',
          weight: 2,
          opacity: 0.8,
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.address) {
            layer.bindTooltip(`<strong>Address:</strong> ${feature.properties.address}`);
          }
        },
      }).addTo(map);

      if (filteredFeatures.length > 0) {
        map.fitBounds(geoJsonLayer.getBounds());
      } else {
        alert('No results found for the provided ZIP code.');
      }

      displaySidebarList({ features: filteredFeatures });
    });
});


addressFilterButton.addEventListener('click', () => {
  const address = addressInput.value.trim();

  if (!address) {
    alert('Please enter a valid address.');
    return;
  }

  fetch('data/phs_landcare.geojson')
    .then((response) => response.json())
    .then((data) => {
      const filteredFeatures = data.features.filter((feature) => {
        return String(feature.properties.address)
          .trim()
          .toLowerCase()
          .includes(address.toLowerCase());
      });

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.GeoJSON ) {
          map.removeLayer(layer);
        }
      });

      const geoJsonLayer = L.geoJSON(filteredFeatures, {
        style: {
          color: '#e6852a',
          weight: 2,
          opacity: 0.8,
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.address) {
            layer.bindTooltip(`<strong>Address:</strong> ${feature.properties.address}`);
          }
        },
      }).addTo(map);

      if (filteredFeatures.length > 0) {
        map.fitBounds(geoJsonLayer.getBounds());
      } else {
        alert('No results found for the provided Address.');
      }

      displaySidebarList({ features: filteredFeatures });
    });
});


resetZipButton.addEventListener('click', () => {
  zipInput.value = '';

  fetch('data/phs_landcare.geojson')
    .then((response) => response.json())
    .then((data) => {
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.GeoJSON) {
          map.removeLayer(layer);
        }
      });


      const geoJsonLayer = L.geoJSON(data, {
        style: {
          color: '#3388ff',
          weight: 2,
          opacity: 0.6,
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.address) {
            layer.bindTooltip(`<strong>Address:</strong> ${feature.properties.address}`);
          }
        },
      }).addTo(map);

      displaySidebarList(data);


      map.setView(initialCenter, initialZoom);
    });
});


resetAddressButton.addEventListener('click', () => {
  addressInput.value = '';

  fetch('data/phs_landcare.geojson')
    .then((response) => response.json())
    .then((data) => {
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.GeoJSON) {
          map.removeLayer(layer);
        }
      });


      const geoJsonLayer = L.geoJSON(data, {
        style: {
          color: '#3388ff',
          weight: 2,
          opacity: 0.6,
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.address) {
            layer.bindTooltip(`<strong>Address:</strong> ${feature.properties.address}`);
          }
        },
      }).addTo(map);

      displaySidebarList(data);

      map.setView(initialCenter, initialZoom);
    });
});

// filter
const programCheckbox = document.querySelectorAll('.program-checkbox');

programCheckbox.forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    const selectedPrograms = Array.from(programCheckbox)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    console.log('Selected Programs:', selectedPrograms);

    fetch('data/phs_landcare.geojson')
      .then((response) => response.json())
      .then((data) => {
        let filteredFeatures;

        if (selectedPrograms.length > 0) {
          filteredFeatures = data.features.filter((feature) => {
            return selectedPrograms.includes(feature.properties.program);
          });
        } else {
          filteredFeatures = data.features;
        }

        console.log('Filtered Features:', filteredFeatures);

        map.eachLayer((layer) => {
          if (layer instanceof L.GeoJSON || layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });

        const geoJsonLayer = L.geoJSON(filteredFeatures, {
          style: (feature) => {
            const isFiltered = selectedPrograms.length > 0
              ? selectedPrograms.includes(feature.properties.program)
              : false;

            return {
              color: isFiltered ? '#ff4d4d' : '#3388ff',
              weight: 3,
              opacity: isFiltered ? 1 : 0.6,
              fillColor: isFiltered ? '#ff9999' : '#66ccff',
              fillOpacity: isFiltered ? 0.7 : 0.4,
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(`<strong>Program:</strong> ${feature.properties.program}`);
          },
        }).addTo(map);

        if (filteredFeatures.length > 0) {
          map.fitBounds(geoJsonLayer.getBounds());
        } else {
          alert('No results found for the selected program.');
        }
      })
      .catch((error) => console.error('Error loading GeoJSON:', error));
  });
});


const stabilizedCheckbox = document.querySelectorAll('.stabilized-checkbox');

stabilizedCheckbox.forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    const selectedStabilized = Array.from(stabilizedCheckbox)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    console.log('Stabilized:', selectedStabilized);

    fetch('data/phs_landcare.geojson')
      .then((response) => response.json())
      .then((data) => {
        let filteredFeatures;

        if (selectedStabilized.length > 0) {
          filteredFeatures = data.features.filter((feature) => {
            return selectedStabilized.includes(feature.properties.stabilized);
          });
        } else {
          filteredFeatures = data.features;
        }

        console.log('Filtered Features:', filteredFeatures);

        map.eachLayer((layer) => {
          if (layer instanceof L.GeoJSON || layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });

        const geoJsonLayer = L.geoJSON(filteredFeatures, {
          style: (feature) => {
            const isFiltered = selectedStabilized.length > 0
              ? selectedStabilized.includes(feature.properties.stabilized)
              : false;

            return {
              color: isFiltered ? '#ff4d4d' : '#3388ff',
              weight: 3,
              opacity: isFiltered ? 1 : 0.6,
              fillColor: isFiltered ? '#ff9999' : '#66ccff',
              fillOpacity: isFiltered ? 0.7 : 0.4,
            };
          },
          onEachFeature: (feature, layer) => {
            layer.bindTooltip(`<strong>Stabilized:</strong> ${feature.properties.stabilized}`);
          },
        }).addTo(map);

        if (filteredFeatures.length > 0) {
          map.fitBounds(geoJsonLayer.getBounds());
        } else {
          alert('No results found for the selected lots.');
        }
      })
      .catch((error) => console.error('Error loading GeoJSON:', error));
  });
});
