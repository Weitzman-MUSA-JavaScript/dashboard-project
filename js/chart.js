// Charts module using D3 (expects global `d3` from the CDN script in index.html)
// Exports initCharts(options) which fetches the GeoJSON and renders two horizontal

// bar charts side-by-side in the sidebar: travel time distribution and travel mode.

// module-level d3 reference (set in initCharts)
let d3;

// module-level cached aggregated data so updateCharts can reset to overall view
let aggTimeData = null;
let aggModeData = null;
let aggIndexValue = null;

const gaugeRange = { min: 0, max: 100 };

const timeKeys = [
  'less_than_15_minutes',
  'between_15_and_30_minutes',
  'between_30_and_45_minutes',
  'between_45_and_60_minutes',
  'more_than_90_minutes',
];

const modeKeys = ['drive', 'carpool', 'public_transit', 'WFH', 'active_transport'];

function initCharts(options = {}) {
  const geojsonUrl = options.geojsonUrl || 'data/phila_transit_index.geojson';

  if (typeof window.d3 === 'undefined') {
    console.warn('D3 not found. Please include the D3 CDN script in index.html');
    return;
  }
  d3 = window.d3;

  fetch(geojsonUrl)
    .then((r) => r.json())
    .then((geo) => {
      const features = geo.features || [];
      const totalPop = d3.sum(features, (f) => Number(f.properties.total) || 0) || 0;

      // Aggregate as population-weighted percentages
      function aggregate(keys) {
        return keys.map((k) => {
          const weighted = d3.sum(features, (f) => {
            const val = Number(f.properties[k]) || 0; // value is percent units
            const pop = Number(f.properties.total) || 0;
            return val * pop;
          });
          const pct = totalPop > 0 ? weighted / totalPop : 0; // percent units
          return { key: k, value: pct };
        });
      }

      aggTimeData = aggregate(timeKeys);
      aggModeData = aggregate(modeKeys);

      const weightedIndexSum = d3.sum(features, (f) => {
        const props = f.properties || {};
        const pop = Number(props.total) || 0;
        const idx = Number(props.index);
        if (!Number.isFinite(idx) || pop <= 0) return 0;
        return idx * pop;
      });
      aggIndexValue = totalPop > 0 ? weightedIndexSum / totalPop : null;

      // initial render: overall aggregated view
      renderBar('#chart-time', aggTimeData, 'Travel Time (%)');
      renderBar('#chart-mode', aggModeData, 'Travel Mode (%)');
      renderGauge('#chart-index', aggIndexValue, 'Citywide Transit Index Score');
    })
    .catch((err) => {
      console.error('Failed to load geojson for charts:', err);
    });
}

export function updateCharts(feature) {
  // feature may be a GeoJSON Feature object; if falsy, reset to aggregated
  if (!d3) {
    d3 = window.d3;
    if (!d3) return;
  }

  if (!feature) {
    if (aggTimeData && aggModeData) {
      renderBar('#chart-time', aggTimeData, 'Travel Time (%)');
      renderBar('#chart-mode', aggModeData, 'Travel Mode (%)');
    }
    renderGauge('#chart-index', aggIndexValue, 'Citywide Transit Index Score');
    return;
  }

  const props = feature.properties || {};
  const tractName = props.NAME || props.Name || props.name || 'Tract';

  const timeData = timeKeys.map((k) => ({ key: k, value: Number(props[k]) || 0 }));
  const modeData = modeKeys.map((k) => ({ key: k, value: Number(props[k]) || 0 }));
  const tractIndex = Number(props.index);

  renderBar('#chart-time', timeData, `${tractName} — Travel Time (%)`);
  renderBar('#chart-mode', modeData, `${tractName} — Travel Mode (%)`);
  renderGauge('#chart-index', Number.isFinite(tractIndex) ? tractIndex : null, `${tractName} — Transit Index Score`);
}

function niceLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\bbetween\b/g, 'between')
    .replace(/less than/g, 'less than')
    .replace(/more than/g, 'more than')
    .replace(/\bWFH\b/, 'Work from home')
    .replace(/public transit/, 'Public transit')
    .replace(/active transport/, 'Active transport')
    .replace(/\bdrive\b/, 'Drive')
    .replace(/\bcarpool\b/, 'Carpool');
}

function renderBar(selector, data, title) {
  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');

  container.append('h3').text(title);

  // Make sure values are in percent units (0..100). The aggregation above computed in percent units already.
  const values = data.map((d) => d.value);

  const margin = { top: 6, right: 8, bottom: 18, left: 120 };

  // measure label widths and adjust left margin so Y labels are fully visible
  try {
    const labelStrings = data.map((d) => niceLabel(d.key));
    const valueStrings = data.map((d) => `${d.value.toFixed(1)}%`);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '12px Arial';
    const maxLabelWidth = Math.max(...labelStrings.map((s) => ctx.measureText(s).width));
    const desiredLeft = Math.ceil(maxLabelWidth) + 24; // padding
    if (desiredLeft > margin.left) margin.left = desiredLeft;

    // measure value label width and adjust right margin so numbers aren't clipped
    const maxValueLabelWidth = Math.max(...valueStrings.map((s) => ctx.measureText(s).width));
    const desiredRight = Math.ceil(maxValueLabelWidth) + 18; // small padding
    if (desiredRight > margin.right) margin.right = desiredRight;
  } catch (e) {
    // ignore measurement errors and keep default margin
  }

  // measure width from container
  const bbox = container.node().getBoundingClientRect();
  const W = Math.max(220, Math.floor(bbox.width || 300));
  const H = Math.max(120, data.length * 34 + margin.top + margin.bottom);

  const svg = container
    .append('svg')
    .attr('width', '100%')
    .attr('height', H)
    .attr('viewBox', `0 0 ${W} ${H}`);

  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain([0, d3.max(values) || 1]).range([0, innerW]);
  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.key))
    .range([0, innerH])
    .padding(0.18);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // color scale for bars (one color per category)
  const palette = d3.schemeTableau10 || d3.schemeCategory10;
  const color = d3.scaleOrdinal().domain(data.map((d) => d.key)).range(palette);

  // Bars
  g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', (d) => y(d.key))
    .attr('height', y.bandwidth())
    .attr('width', (d) => Math.max(1, x(d.value)))
    .attr('fill', (d) => color(d.key));

  // Value labels at end of bar; if bar is too short, place label inside the bar with white text
  const valueLabels = g
    .selectAll('.val')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'val');

  valueLabels
    .attr('y', (d) => y(d.key) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .style('font-size', '12px')
    .text((d) => `${d.value.toFixed(1)}%`)
    .each(function(d, i, nodes) {
    // Use nodes[i] instead of `this`
      const textSel = d3.select(nodes[i]);

      const valText = `${d.value.toFixed(1)}%`;

      // compute label width
      let labelW = 24;
      try {
        const c = document.createElement('canvas');
        const ct = c.getContext('2d');
        ct.font = '12px Arial';
        labelW = ct.measureText(valText).width;
      } catch (e) {
        labelW = 24;
      }

      const barW = x(d.value);

      // Placement rule (consistent):
      // - If there is enough room to place the label to the right of the bar inside the inner width,
      //   place it outside (x = barW + padding) with dark text.
      // - Otherwise, place it inside the bar, right-aligned (x = barW - padding) with white text.
      // This avoids relying on global W/margin hacks and prevents collisions.
      const padding = 6;
      if (barW + padding + labelW <= innerW) {
      // place outside to the right
        textSel
          .attr('x', barW + padding)
          .attr('text-anchor', 'start')
          .attr('fill', '#222');
      } else {
      // place inside the bar, right-aligned. Ensure x is non-negative.
        const insideX = Math.max(4, barW - padding);
        textSel
          .attr('x', insideX)
          .attr('text-anchor', 'end')
          .attr('fill', '#fff');
      }
    });


  // Y axis labels (categories)
  const yAxisG = svg.append('g').attr('transform', `translate(${margin.left - 8},${margin.top})`);
  yAxisG
    .selectAll('text')
    .data(data)
    .enter()
    .append('text')
    .attr('x', 0)
    .attr('y', (d) => y(d.key) + y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .style('font-size', '12px')
    .text((d) => niceLabel(d.key));

  // simple x axis ticks at bottom
  const xAxis = d3.axisBottom(x).ticks(4).tickFormat((v) => `${v.toFixed(0)}%`);
  svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top + innerH})`)
    .call(xAxis)
    .selectAll('text')
    .style('font-size', '11px');
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return value;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function renderGauge(selector, rawValue, title) {
  if (!d3) {
    d3 = window.d3;
    if (!d3) return;
  }

  const container = d3.select(selector);
  if (container.empty()) return;
  container.html('');

  container.append('h3').text(title || 'Transit Index Score');

  const hasValue = Number.isFinite(rawValue);
  const clampedValue = hasValue ? clamp(rawValue, gaugeRange.min, gaugeRange.max) : gaugeRange.min;
  const displayValue = hasValue ? Math.round(clampedValue) : 'N/A';
  const ratio = hasValue
    ? (clampedValue - gaugeRange.min) / (gaugeRange.max - gaugeRange.min || 1)
    : 0;
  const pointerColor = hasValue
    ? d3.interpolateRgb('#7a001f', '#0f5132')(Math.max(0, Math.min(1, ratio)))
    : '#7a001f';

  const scoreWrap = container.append('div').attr('class', 'gauge-score');
  scoreWrap
    .append('div')
    .attr('class', 'gauge-score-value')
    .style('color', pointerColor)
    .text(displayValue);
  scoreWrap.append('div').attr('class', 'gauge-score-label').text('out of 100');

  const bbox = container.node().getBoundingClientRect();
  const width = Math.max(260, Math.floor(bbox.width || 320));
  const height = 160;
  const margin = { top: 10, right: 20, bottom: 34, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const barHeight = 28;

  const svg = container
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const defs = svg.append('defs');
  const gradientId = 'gauge-red-green-gradient';
  const gradient = defs
    .append('linearGradient')
    .attr('id', gradientId)
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');

  const stops = [
    { offset: '0%', color: '#7a001f' },
    { offset: '40%', color: '#f05d23' },
    { offset: '70%', color: '#f2d357' },
    { offset: '100%', color: '#0f5132' },
  ];

  gradient
    .selectAll('stop')
    .data(stops)
    .enter()
    .append('stop')
    .attr('offset', (d) => d.offset)
    .attr('stop-color', (d) => d.color);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top + 26})`);

  g.append('rect')
    .attr('class', 'gauge-bar')
    .attr('width', innerWidth)
    .attr('height', barHeight)
    .attr('rx', 14)
    .attr('ry', 14)
    .attr('fill', `url(#${gradientId})`);

  const x = d3
    .scaleLinear()
    .domain([gaugeRange.min, gaugeRange.max])
    .range([0, innerWidth]);

  const pointerX = x(hasValue ? clampedValue : gaugeRange.min);

  const pointer = g
    .append('g')
    .attr('class', 'gauge-pointer')
    .attr('transform', `translate(${pointerX},0)`)
    .style('opacity', hasValue ? 1 : 0.25);

  pointer
    .append('path')
    .attr('d', 'M0,-10 L-10,10 L10,10 Z')
    .attr('fill', pointerColor);

  pointer
    .append('line')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 10)
    .attr('y2', barHeight + 22)
    .attr('stroke', pointerColor)
    .attr('stroke-width', 2);

  const axis = d3
    .axisBottom(x)
    .tickValues([gaugeRange.min, 25, 50, 75, gaugeRange.max])
    .tickFormat((d) => `${d}`);

  const axisG = g
    .append('g')
    .attr('class', 'gauge-axis')
    .attr('transform', `translate(0, ${barHeight + 22})`)
    .call(axis);

  axisG.selectAll('path').attr('stroke', '#e0e0e0');
  axisG.selectAll('line').attr('stroke', '#e0e0e0');
  axisG.selectAll('text').style('font-size', '11px').attr('fill', '#555');
}

export { initCharts };
