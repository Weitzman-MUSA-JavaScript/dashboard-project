// I built this file mainly from the Week 4 and Week 6 bikeshare examples,
// plus JavaScript basics from the Week 2 and 3 readings.
// Then I pasted it on Claude and asked it to edit if anything were missing
// it has also been an iterative process of back and forth with claude and chat

// stores the business types in one list, with a key to identify each type and a label to show on the page
// lqKey gives the matching location quotient property in the data; 'all' uses density, so its lqKey is null
// keeps the same structure for each type so other code can loop through the list and use the right labels and data
const CATEGORIES = [
  { key: 'all', lqKey: null, label: 'All businesses (density)' },
  { key: 'Food_and_Beverage', lqKey: 'LQ_Food', label: 'Food & beverage (Location Quotient)' },
  { key: 'Retail_and_General_Business', lqKey: 'LQ_Retail', label: 'Retail & general business (Location Quotient)' },
  { key: 'Alcohol_and_Entertainment', lqKey: 'LQ_Alcohol', label: 'Alcohol & entertainment (Location Quotient)' },
  { key: 'Health_and_Professional_Services', lqKey: 'LQ_Health', label: 'Health & professional services (Location Quotient)' },
  { key: 'Transportation_and_Automotive', lqKey: 'LQ_Transport', label: 'Transportation & automotive (Location Quotient)' },
  { key: 'Industrial_and_Manufacturing', lqKey: 'LQ_Industrial', label: 'Industrial & manufacturing (Location Quotient)' },
  { key: 'Housing_and_Property', lqKey: 'LQ_Housing', label: 'Housing & property (Location Quotient)' },
  { key: 'Events_and_Recreation', lqKey: 'LQ_Events', label: 'Events & recreation (Location Quotient)' },
];

const LOW_COUNT = 5; // only because some businesses may have very little to be a generalizable concept

// looks through the categories for a matching key
// returns that category's details so other code can use its label and lqKey
function getCategory(key) {
  for (const category of CATEGORIES) {
    if (category.key === key) {
      return category;
    }
  }
}

// loads the Chicago community area file and waits for the response
// converts the JSON into a JavaScript object, then gets its list of area features
async function loadCcaData() {
  const response = await fetch('data/cca_final.json');
  const collection = await response.json();
  const areas = collection.features;

  // Loops through each community area's properties
  for (const area of areas) {
    const props = area.properties;

    // gets the area name from GEOG, using community if GEOG is null or undefined
    // rounds population and income to whole numbers, keeping null income values as null
    // calculates businesses per 1,000 residents so areas with different populations can be compared
    const name = props.GEOG ?? props.community; ;
    const population = Math.round(props.TOT_POP);
    const income = props.MEDINC === null ? null : Math.round(props.MEDINC);
    const density = props.Point_Count / props.TOT_POP * 1000;

    // Adds the calculated values to the area's properties
    Object.assign(props, { name, population, income, density });
  }

  // sets the citywide business totals to 0 for 'all' and each business type
  // starts at 0 so the next loop can add each area's counts using += without getting NaN
  const cityTotals = { all: 0 };
  for (const category of CATEGORIES) {
    cityTotals[category.key] = 0;
  }

  // Adds up all businesses across Chicago's community areas
  // so that cityTotals ends up holding Chicago's citywide total for all businesses and for each business type
  for (const area of areas) {
    cityTotals.all += area.properties.Point_Count;
    // Adds up businesses in each category, skipping the overall total
    for (const category of CATEGORIES) {
      if (category.key !== 'all') {
        cityTotals[category.key] += area.properties[category.key];
      }
    }
  }
  // Returns the community areas and citywide business totals
  return { areas, cityTotals };
}

// Makes these values and functions available to other JavaScript files
export { CATEGORIES, LOW_COUNT, getCategory, loadCcaData };
