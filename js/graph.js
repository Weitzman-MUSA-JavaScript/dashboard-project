let d3Ref = null;
let aggregateStationData = null;

const stationKeys = [
  { key: 'bus_station', label: 'Bus stops' },
  { key: 'metro_station', label: 'Metro stations' },
  { key: 'trolley_station', label: 'Trolley stops' },
];

const DEFAULT_SELECTOR = '#station-chart';

function ensureD3() {
  if (!d3Ref) {
    d3Ref = window.d3;
  }
  return d3Ref;
}

function cleanTractName(raw) {
  if (!raw || typeof raw !== 'string') return 'Selected tract';
  return raw.replace(/[;\s]+$/g, '').trim() || 'Selected tract';
}

function buildStationDataFromFeature(feature) {
  const props = (feature && feature.properties) || {};
  return stationKeys.map(({ key, label }) => ({
    key,
    label,
    value: Number(props[key]) || 0,
  }));
}

function computeAggregateStationData(features) {
  const d3 = ensureD3();
  if (!d3) return null;
  return stationKeys.map(({ key, label }) => ({
    key,
    label,
    value: d3.sum(features, (f) => Number(f?.properties?.[key]) || 0),
  }));
}

function renderStationChart(selector, data, title) {
  const d3 = ensureD3();
  if (!d3) return;
  const container = d3.select(selector || DEFAULT_SELECTOR);
  if (container.empty()) return;
  container.html('');
  container.append('h3').text(title || 'Transit station availability');

  const bbox = container.node().getBoundingClientRect();
  const width = Math.max(240, Math.floor(bbox.width || 280));
  const height = 240;
  const margin = { top: 28, right: 16, bottom: 48, left: 48 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = container
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, innerWidth])
    .padding(0.28);

  const maxValue = d3.max(data, (d) => d.value) || 1;
  const y = d3.scaleLinear().domain([0, maxValue]).nice().range([innerHeight, 0]);

  const palette = ['#32f198ff', '#5e60ce', '#9a1481ff'];
  const color = d3.scaleOrdinal().domain(data.map((d) => d.key)).range(palette);

  g
    .selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d) => x(d.label))
    .attr('y', (d) => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', (d) => innerHeight - y(d.value))
    .attr('rx', 8)
    .attr('ry', 8)
    .attr('fill', (d) => color(d.key));

  g
    .selectAll('text.station-value')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'station-value')
    .attr('x', (d) => x(d.label) + x.bandwidth() / 2)
    .attr('y', (d) => Math.min(y(d.value) - 6, innerHeight - 6))
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#1f1f1f')
    .text((d) => d.value.toLocaleString());

  const xAxis = d3.axisBottom(x);
  g
    .append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '12px');

  const yAxis = d3
    .axisLeft(y)
    .ticks(4)
    .tickFormat((v) => `${Math.round(v)}`);
  g
    .append('g')
    .call(yAxis)
    .selectAll('text')
    .style('font-size', '11px');

  g.selectAll('.domain, .tick line').attr('stroke', '#e4e4e7');
}

export function initStationChart(options = {}) {
  const geojsonUrl = options.geojsonUrl || 'data/phila_transit_index.geojson';
  if (!ensureD3()) {
    console.warn('D3 not available for station chart.');
    return Promise.resolve();
  }

  return fetch(geojsonUrl)
    .then((resp) => resp.json())
    .then((geo) => {
      const features = geo.features || [];
      aggregateStationData = computeAggregateStationData(features);
      if (aggregateStationData) {
        renderStationChart(DEFAULT_SELECTOR, aggregateStationData, 'Citywide station counts');
      }
    })
    .catch((err) => {
      console.error('Failed to load geojson for station chart:', err);
    });
}

export function updateStationChart(feature) {
  if (!ensureD3()) return;
  if (!feature) {
    if (aggregateStationData) {
      renderStationChart(DEFAULT_SELECTOR, aggregateStationData, 'Citywide station counts');
    }
    return;
  }

  const props = feature.properties || {};
  const tractName = cleanTractName(props.NAME || props.Name || props.name);
  const data = buildStationDataFromFeature(feature);
  renderStationChart(DEFAULT_SELECTOR, data, `${tractName} — station counts`);
}

export const __stationChartInternals = {
  buildStationDataFromFeature,
  computeAggregateStationData,
  renderStationChart,
};
