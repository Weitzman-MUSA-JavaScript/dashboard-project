const numberFormat = new Intl.NumberFormat('en-US');
const percentFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const shortWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const seasonNames = ['Winter', 'Spring', 'Summer', 'Fall'];
const dayparts = {
  overnight: [0, 6],
  morning: [6, 12],
  afternoon: [12, 18],
  evening: [18, 24],
};
const seasons = {
  winter: [12, 1, 2],
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  fall: [9, 10, 11],
};
const els = Object.fromEntries([
  'data-status', 'summary-count', 'summary-count-note', 'summary-area',
  'summary-area-note', 'summary-filter', 'summary-filter-note', 'filters',
  'year-filter', 'category-filter', 'day-filter', 'season-filter', 'tract-select',
  'back-to-city', 'map-title', 'legend-max', 'detail-title',
  'detail-description', 'detail-stat', 'trend-chart', 'trend-summary',
  'hour-chart', 'hour-summary',
  'weekday-chart', 'season-chart', 'type-chart', 'places-title', 'places-label',
  'places-caption', 'places-list',
].map((id) => [id, document.getElementById(id)]));

const state = {
  events: [],
  features: new Map(),
  selectedTract: null,
  map: null,
  geoLayer: null,
  pointLayer: null,
  tractLayers: new Map(),
  cityBounds: null,
  currentYear: null,
  trendView: null,
  trendMeta: null,
  trendCategoryIndex: new Map(),
  trendTractIndex: new Map(),
  metadata: null,
  loading: false,
  loadRequest: 0,
};

function formatCount(value) {
  return numberFormat.format(value);
}

function tractLabel(feature) {
  return feature.properties.name.split(';')[0];
}

function parseCsvRow(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

function parseEvents(csv) {
  const lines = csv.trimEnd().split(/\r?\n/);
  const headings = parseCsvRow(lines.shift());
  const required = ['tract_geoid', 'month', 'weekday', 'hour', 'category', 'lat', 'lng', 'block'];
  if (required.some((heading) => !headings.includes(heading))) {
    throw new Error('The incident file is missing required columns.');
  }
  const column = Object.fromEntries(headings.map((heading, index) => [heading, index]));
  const events = [];
  for (const line of lines) {
    if (!line) continue;
    const row = parseCsvRow(line);
    const tract = row[column.tract_geoid];
    if (!tract) continue;
    events.push({
      tract,
      month: Number(row[column.month]),
      weekday: Number(row[column.weekday]),
      hour: Number(row[column.hour]),
      category: row[column.category],
      lat: Number(row[column.lat]),
      lng: Number(row[column.lng]),
      block: row[column.block],
    });
  }
  return events;
}

function getFilters() {
  return {
    year: Number(els['year-filter'].value),
    category: els['category-filter'].value,
    daypart: els.filters.elements.daypart.value,
    day: els['day-filter'].value,
    season: els['season-filter'].value,
  };
}

function matches(event, filters, ignored = '') {
  if (ignored !== 'category' && filters.category !== 'all' && event.category !== filters.category) return false;
  if (ignored !== 'daypart' && filters.daypart !== 'all') {
    const [start, end] = dayparts[filters.daypart];
    if (event.hour < start || event.hour >= end) return false;
  }
  if (ignored !== 'day' && filters.day !== 'all') {
    if (filters.day === 'weekdays' && event.weekday > 4) return false;
    if (filters.day === 'weekends' && event.weekday < 5) return false;
    if (!['weekdays', 'weekends'].includes(filters.day) && event.weekday !== Number(filters.day)) return false;
  }
  if (ignored !== 'season' && filters.season !== 'all' && !seasons[filters.season].includes(event.month)) return false;
  return true;
}

function selectedAreaMatches(event) {
  return !state.selectedTract || event.tract === state.selectedTract;
}

function filteredData(filters) {
  const counts = new Map();
  const hourCounts = Array(24).fill(0);
  const weekdayCounts = Array(7).fill(0);
  const seasonCounts = Array(4).fill(0);
  const types = new Map();
  const cityTypes = new Map();
  const blocks = new Map();
  let total = 0;

  for (const event of state.events) {
    const inArea = selectedAreaMatches(event);
    if (matches(event, filters)) {
      counts.set(event.tract, (counts.get(event.tract) || 0) + 1);
      total += 1;
      if (state.selectedTract && inArea) {
        const key = event.block || 'Unspecified block';
        const block = blocks.get(key) || { count: 0, lat: 0, lng: 0 };
        block.count += 1;
        block.lat += event.lat;
        block.lng += event.lng;
        blocks.set(key, block);
      }
    }
    if (inArea && matches(event, filters, 'daypart')) hourCounts[event.hour] += 1;
    if (inArea && matches(event, filters, 'day')) weekdayCounts[event.weekday] += 1;
    if (inArea && matches(event, filters, 'season')) {
      const seasonIndex = event.month === 12 || event.month <= 2 ? 0 : Math.floor((event.month - 3) / 3) + 1;
      seasonCounts[seasonIndex] += 1;
    }
    if (matches(event, filters, 'category')) {
      cityTypes.set(event.category, (cityTypes.get(event.category) || 0) + 1);
      if (inArea) types.set(event.category, (types.get(event.category) || 0) + 1);
    }
  }

  return { counts, total, hourCounts, weekdayCounts, seasonCounts, types, cityTypes, blocks };
}

function mapColor(value, maximum) {
  if (!value) return '#e8eeee';
  const ratio = Math.sqrt(value / Math.max(maximum, 1));
  if (ratio < 0.25) return '#d9eeec';
  if (ratio < 0.45) return '#acd6d5';
  if (ratio < 0.65) return '#79b9bc';
  if (ratio < 0.82) return '#3a929d';
  return '#0a6272';
}

function mapStyle(feature, counts, maximum) {
  const selected = feature.properties.GEOID === state.selectedTract;
  return {
    color: selected ? '#142c36' : '#ffffff',
    weight: selected ? 3 : 0.8,
    opacity: selected ? 1 : 0.85,
    fillColor: mapColor(counts.get(feature.properties.GEOID) || 0, maximum),
    fillOpacity: selected ? 0.91 : 0.79,
  };
}

function drawMap(counts) {
  const maximum = Math.max(0, ...counts.values());
  els['legend-max'].textContent = formatCount(maximum);
  state.geoLayer.eachLayer((layer) => {
    const feature = layer.feature;
    const count = counts.get(feature.properties.GEOID) || 0;
    layer.setStyle(mapStyle(feature, counts, maximum));
    layer.unbindTooltip();
    layer.bindTooltip(`${tractLabel(feature)} · ${formatCount(count)} reports`, { sticky: true });
    if (feature.properties.GEOID === state.selectedTract) layer.bringToFront();
  });
}

function makeStat(value, label) {
  const strong = document.createElement('strong');
  strong.textContent = formatCount(value);
  const span = document.createElement('span');
  span.textContent = label;
  els['detail-stat'].replaceChildren(strong, span);
}

function filterDescription(filters) {
  const category = filters.category === 'all' ? 'All incidents' : filters.category;
  const times = [];
  if (filters.daypart !== 'all') times.push(filters.daypart);
  if (filters.day !== 'all') times.push(els['day-filter'].selectedOptions[0].textContent);
  if (filters.season !== 'all') times.push(els['season-filter'].selectedOptions[0].textContent.split(' · ')[0]);
  return { category, time: `${filters.year} · ${times.length ? times.join(' · ') : 'All dates and hours'}` };
}

function updateSummary(data, filters) {
  const { category, time } = filterDescription(filters);
  const selected = state.selectedTract;
  const count = selected ? data.counts.get(selected) || 0 : data.total;
  const feature = selected ? state.features.get(selected) : null;
  const label = feature ? tractLabel(feature) : 'Philadelphia';
  els['summary-count'].textContent = formatCount(count);
  els['summary-count-note'].textContent = selected ? `In this tract in ${filters.year}` : `Across 408 mapped tracts in ${filters.year}`;
  els['summary-area'].textContent = label;
  els['summary-area-note'].textContent = selected ? `ACS residents: ${formatCount(feature.properties.population || 0)}` : '408 census tracts';
  els['summary-filter'].textContent = category;
  els['summary-filter-note'].textContent = time;
  els['map-title'].textContent = selected ? `${label} in city context` : 'Reports by census tract';
  els['detail-title'].textContent = selected ? label : 'Citywide view';
  els['back-to-city'].hidden = !selected;
  els['tract-select'].value = selected || '';

  if (selected) {
    const cityShare = data.total ? 100 * count / data.total : 0;
    els['detail-description'].textContent = `${percentFormat.format(cityShare)}% of mapped city reports matching these filters are in this tract. The citywide total is ${formatCount(data.total)}.`;
    makeStat(count, `matching reports in this tract in ${filters.year}`);
  } else {
    els['detail-description'].textContent = 'Select a tract to compare its pattern with Philadelphia and inspect its most reported blocks.';
    makeStat(data.total, `mapped reports in ${filters.year}`);
  }
}

function fiveYearCounts(filters) {
  const counts = Array(state.metadata.years.length).fill(0);
  const view = state.trendView;
  const size = state.trendMeta.record_bytes;
  const tractIndex = state.selectedTract ? state.trendTractIndex.get(state.selectedTract) : null;
  const categoryIndex = filters.category === 'all' ? null : state.trendCategoryIndex.get(filters.category);
  for (let offset = 0; offset < view.byteLength; offset += size) {
    if (tractIndex !== null && view.getUint16(offset + 1, true) !== tractIndex) continue;
    if (categoryIndex !== null && view.getUint8(offset + 3) !== categoryIndex) continue;
    const month = view.getUint8(offset + 4);
    const weekday = view.getUint8(offset + 5);
    const hour = view.getUint8(offset + 6);
    if (filters.season !== 'all' && !seasons[filters.season].includes(month)) continue;
    if (filters.day === 'weekdays' && weekday > 4) continue;
    if (filters.day === 'weekends' && weekday < 5) continue;
    if (filters.day !== 'all' && !['weekdays', 'weekends'].includes(filters.day) && weekday !== Number(filters.day)) continue;
    if (filters.daypart !== 'all') {
      const [start, end] = dayparts[filters.daypart];
      if (hour < start || hour >= end) continue;
    }
    counts[view.getUint8(offset)] += 1;
  }
  return counts;
}

function renderTrend(filters) {
  const counts = fiveYearCounts(filters);
  const maximum = Math.max(1, ...counts);
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const makeSvgElement = (name, attributes) => {
    const element = document.createElementNS(svgNamespace, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };
  const svg = makeSvgElement('svg', { 'viewBox': '0 0 400 142', 'aria-hidden': 'true' });
  const points = counts.map((count, index) => ({
    x: 35 + index * 82.5,
    y: 29 + (1 - count / maximum) * 76,
  }));
  svg.append(
    makeSvgElement('line', { class: 'trend-guide', x1: 35, x2: 365, y1: 67, y2: 67 }),
    makeSvgElement('line', { class: 'trend-axis', x1: 35, x2: 365, y1: 105, y2: 105 }),
    makeSvgElement('polyline', {
      class: 'trend-line',
      points: points.map(({ x, y }) => `${x},${y}`).join(' '),
    }),
  );
  points.forEach(({ x, y }, index) => {
    const year = state.metadata.years[index];
    const selected = year === filters.year;
    const marker = makeSvgElement('circle', {
      class: selected ? 'trend-point active' : 'trend-point',
      cx: x,
      cy: y,
      r: selected ? 6 : 4,
    });
    const tooltip = makeSvgElement('title', {});
    tooltip.textContent = `${year}: ${formatCount(counts[index])} matching reports`;
    marker.append(tooltip);
    const value = makeSvgElement('text', {
      class: selected ? 'trend-value active' : 'trend-value',
      x,
      y: y - 12,
    });
    value.textContent = compactFormat.format(counts[index]);
    const label = makeSvgElement('text', {
      class: selected ? 'trend-year active' : 'trend-year',
      x,
      y: 132,
    });
    label.textContent = String(year);
    svg.append(marker, value, label);
  });
  els['trend-chart'].replaceChildren(svg);
  els['trend-chart'].setAttribute('aria-label', `Annual matching reports: ${state.metadata.years.map((year, index) => `${year}: ${formatCount(counts[index])}`).join('; ')}.`);
  const first = counts[0];
  const last = counts[counts.length - 1];
  const difference = last - first;
  if (first === 0) {
    if (counts.every((count) => count === 0)) {
      els['trend-summary'].textContent = 'No reports match these filters in any year.';
    } else if (last === 0) {
      els['trend-summary'].textContent = '2021 and 2025 have no matching reports; see the intermediate years above.';
    } else {
      els['trend-summary'].textContent = `2025 has ${formatCount(last)} matching reports; 2021 has none.`;
    }
  } else if (difference === 0) {
    els['trend-summary'].textContent = `2021 and 2025 each have ${formatCount(first)} matching reports.`;
  } else {
    const direction = difference > 0 ? 'more' : 'fewer';
    const percent = ` (${percentFormat.format(Math.abs(100 * difference / first))}%)`;
    els['trend-summary'].textContent = `2025 has ${formatCount(Math.abs(difference))} ${direction} reports than 2021${percent}.`;
  }
}

function renderBarChart(element, values, labels, selectedIndex) {
  const maximum = Math.max(0, ...values);
  const bars = values.map((count, index) => {
    const bar = document.createElement('div');
    bar.className = element === els['hour-chart'] ? 'hour-bar' : element === els['weekday-chart'] ? 'weekday-bar' : 'season-bar';
    bar.title = `${labels[index]}: ${formatCount(count)} reports`;
    const fill = document.createElement('span');
    fill.className = 'bar-fill';
    if (selectedIndex !== null && selectedIndex !== index) fill.classList.add('dimmed');
    if (selectedIndex === index || (selectedIndex === null && count === maximum && maximum > 0)) fill.classList.add('selected');
    fill.style.height = `${maximum ? Math.max(2, 100 * count / maximum) : 2}%`;
    bar.append(fill);
    if (element !== els['hour-chart'] || index % 4 === 0) {
      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = element === els['weekday-chart'] ? shortWeekdays[index] : element === els['season-chart'] ? seasonNames[index] : String(index).padStart(2, '0');
      bar.append(label);
    }
    return bar;
  });
  element.replaceChildren(...bars);
  element.setAttribute('aria-label', labels.map((label, index) => `${label}: ${formatCount(values[index])}`).join('; '));
}

function renderTimeCharts(data, filters) {
  let selectedHour = null;
  if (filters.daypart !== 'all') selectedHour = -1;
  renderBarChart(els['hour-chart'], data.hourCounts, Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`), selectedHour);
  if (filters.daypart !== 'all') {
    const [start, end] = dayparts[filters.daypart];
    for (const bar of els['hour-chart'].children) {
      const hour = Array.prototype.indexOf.call(els['hour-chart'].children, bar);
      bar.firstChild.classList.toggle('dimmed', hour < start || hour >= end);
      bar.firstChild.classList.toggle('selected', hour >= start && hour < end);
    }
  }
  const peak = Math.max(...data.hourCounts);
  const peakHour = data.hourCounts.indexOf(peak);
  els['hour-summary'].textContent = peak > 0 ? `Across all hours, most reports were around ${String(peakHour).padStart(2, '0')}:00 (${formatCount(peak)} reports).` : 'No matching reports for these filters.';
  const selectedDay = /^\d$/.test(filters.day) ? Number(filters.day) : null;
  renderBarChart(els['weekday-chart'], data.weekdayCounts, weekdays, selectedDay);
  if (filters.day === 'weekdays' || filters.day === 'weekends') {
    [...els['weekday-chart'].children].forEach((bar, index) => {
      const active = filters.day === 'weekdays' ? index < 5 : index > 4;
      bar.firstChild.classList.toggle('dimmed', !active);
      bar.firstChild.classList.toggle('selected', active);
    });
  }
  const selectedSeason = filters.season === 'all' ? null : seasonNames.findIndex((name) => name.toLowerCase() === filters.season);
  renderBarChart(els['season-chart'], data.seasonCounts, seasonNames, selectedSeason);
}

function renderTypes(data, filters) {
  const areaTotal = [...data.types.values()].reduce((sum, value) => sum + value, 0);
  const cityTotal = [...data.cityTypes.values()].reduce((sum, value) => sum + value, 0);
  const top = [...data.types.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (filters.category !== 'all' && !top.some(([category]) => category === filters.category)) {
    top.push([filters.category, data.types.get(filters.category) || 0]);
  }
  if (!areaTotal) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No reports match these time filters in this area.';
    els['type-chart'].replaceChildren(empty);
    return;
  }
  const rows = top.map(([category, count]) => {
    const share = 100 * count / areaTotal;
    const row = document.createElement('div');
    row.className = 'type-row';
    if (category === filters.category) row.classList.add('highlight');
    const heading = document.createElement('div');
    heading.className = 'type-row-heading';
    const name = document.createElement('strong');
    name.textContent = category;
    const value = document.createElement('span');
    value.textContent = `${percentFormat.format(share)}%`;
    heading.append(name, value);
    const track = document.createElement('div');
    track.className = 'type-track';
    const fill = document.createElement('span');
    fill.style.width = `${share}%`;
    track.append(fill);
    row.append(heading, track);
    if (state.selectedTract) {
      const cityShare = cityTotal ? 100 * (data.cityTypes.get(category) || 0) / cityTotal : 0;
      const comparison = document.createElement('span');
      comparison.className = 'type-city';
      comparison.textContent = `City ${percentFormat.format(cityShare)}% · ${formatCount(count)} tract reports`;
      row.append(comparison);
    }
    return row;
  });
  els['type-chart'].replaceChildren(...rows);
}

function makePlaceButton(rank, label, count, onClick) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'place-button';
  const rankEl = document.createElement('span');
  rankEl.className = 'place-rank';
  rankEl.textContent = String(rank).padStart(2, '0');
  const nameEl = document.createElement('span');
  nameEl.className = 'place-name';
  nameEl.textContent = label;
  const countEl = document.createElement('span');
  countEl.className = 'place-count';
  countEl.textContent = formatCount(count);
  button.append(rankEl, nameEl, countEl);
  button.addEventListener('click', onClick);
  item.append(button);
  return item;
}

function renderBlockPoints(blocks) {
  state.pointLayer.clearLayers();
  if (!state.selectedTract) return;
  for (const [name, block] of blocks) {
    const marker = L.circleMarker([block.lat / block.count, block.lng / block.count], {
      radius: Math.min(12, 3 + Math.sqrt(block.count)),
      color: '#fff',
      weight: 1.5,
      fillColor: '#d18b45',
      fillOpacity: 0.84,
    });
    const popup = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = name;
    const count = document.createElement('span');
    count.textContent = `${formatCount(block.count)} matching reports`;
    popup.append(title, count);
    marker.bindPopup(popup);
    marker.addTo(state.pointLayer);
    block.marker = marker;
  }
}

function renderPlaces(data) {
  if (!state.selectedTract) {
    els['places-title'].textContent = 'Where to look closer';
    els['places-label'].textContent = 'TOP TRACTS';
    els['places-caption'].textContent = 'Tracts with the most reports under the current filters. Counts are not adjusted for resident population or visitors.';
    const items = [...data.counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([geoid, count], index) =>
      makePlaceButton(index + 1, tractLabel(state.features.get(geoid)), count, () => selectTract(geoid)));
    if (items.length) els['places-list'].replaceChildren(...items);
    else els['places-list'].replaceChildren(emptyListItem('No reports match these filters.'));
    state.pointLayer.clearLayers();
    return;
  }
  els['places-title'].textContent = 'Blocks to inspect';
  els['places-label'].textContent = 'TOP BLOCKS';
  els['places-caption'].textContent = 'Approximate reported blocks in this tract. Click a row to locate it on the map.';
  renderBlockPoints(data.blocks);
  const items = [...data.blocks.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([name, block], index) =>
    makePlaceButton(index + 1, name, block.count, () => {
      state.map.setView([block.lat / block.count, block.lng / block.count], Math.max(state.map.getZoom(), 15));
      block.marker.openPopup();
    }));
  if (items.length) els['places-list'].replaceChildren(...items);
  else els['places-list'].replaceChildren(emptyListItem('No reports match these filters in this tract.'));
}

function emptyListItem(message) {
  const item = document.createElement('li');
  item.className = 'empty-state';
  item.textContent = message;
  return item;
}

function render() {
  if (state.loading || !state.currentYear) return;
  const filters = getFilters();
  const data = filteredData(filters);
  drawMap(data.counts);
  updateSummary(data, filters);
  renderTrend(filters);
  renderTimeCharts(data, filters);
  renderTypes(data, filters);
  renderPlaces(data);
}

function selectTract(geoid) {
  if (geoid && !state.features.has(geoid)) return;
  state.selectedTract = geoid || null;
  render();
  if (geoid) {
    state.map.fitBounds(state.tractLayers.get(geoid).getBounds(), { padding: [35, 35], maxZoom: 14 });
  } else {
    state.map.fitBounds(state.cityBounds, { padding: [15, 15] });
  }
}

function setupMap(geojson) {
  state.map = L.map('map', { scrollWheelZoom: false, preferCanvas: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(state.map);
  state.geoLayer = L.geoJSON(geojson, {
    style: (feature) => mapStyle(feature, new Map(), 0),
    onEachFeature: (feature, layer) => {
      const geoid = feature.properties.GEOID;
      state.features.set(geoid, feature);
      state.tractLayers.set(geoid, layer);
      layer.on('click', () => selectTract(geoid));
    },
  }).addTo(state.map);
  state.pointLayer = L.layerGroup().addTo(state.map);
  state.cityBounds = state.geoLayer.getBounds();
  state.map.fitBounds(state.cityBounds, { padding: [15, 15] });
}

function setupControls(metadata) {
  const categories = metadata.trend.categories;
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    els['category-filter'].append(option);
  }
  if (metadata.years.join(',') !== '2021,2022,2023,2024,2025') {
    throw new Error('The year choices do not match the processed data.');
  }
  els['year-filter'].value = String(metadata.default_year);
  els['year-filter'].disabled = false;
  els['category-filter'].disabled = false;
  const tracts = [...state.features.entries()].sort((a, b) => tractLabel(a[1]).localeCompare(tractLabel(b[1]), undefined, { numeric: true }));
  for (const [geoid, feature] of tracts) {
    const option = document.createElement('option');
    option.value = geoid;
    option.textContent = tractLabel(feature);
    els['tract-select'].append(option);
  }
  els['tract-select'].disabled = false;
  els.filters.addEventListener('change', (event) => {
    if (event.target === els['year-filter']) loadYear(Number(event.target.value));
    else render();
  });
  els.filters.addEventListener('reset', () => window.setTimeout(() => {
    const year = Number(els['year-filter'].value);
    if (year !== state.currentYear) loadYear(year);
    else {
      state.loadRequest += 1;
      state.loading = false;
      render();
    }
  }, 0));
  els['tract-select'].addEventListener('change', (event) => selectTract(event.target.value));
  els['back-to-city'].addEventListener('click', () => selectTract(null));
}

async function fetchFile(path, type) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
  if (type === 'json') return response.json();
  if (type === 'binary') return response.arrayBuffer();
  return response.text();
}

async function loadYear(year) {
  const request = ++state.loadRequest;
  state.loading = true;
  els['data-status'].textContent = `Loading ${year} reports…`;
  els['data-status'].classList.remove('ready', 'error');
  try {
    const csv = await fetchFile(`data/incidents_${year}.csv`, 'text');
    if (request !== state.loadRequest) return;
    const events = parseEvents(csv);
    if (events.length !== state.metadata.quality_by_year[String(year)].tract_assigned_rows) {
      throw new Error(`${year} report count does not match the data metadata.`);
    }
    state.events = events;
    state.currentYear = year;
    state.loading = false;
    render();
    els['data-status'].textContent = `${formatCount(events.length)} mapped ${year} reports loaded. The five-year trend follows your other filters.`;
    els['data-status'].classList.add('ready');
  } catch (error) {
    if (request !== state.loadRequest) return;
    state.loading = false;
    els['year-filter'].value = String(state.currentYear);
    render();
    els['data-status'].textContent = `Could not load ${year} reports: ${error.message}`;
    els['data-status'].classList.add('error');
    console.error(error);
  }
}

async function start() {
  try {
    if (typeof L === 'undefined') throw new Error('The map library did not load. Check your connection and reload.');
    const [geojson, metadata, trendBuffer, csv] = await Promise.all([
      fetchFile('data/tracts.geojson', 'json'),
      fetchFile('data/metadata.json', 'json'),
      fetchFile('data/trend_2021_2025.bin', 'binary'),
      fetchFile('data/incidents_2025.csv', 'text'),
    ]);
    if (trendBuffer.byteLength !== metadata.trend.record_count * metadata.trend.record_bytes) {
      throw new Error('The five-year trend file does not match its metadata.');
    }
    state.metadata = metadata;
    state.trendMeta = metadata.trend;
    state.trendView = new DataView(trendBuffer);
    state.trendCategoryIndex = new Map(metadata.trend.categories.map((category, index) => [category, index]));
    state.trendTractIndex = new Map(metadata.trend.tract_geoids.map((geoid, index) => [geoid, index]));
    setupMap(geojson);
    state.events = parseEvents(csv);
    if (state.events.length !== metadata.quality_by_year['2025'].tract_assigned_rows) {
      throw new Error('The 2025 report count does not match the data metadata.');
    }
    state.currentYear = metadata.default_year;
    setupControls(metadata);
    render();
    els['data-status'].textContent = `${formatCount(state.events.length)} mapped 2025 reports loaded. The five-year trend follows your other filters.`;
    els['data-status'].classList.add('ready');
  } catch (error) {
    els['data-status'].textContent = `Data could not load: ${error.message} Run this page through a local web server and try again.`;
    els['data-status'].classList.add('error');
    console.error(error);
  }
}

start();
