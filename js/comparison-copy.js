// interface wording only; definitions and all estimates come from the R exports
export const groupDescriptions = {
  'Persistently elevated': 'At or above the injury-rate benchmark in both periods',
  'Previously elevated': 'At or above the benchmark earlier; below it later',
  'Newly elevated': 'Below the benchmark earlier; at or above it later',
  'Consistently below': 'Below the benchmark in both periods',
};

const measureCopy = {
  poverty: ['People living below the poverty threshold', 'Share below the Census poverty threshold, among people with known poverty status.'],
  unemployment: ['Unemployment', 'Share unemployed among the civilian labor force, age 16 and older.'],
  no_high_school: ['Adults without a high school diploma or equivalent', 'Estimated share of adults age 25 and older without a high school diploma or equivalent.'],
  rent_burden: ['Households spending at least 30% of income on rent', 'Share of cash-rent households spending at least 30% of income on gross rent, among households with a known ratio.'],
  no_vehicle: ['Households without a vehicle', 'Estimated share of households with no vehicle available.'],
  under_18: ['Children and teenagers under 18', 'Estimated share of residents younger than 18.'],
  age_65_plus: ['Residents age 65 and older', 'Estimated share of residents age 65 and older.'],
  svi_overall: ['Social Vulnerability Index: overall', 'A summary of social conditions that can affect communities during disasters and emergencies.'],
  svi_socioeconomic: ['SVI: socioeconomic conditions', 'The SVI theme describing socioeconomic conditions.'],
  svi_household: ['SVI: household characteristics', 'The SVI theme describing household characteristics.'],
  svi_minority: ['SVI: racial and ethnic minority status', 'The SVI theme describing racial and ethnic minority composition.'],
  svi_housing_transport: ['SVI: housing and transportation', 'The SVI theme describing housing type and transportation.'],
};

/**
 * Supply short interface wording without changing an indicator's definition.
 * @param {Object} definition R-exported indicator metadata.
 * @return {Object} Display label and description.
 */
export function measureDescription(definition) {
  const [label, description] = measureCopy[definition.id] ||
    [definition.label, `Estimated share of residents: ${definition.label}.`];
  return {label, description};
}
