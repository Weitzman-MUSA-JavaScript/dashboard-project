function initMap(leftEl, boundary, pois, events) {
  const mapEl = leftEl.querySelector('#map');
  const typeListEl = leftEl.querySelector('#poi-type');
  const typeListItems = typeListEl.querySelectorAll('.type');

  //
  // Choose the selected pois type...
  //

  // Add event listener to each type button
  const selectedType = [];

  typeListItems.forEach((item) => {
    item.addEventListener('click', (evt) => {
      const type = evt.target.dataset.type;

      if (selectedType.includes(type)) {
        selectedType.length = 0;
        evt.target.setAttribute('aria-pressed', 'false');
      } else {
        selectedType.length = 0;
        selectedType.push(type);
        resetButtonState();
        evt.target.setAttribute('aria-pressed', 'true');
      }

      const event = new CustomEvent('typeselected', {
        detail: { selectedType },
      });
      events.dispatchEvent(event);
    });
  });

  // Reset the button state
  function resetButtonState() {
    typeListItems.forEach((item) => {
      item.setAttribute('aria-pressed', 'false');
    });
  }

  //
  // Create the map...
  //
  const map = L.map(mapEl, { maxZoom: 18, zoomSnap: 0 }).setView([0, 0], 1);

  // Add a base layer to the map
  const mapboxKey = 'pk.eyJ1IjoieHV5YW9oYW4iLCJhIjoiY20xN3l1aDl0MHlhdTJqb3NrN3JzcHZ3ZyJ9.W0K0GomuRMj9lrIY029KoA';
  const mapboxStyle = 'mapbox/light-v11';

  const baseLayer = L.tileLayer(
    `https://api.mapbox.com/styles/v1/${mapboxStyle}/tiles/512/{z}/{x}/{y}{r}?access_token=${mapboxKey}`, {
      tileSize: 512,
      zoomOffset: -1,
      detectRetina: true,
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
  baseLayer.addTo(map);

  // Add the boundary to the map...
  const boundaryLayer = L.geoJSON(boundary, {
    style: {
      color: 'rgba(0, 0, 0, 1)',
      weight: 2,
      fillOpacity: 0,
    },
  });
  boundaryLayer.addTo(map);

  // Adjust the map view to fit the boundary layer
  function adjustMapView(map, boundaryLayer) {
    const mapSize = map.getSize();
    const mapWidth = mapSize.x;

    const padding = mapWidth * 0.05;
    const panDistance = mapWidth * 0.08;

    if (boundaryLayer && boundaryLayer.getBounds().isValid()) {
      map.fitBounds(boundaryLayer.getBounds(), {
        padding: [padding, padding],
      });

      map.panBy([panDistance, 0]);
    } else {
      console.warn('Boundary layer bounds are invalid!');
    }
  }
  adjustMapView(map, boundaryLayer);

  // Add the POIs to the map
  const poisLayer = L.geoJSON(pois, {
    pointToLayer: (feature, latlng) => {
      // 定义八种类型对应的颜色
      const typeColors = {
        Commerce: '#F26363', // 红色
        Mountain: '#947262', // 绿色
        Recreation: '#D93BAF', // 蓝色
        Restroom: '#a7a7ad', // 橙色
        Service: '#919151', // 紫色
        Tourism: '#008C72', // 青色
        Transportation: '#ee9f3e', // 黄色
        Water: '#0099DD', // 灰色
      };

      // 获取 Type 字段，并设置颜色
      const type = feature.properties.Type;
      const color = typeColors[type] || typeColors.default;

      // 返回带颜色的 circleMarker
      return L.circleMarker(latlng, {
        radius: 5,
        color: color,
        weight: 2.4,
        opacity: 1,
        fillOpacity: 0.4,
      });
    },
  });

  // 将 POIs 图层添加到地图
  poisLayer.addTo(map);

  return map;
}

export { initMap };
