// What-if model new stores. This model simulates who a new store reaches,
// what sales they take / generate, and what the city gets back in tax revenue. 

import { milesBetween } from './scores.js';

const FORMATS = {
  full: { label: 'Full supermarket', size: 1.0 },
  small: { label: 'Neighborhood grocer', size: 0.33 },
};

// Planning assumptions (editable in interface)
const DEFAULT_ASSUMPTIONS = {
  budget: 10e6,
  incentive: { full: 3e6, small: 1e6 },
  floor: { full: 15e6, small: 5e6 },
  buildingValue: { full: 12e6, small: 4e6 },
  groceryShare: 0.8,
  taxableGroceryShare: 0.1,
};

const CITY_SALES_TAX = 0.01;
const CITY_PROPERTY_TAX = 0.0051919;
// Scales food spending to match 2022 Census grocery and supercenter sales in Harris County.
const FOOD_SCALE = 1.39;


const HUFF_MI = 5;
const MIN_MI = 0.25;
// The pull of everything else someone can buy groceries from (a supermarket
// 5 miles away, online, warehouse clubs).
const OUTSIDE_PULL = 1 / HUFF_MI ** 2;
const STOP_WALK_MI = 0.25;

// Each block row carries pull, the summed pull of the existing grocery
// stores on it (store size over distance squared, within 5 miles),
// new stores add their own pull on top.
function evaluate(plan, { blocks, tracts, stops, inCity }) {
  const stores = plan.stores.map((s) => ({
    ...s,
    size: FORMATS[s.format].size,
    sales: 0,
    shifted: 0,
    stopsNearby: stops.filter(([lon, lat]) => milesBetween(s, { lat, lon }) <= STOP_WALK_MI).length,
    inCity: inCity(s.lon, s.lat),
  }));

  let newlyReached = 0;
  let desertReached = 0;
  let carFreeReached = 0;

  for (const [lon, lat, pop, t, dGrocery, , pull, spend] of blocks) {
    const block = { lat, lon };
    const tract = tracts[t];
    const limit = tract.urban ? 1 : 10;
    let newPull = 0;
    let nearest = Infinity;
    const pulls = [];
    for (const s of stores) {
      const d = milesBetween(block, s);
      nearest = Math.min(nearest, d);
      const p = d <= HUFF_MI ? s.size / Math.max(d, MIN_MI) ** 2 : 0;
      pulls.push(p);
      newPull += p;
    }

    if (dGrocery > limit && nearest <= limit) {
      newlyReached += pop;
      if (tract.lila_grocery) { desertReached += pop; }
      if (tract.pop) { carFreeReached += tract.nocar * (pop / tract.pop); }
    }

    if (newPull === 0 || spend === 0) { continue; }
    const total = pull + newPull + OUTSIDE_PULL;
    // Existing stores lose the difference between their share before and after.
    const shifted = spend * (pull / (pull + OUTSIDE_PULL) - pull / total);
    stores.forEach((s, i) => {
      if (!pulls[i]) { return; }
      s.sales += (spend * pulls[i]) / total;
      s.shifted += shifted * (pulls[i] / newPull);
    });
  }

  const a = plan.assumptions;
  let cost = 0;
  let sales = 0;
  let shifted = 0;
  let taxable = 0;
  let cityRevenue = 0;
  let newCityRevenue = 0;
  // Kept between 10% and 100% so a blank or zero entry can't divide by zero.
  const groceryShare = Math.min(Math.max(a.groceryShare, 0.1), 1);
  for (const s of stores) {
    // Food spending, scaled to real food sales, then grossed up to the whole store.
    const shiftedShare = s.sales ? s.shifted / s.sales : 0;
    s.sales = (s.sales * FOOD_SCALE) / groceryShare;
    s.shifted = s.sales * shiftedShare;
    s.cost = a.incentive[s.format];
    s.viable = s.sales >= a.floor[s.format];
    // Everything but groceries is taxed, plus the taxed part of groceries (soda, candy, hot food).
    s.taxable = s.sales * (1 - groceryShare + groceryShare * a.taxableGroceryShare);
    const propertyTax = a.buildingValue[s.format] * CITY_PROPERTY_TAX;
    // Collected counts every sale. New leaves out sales taken from existing stores,
    // which the city was already taxing.
    s.cityRevenue = s.inCity ? s.taxable * CITY_SALES_TAX + propertyTax : 0;
    s.newCityRevenue = s.inCity ? s.taxable * (1 - shiftedShare) * CITY_SALES_TAX + propertyTax : 0;
    cost += s.cost;
    sales += s.sales;
    shifted += s.shifted;
    taxable += s.taxable;
    cityRevenue += s.cityRevenue;
    newCityRevenue += s.newCityRevenue;
  }

  return {
    stores,
    cost,
    sales,
    shifted,
    taxable,
    cityRevenue,
    newCityRevenue,
    payback: cityRevenue > 0 ? cost / cityRevenue : null,
    newPayback: newCityRevenue > 0 ? cost / newCityRevenue : null,
    newlyReached,
    desertReached,
    carFreeReached,
  };
}

export { FORMATS, DEFAULT_ASSUMPTIONS, evaluate };