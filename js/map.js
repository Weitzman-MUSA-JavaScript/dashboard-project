// Built using examples from Weeks 2, 3, 4 and 6. I wrote the initial code, with debugging and explanations and a general guidance from
//  from Claude and ChatGPT.

// imports functions for business categories and map colors
import { getCategory } from './data.js';
import { getClasses, getColor, getValue } from './colors.js';

// sets up the map using the data and event bus, and stores the current business type and selected area
// adapted from Week 6 stations_map.js
function initMap(el, areas, events) {
  let category = getCategory('all');
  let selectedAreaNumber = null;

  // creates the map and allows zoom levels like 10.8 (Week 6 stations_map.js, Week 2 main.js)
  const map = L.map(el, { zoomSnap: 0 });

  // adds Esri's dark gray basemap with a maximum zoom of 16, 80% opacity and map credits
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16, // Esri's light gray map only has tiles up to zoom 16
    opacity: 0.8,
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
  }).addTo(map);

  // Colors each community area by the selected business type, with a thick green border for the selected area and thin gray borders for the rest.
  // from week 2 and 3
  function styleArea(feature) {
    const isSelected = feature.properties.area_numbe === selectedAreaNumber;
    return {
      fillColor: getColor(feature.properties, category),
      fillOpacity: 0.9,
      color: isSelected ? '#2e8540' : '#4d4d4d',
      weight: isSelected ? 6 : 1,
    };
  }

  // adds the 77 community areas to the map using styleArea for colors and borders
  const areasLayer = L.geoJSON(areas, { style: styleArea }).addTo(map);

  // Shows the area’s name in bold and its number below when you hover over it.
  // shows name in bold
  areasLayer.bindTooltip((layer) => {
    const props = layer.feature.properties;
    const value = getValue(props, category);
    const valueText = category.key === 'all' ?
      `${value.toFixed(1)} licenses per 1,000 residents` :
      `${value.toFixed(2)}x the citywide share`;
    return `<strong>${props.name}</strong><br>${valueText}`;
  });

  // centers the map on Chicago and shifts it slightly left to avoid overlapping the legend
  map.setView([41.84, -87.65], 10.8);

  // sends the clicked area's number through the event bus to highlight it, show its summary and zoom to it,
  // using Week 2 main.js and Week 6 hoods_select.js
  areasLayer.on('click', (evt) => {
    const areaNumber = evt.layer.feature.properties.area_numbe;
    const event = new CustomEvent('areaselected', {
      detail: { areaNumber, fromList: false },
    });
    events.dispatchEvent(event);
  });

  // adds a help box at the top right and uses helpDiv to update its text later
  const helpControl = L.control({ position: 'topright' });
  let helpDiv = null;

  // creates the help box with text and screen-reader labels, then adds it to Leaflet
  helpControl.onAdd = () => {
    helpDiv = L.DomUtil.create('div', 'legend map-help');
    helpDiv.id = 'map-help';
    helpDiv.setAttribute('role', 'region');
    helpDiv.setAttribute('aria-roledescription', 'Map help');
    helpDiv.setAttribute('aria-label', 'What the map colors mean');
    updateHelpText();
    return helpDiv;
  };

  // shows the chosen business type in bold and explains the colors
  function updateHelpText() {
    if (category.key === 'all') {
      helpDiv.innerHTML = '<strong>All businesses</strong><br>' +
        'Darker areas have more business licenses per 1,000 residents.';
    } else {
      helpDiv.innerHTML = `<strong>${category.label}</strong><br>` +
        'Darker (Yellow) areas have a larger share than the city as a whole; lighter ' +
        'areas have a smaller share, and red areas have none.';
    }
  }

  // adds the help box to the top right of the map
  helpControl.addTo(map);

  // creates a legend below the help box and uses legendDiv to update it when a new business type is selected
  const legend = L.control({ position: 'topright' });
  let legendDiv = null;

  // creates and fills the legend with accessibility labels, then returns it to Leaflet
  legend.onAdd = () => {
    legendDiv = L.DomUtil.create('div', 'legend');
    legendDiv.id = 'map-legend';
    legendDiv.setAttribute('role', 'region');
    legendDiv.setAttribute('aria-roledescription', 'Legend');
    legendDiv.setAttribute('aria-labelledby', 'legend-title');
    legendDiv.setAttribute('tabindex', '0');
    updateLegend();
    return legendDiv;
  };

  // sets the legend title and gets its colors from colors.js
  function updateLegend() {
    const title = category.key === 'all' ?
      'Licenses per 1,000 residents' :
      `${category.label}: share vs. citywide`;
    const classes = getClasses(category.key);
    // adds the legend title and a colored square with a label for each category
    legendDiv.innerHTML = `
      <h2 id="legend-title">${title}</h2>
      <ul class="legend-entries">
        ${classes.map((cls) => `
          <li class="legend-entry">
            <span class="legend-icon" style="background-color: ${cls.color};"></span>
            <span>${cls.label}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  // adds the legend to the top-right of the map, below the help box
  legend.addTo(map);

  // creates an area summary box at the bottom-left of the map and uses areaInfoDiv to update
  //  its numbers when an area is selected
  const areaInfo = L.control({ position: 'bottomleft' });
  let areaInfoDiv = null;

  // creates the area summary box, adds screen-reader and keyboard support, fills it in and returns it to Leaflet
  areaInfo.onAdd = () => {
    areaInfoDiv = L.DomUtil.create('div', 'legend map-area-info');
    areaInfoDiv.id = 'map-area-info';
    areaInfoDiv.setAttribute('role', 'region');
    areaInfoDiv.setAttribute('aria-roledescription', 'Area summary');
    areaInfoDiv.setAttribute('aria-labelledby', 'area-info-title');
    areaInfoDiv.setAttribute('tabindex', '0');
    updateAreaInfo();
    return areaInfoDiv;
  };

  // rounds the number and adds commas every three digits
  function addCommas(num) {
    const digits = `${Math.round(num)}`;
    let result = '';
    for (let i = digits.length; i > 0; i -= 3) {
      const start = i - 3 < 0 ? 0 : i - 3;
      const group = digits.slice(start, i);
      result = result === '' ? group : `${group},${result}`;
    }
    return result;
  }

  // updates the area summary box; if no area is selected, shows instructions and stops
  function updateAreaInfo() {
    if (selectedAreaNumber === null) {
      areaInfoDiv.innerHTML = `
        <h2 id="area-info-title">Selected area</h2>
        <p>Click an area on the map or pick one from the list to see its numbers.</p>
      `;
      return;
    }

    // finds the selected area among the 77 areas and stores its data in props
    let props = null;
    for (const area of areas) {
      if (area.properties.area_numbe === selectedAreaNumber) {
        props = area.properties;
      }
    }

    // shows the area's business density for All businesses, or its LQ for the selected business type
    const value = getValue(props, category);
    const valueText = category.key === 'all' ?
      `${value.toFixed(1)} business licenses per 1,000 residents` :
      `${value.toFixed(2)}x the citywide share of ${category.label.toLowerCase()}`;

    // shows the selected area's name, business density or LQ, population and total business licenses
    areaInfoDiv.innerHTML = `
      <h2 id="area-info-title">${props.name}</h2>
      <p>${valueText}</p>
      <p>Population: ${addCommas(props.population)}</p>
      <p>Total business licenses: ${addCommas(props.Point_Count)}</p>
    `;
  }

  // adds the area summary box to the bottom-left of the map
  areaInfo.addTo(map);

  // saves the selected business type, recolors the map and updates the legend, help box and area summary
  events.addEventListener('categorychanged', (evt) => {
    category = getCategory(evt.detail.categoryKey);
    areasLayer.resetStyle();
    updateLegend();
    updateHelpText();
    updateAreaInfo();
  });

  // saves the area selected from the map or list, outlines it in green and shows its numbers
  events.addEventListener('areaselected', (evt) => {
    selectedAreaNumber = evt.detail.areaNumber;
    areasLayer.resetStyle();
    updateAreaInfo();
    // moves the map to the selected area in 0.75 seconds, with maxZoom 12 to avoid zooming in too close
    areasLayer.eachLayer((layer) => {
      if (layer.feature.properties.area_numbe === selectedAreaNumber) {
        map.flyToBounds(layer.getBounds(), {
          duration: 0.75,
          maxZoom: 12,
        });
      }
    });
  });

  // adds a reset button at the top-left to clear the selected area,
  // switch back to All businesses and show the starting view of Chicago
  const resetControl = L.control({ position: 'topleft' });
  resetControl.onAdd = () => {
    const resetDiv = L.DomUtil.create('div', 'legend');
    resetDiv.innerHTML = '<button type="button">Reset map</button>';
    resetDiv.querySelector('button').addEventListener('click', () => {
      selectedAreaNumber = null;
      const event = new CustomEvent('categorychanged', {
        detail: { categoryKey: 'all' },
      });
      events.dispatchEvent(event);
      map.setView([41.84, -87.65], 10.8);
    });

    // returns the reset box to Leaflet to display on the map
    return resetDiv;
  };
  resetControl.addTo(map);

  return map;
}

// exports initMap so main.js can use it
export { initMap };
