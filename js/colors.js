// deciding colors for community areas - for both the map and the chart
// code and content derived from week 2 and 3 examples of using colors and building legend
// again initial code done by self and ran through Claude AI to fix and debug and decipher
// colors are derived from the city of Chicago design guidelines
// https://design.chicago.gov/2019/08/26/choosing-the-cds-color-set.html

// five color steps for licenses per 1,000 residents
// listed from highest to lowest minimum, so the first match decides the color. each range gets its color and matches with label
// week 2 and 3 examples
const DENSITY_CLASSES = [
  { min: 25, color: '#fdb81e', label: '25 or more' },
  { min: 16, color: '#f9c642', label: '16 to 25' },
  { min: 12, color: '#fad980', label: '12 to 16' },
  { min: 8, color: '#fff1d2', label: '8 to 12' },
  { min: 0, color: '#ffffff', label: 'Under 8' },
];

// six color step for location quotient.
// again using highest to lowest minimum and so the first match decides color.
// week 2 and 3 examples
const LQ_CLASSES = [
  { min: 2, color: '#fdb81e', label: 'Much Higher Concentration (over 2)' },
  { min: 1.1, color: '#f9c642', label: 'Higher Concentration (1.1  to 2)' },
  { min: 0.9, color: '#fad980', label: 'Equivalent to the City (0.9-1.1)' },
  { min: 0.5, color: '#fff1d2', label: 'Lower Concentration (0.5-0.9)' },
  { min: 0.000001, color: '#ffffff', label: 'Much Lower (under 0.5)' },
  { min: 0, color: '#cc393e', label: 'None in this Area' },
];

// decides which color scale to use
// The map and the legend both read their colors from this one function, so they always match.
function getClasses(categoryKey) {
  if (categoryKey === 'all') {
    return DENSITY_CLASSES;
  }
  return LQ_CLASSES;
}

// returns the number to color by density or the chosen location quotient
function getValue(props, category) {
  if (category.key === 'all') {
    return props.density;
  }
  // Square brackets because the property name is stored in a variable.
  return props[category.lqKey];
}

// Gets the area's number, then goes down the color key from top to
// bottom and returns the color of the first line the number reaches.
// the steps are sorted high to low in the color codes above, so the first match will be the right one.
function getColor(props, category) {
  const value = getValue(props, category);
  const classes = getClasses(category.key);
  for (const cls of classes) {
    if (value >= cls.min) {
      return cls.color;
    }
  }
}

// Lets other files (like map.js) use these.
export { getClasses, getValue, getColor };
