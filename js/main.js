import { loadData } from './loadData.js';
import { globe } from './globe.js';
import { lollipop } from './lollipop.js';
import { drawDonut } from './donut.js';
import { createRotatingGlobe } from './smallGlobe.js';

// Load the data
const { worldData, locationData, severityData, typeData, continentData, land, countries, borders, volCountry} = await loadData();

// Draw the globe
const globeEl = d3.select('#globe');
globe(globeEl, worldData, locationData);

// Draw the bar chart
const lollipopEL = d3.select('#lollipop');
lollipop(lollipopEL, severityData);

// Draw the donut charts
const palette1 = ['#9D1F35', '#16335D', '#B2BEB5', '#CC2929', '#6E726E','#8592A0']; // dark red, de blue, green, charcol, 
const palette = ['#8592A0', '#16335D', '#B2BEB5', '#6E726E','#CC2929', '#9D1F35', '#CE5555', '#878787']; // dark red, de blue, green, charcol,
const donut1EL = d3.select('#donut1');
const input = 'Type';
drawDonut(donut1EL, input, typeData, palette);
const donut2EL = d3.select('#donut2');
const input2 = 'Continent';
drawDonut(donut2EL, input2, continentData, palette);

// Draw the smaller globe
const countryEL = d3.select('#country-select');
const yearEL = d3.select('#year-select').style('display', 'block');
const infoEL = d3.select('#info-display').style('display', 'block');
const smallglobeEL = d3.select('#small-globe');
createRotatingGlobe(countryEL, yearEL, infoEL, smallglobeEL, land, countries, borders, volCountry);
