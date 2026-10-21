import {formatValue} from './profile.js';
import {escapeHTML, htmlToElement} from './template-tools.js';
import {groupDescriptions, measureDescription} from './comparison-copy.js';

/**
 * Format display precision while keeping very small positive values distinct.
 * @param {number} value Exported number.
 * @param {Object} definition Indicator metadata.
 * @return {string} Formatted value without its unit.
 */
export function measureNumber(value, definition) {
  const isSVI = definition.domain === 'SVI';
  if (value > 0 && value < (isSVI ? 0.001 : 0.1)) {
    return value.toLocaleString('en-US', {maximumSignificantDigits: 2});
  }
  return formatValue(value, isSVI ? 3 : 1);
}

/**
 * Choose an existing R estimate for the visual; never combine observations.
 * @param {Object} row Weighted summary.
 * @param {Object} tract Typical-tract summary.
 * @param {Array} observations R-exported small-group observations.
 * @param {string} mode Selected comparison approach.
 * @return {?number} Value to draw, or null when there is no single estimate.
 */
export function overviewValue(row, tract, observations, mode) {
  if (mode === 'population') return row.value;
  if (Number.isFinite(tract?.median)) return tract.median;
  return observations.length === 1 ? observations[0].value : null;
}

/**
 * Format an R-derived comparison; never estimate group values in the browser.
 * @param {Object} row Population/denominator-weighted comparison.
 * @param {Object} tract Unweighted tract summary.
 * @param {Array} observations Individual R-exported small-group observations.
 * @param {string} mode Population or typical-tract display mode.
 * @param {Object} definition Indicator definition and unit.
 * @return {Object} Estimate and concise data-availability note.
 */
export function comparisonCell(row, tract, observations, mode, definition) {
  const isSVI = definition.domain === 'SVI';
  const format = (value) => measureNumber(value, definition);
  const suffix = isSVI ? '' : '%';
  let estimate = 'Unavailable';
  if (mode === 'population' && row.value !== null) {
    estimate = `${format(row.value)}${suffix}`;
    if (!isSVI) estimate += row.moe === null ? ' (MOE unavailable)' : ` ± ${format(row.moe)} pp`;
  } else if (mode === 'tract') {
    if (tract?.median !== null && tract?.median !== undefined) {
      estimate = `${format(tract.median)}${suffix} [${format(tract.q25)}–${format(tract.q75)}]`;
    } else if (observations.length) {
      estimate = observations.map((r) => `${format(r.value)}${suffix}`).join(', ') + (observations.length === 1 ? ' (individual tract)' : ' (individual tracts)');
    }
  }
  const n = mode === 'population' ? row.n_valid : (tract?.n_valid || 0);
  const total = mode === 'population' ? row.n_total : (tract?.n_total || 0);
  const notes = [`n = ${n}/${total}`];
  if (mode === 'population') {
    if (row.high_uncertainty) notes.push('MOE ≥ estimate');
    if (row.n_population_unavailable) notes.push('missing population weights');
  }
  return {estimate, note: notes.join('; ')};
}

/**
 * Present fixed R summaries for all four categories, highlighting the filter.
 * @param {Object} data Validated export set.
 * @return {Function} Update the active category without recomputing summaries.
 */
export function initializeCategorySummary(data) {
  const modeSelect = document.querySelector('#comparison-mode');
  const measureSelect = document.querySelector('#comparison-measure');
  let activeCategory = 'all';
  const updateHighlight = (category) => {
    activeCategory = category;
    for (const cell of document.querySelectorAll('#category-comparison [data-category]')) {
      cell.classList.toggle('active-category', cell.dataset.category === category);
    }
    const message = `${measureDescription(data.definitions.get(measureSelect.value)).label}. ${modeSelect.value === 'population' ? 'Population and household estimates' : 'Typical Census tract'}.${data.metadata.transition_groups.includes(category) ? ` ${category} highlighted.` : ''}`;
    const status = document.querySelector('#comparison-status');
    if (status.textContent !== message) status.textContent = message;
  };
  for (const domain of [...new Set(data.metadata.indicators.map((d) => d.domain))]) {
    const optionGroup = htmlToElement(`<optgroup label="${escapeHTML(domain === 'SVI' ? 'Social Vulnerability Index (SVI)' : domain)}"></optgroup>`);
    for (const definition of data.metadata.indicators.filter((d) => d.domain === domain)) {
      const option = htmlToElement(`<option value="${escapeHTML(definition.id)}"${definition.id === 'poverty' ? ' selected' : ''}>${escapeHTML(measureDescription(definition).label)}</option>`);
      optionGroup.append(option);
    }
    measureSelect.append(optionGroup);
  }
  const renderOverview = () => {
    const definition = data.definitions.get(measureSelect.value);
    const isSVI = definition.domain === 'SVI';
    const copy = measureDescription(definition);
    document.querySelector('#measure-title').textContent = copy.label;
    document.querySelector('#measure-description').textContent = `${copy.description} Source: ${isSVI ? 'SVI 2022, based on 2018–2022 Census estimates.' : 'American Community Survey, 2020–2024.'}`;
    document.querySelector('#comparison-reading-guide').textContent = isSVI ?
      `${modeSelect.value === 'population' ? 'Population-weighted mean tract ranks' : 'Typical-tract ranks'}, 0–1. Higher means higher relative social vulnerability, not a percentage of vulnerable residents or a firearm-violence score.` :
      `${modeSelect.value === 'population' ? 'Estimated percentages for each group.' : 'Typical-tract percentages; each tract has equal weight.'} All bars use the same 0–100% scale.`;
    const list = document.createDocumentFragment();
    for (const group of data.metadata.transition_groups) {
      const weighted = data.populationGroups.get(`${group}:${definition.id}`);
      const profile = data.categoryProfiles.get(group);
      const tract = data.comparisons.groups.find((r) => r.transition === group && r.indicator === definition.id);
      const observations = data.comparisons.observations.filter((r) => r.transition === group && r.indicator === definition.id);
      const value = overviewValue(weighted, tract, observations, modeSelect.value);
      const cell = comparisonCell(weighted, tract, observations, modeSelect.value, definition);
      const n = modeSelect.value === 'population' ? weighted.n_valid : (tract?.n_valid || 0);
      const estimate = Number.isFinite(value) ? `${measureNumber(value, definition)}${isSVI ? ' / 1' : '%'}` : cell.estimate;
      const uncertainty = modeSelect.value === 'population' && !isSVI && weighted.value !== null ?
        (weighted.moe === null ? 'Margin of error unavailable.' : `Approximate margin of error: ±${measureNumber(weighted.moe, definition)} percentage points (90%).`) :
        (modeSelect.value === 'tract' && Number.isFinite(tract?.median) ? `Middle half of tract values: ${measureNumber(tract.q25, definition)}–${measureNumber(tract.q75, definition)}${isSVI ? '' : '%'}. This shows variation, not a confidence interval.` : '');
      const item = htmlToElement(`<li class="comparison-item" data-category="${escapeHTML(group)}">
        <div><strong>${escapeHTML(group)}</strong><span class="comparison-note">${escapeHTML(groupDescriptions[group])}</span>
          <span class="comparison-note">${profile.n_tracts} ${profile.n_tracts === 1 ? 'Census tract' : 'Census tracts'} · ${escapeHTML(formatValue(profile.total_population, 0))} estimated residents</span></div>
        <div><strong class="comparison-estimate">${escapeHTML(estimate)}</strong>
          <div class="comparison-track" aria-hidden="true"><span class="comparison-bar"></span></div>
          <div class="comparison-axis" aria-hidden="true"><span>${isSVI ? '0' : '0%'}</span><span>${isSVI ? '1' : '100%'}</span></div>
          ${uncertainty ? `<p class="comparison-note">${escapeHTML(uncertainty)}</p>` : ''}
          ${modeSelect.value === 'population' && weighted.high_uncertainty ? '<p class="comparison-caution">Interpret with care: the margin of error is at least as large as the estimate.</p>' : ''}
          ${n > 0 && n < 5 ? `<p>${n === 1 ? '* One tract only; interpret with care.' : '* Fewer than five measured tracts; interpret with care.'}</p>` : ''}
          <details class="comparison-data-note"><summary>Data availability${weighted.n_missing ? ` (${weighted.n_valid} of ${weighted.n_total} tracts)` : ''}</summary><p>${escapeHTML(cell.note)}</p></details>
        </div>
      </li>`);
      const track = item.querySelector('.comparison-track');
      track.hidden = !Number.isFinite(value);
      item.querySelector('.comparison-axis').hidden = !Number.isFinite(value);
      if (Number.isFinite(value)) item.querySelector('.comparison-bar').style.width = `${isSVI ? value * 100 : value}%`;
      if (n > 0 && n < 5) track.classList.add('small-group-track');
      list.append(item);
    }
    document.querySelector('#comparison-overview').replaceChildren(list);
    updateHighlight(activeCategory);
  };
  const render = () => {
    const head = document.querySelector('#comparison-head');
    const header = htmlToElement('<tr><th scope="col">Measure</th></tr>');
    for (const group of data.metadata.transition_groups) {
      const profile = data.categoryProfiles.get(group);
      header.append(htmlToElement(`<th scope="col" data-category="${escapeHTML(group)}">
        ${escapeHTML(group)}<span class="comparison-note">${profile.n_tracts} tracts; estimated population ${escapeHTML(formatValue(profile.total_population, 0))}</span>
      </th>`));
    }
    head.replaceChildren(header);
    const body = document.createDocumentFragment();
    for (const definition of data.metadata.indicators) {
      const isSVI = definition.domain === 'SVI';
      const row = htmlToElement(`<tr><th scope="row">${escapeHTML(definition.label)}
        <span class="comparison-note">${escapeHTML(isSVI ? 'National tract ranks (0–1)' : definition.universe)}</span>
      </th></tr>`);
      for (const group of data.metadata.transition_groups) {
        const weighted = data.populationGroups.get(`${group}:${definition.id}`);
        const tract = data.comparisons.groups.find((r) => r.transition === group && r.indicator === definition.id);
        const observations = data.comparisons.observations.filter((r) => r.transition === group && r.indicator === definition.id);
        const cell = comparisonCell(weighted, tract, observations, modeSelect.value, definition);
        row.append(htmlToElement(`<td data-category="${escapeHTML(group)}">
          ${escapeHTML(cell.estimate)}<span class="comparison-note">${escapeHTML(cell.note)}</span>
        </td>`));
      }
      body.append(row);
    }
    document.querySelector('#comparison-rows').replaceChildren(body);
    document.querySelector('#comparison-method').textContent = modeSelect.value === 'population' ?
      'ACS pooled percentages use each measure’s population or household denominator. SVI uses population-weighted mean tract ranks, not official group percentiles.' :
      'Each tract has equal weight. The median is the middle value; the middle 50% shows variation, not confidence intervals. Small groups show individual observations.';
    renderOverview();
  };
  modeSelect.disabled = false;
  measureSelect.disabled = false;
  modeSelect.addEventListener('change', render);
  measureSelect.addEventListener('change', renderOverview);
  render();
  return updateHighlight;
}
