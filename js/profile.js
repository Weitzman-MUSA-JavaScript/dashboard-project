export function formatValue(value, digits = 1) {
  return Number.isFinite(value) ? value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
  }) : 'Unavailable';
}

export function profileRows(properties, poverty, svi) {
  return [
    ['Burden transition', properties.transition],
    ['2020–2022 victim count', formatValue(properties.early_count, 0)],
    ['2020–2022 annualized rate', formatValue(properties.early_rate)],
    ['2023–2025 victim count', formatValue(properties.late_count, 0)],
    ['2023–2025 annualized rate', formatValue(properties.late_rate)],
    ['Absolute count change', formatValue(properties.absolute_count_change, 0)],
    ['Absolute rate change', formatValue(properties.absolute_rate_change_10k)],
    ['Fixed ACS population', formatValue(properties.total_pop, 0)],
    ['Below poverty threshold (ACS 2020–2024)',
      poverty?.value == null ? 'Unavailable' : `${formatValue(poverty.value)}% ± ${formatValue(poverty.moe)} percentage points (90% MOE)`],
    ['Overall SVI (2022 national rank, 0–1)', formatValue(svi?.value, 3)],
    ['Quality notes', [
      properties.rate_exclusion_reason,
      properties.low_population_flag ? 'Small residential population' : null,
      properties.low_count_flag ? 'Low shooting count' : null,
      poverty?.high_uncertainty ? 'Poverty MOE is at least as large as the estimate' : null,
    ].filter(Boolean).join('; ') || 'No selected flags; estimates still have uncertainty.'],
  ];
}

export function renderProfile(properties, data) {
  document.querySelector('#profile-title').textContent =
    `Tract ${properties.tract_name} (${properties.tract_geoid})`;
  const rows = profileRows(properties,
    data.records.get(`${properties.tract_geoid}:poverty`),
    data.records.get(`${properties.tract_geoid}:svi_overall`));
  const fragment = document.createDocumentFragment();
  for (const [label, value] of rows) {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    fragment.append(term, description);
  }
  document.querySelector('#profile-details').replaceChildren(fragment);
}
