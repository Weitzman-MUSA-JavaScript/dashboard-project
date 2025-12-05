import { getImpThresholds, getInuThresholds} from './slider.js';

const colorMapMatrix = {
  'Low Impervious - Low Inundation': '#4575b4',
  'Low Impervious - Medium Inundation': '#91bfdb',
  'Low Impervious - High Inundation': '#e0f3f8',
  'Medium Impervious - Low Inundation': '#fee090',
  'Medium Impervious - Medium Inundation': '#fc8d59',
  'Medium Impervious - High Inundation': '#d73027',
  'High Impervious - Low Inundation': '#fdae61',
  'High Impervious - Medium Inundation': '#f46d43',
  'High Impervious - High Inundation': '#a50026',
};


function calMatrix(feature) {
  const pct = feature.properties.pct_2025;
  const inund = feature.properties.inund_mean;

  const { impMid, impHigh } = getImpThresholds();
  const { inuMid, inuHigh } = getInuThresholds();

  let imperv = 'Low';
  if (pct > impHigh) {
    imperv = 'High';
  } else if (pct > impMid) {
    imperv = 'Medium';
  }

  let inun = 'Low';
  if (inund > inuHigh) {
    inun = 'High';
  } else if (inund > inuMid) {
    inun = 'Medium';
  }

  const riskMatrix = `${imperv} Impervious - ${inun} Inundation`;

  const color = colorMapMatrix[riskMatrix] || 'transparent';

  return {
    stroke: true,
    color: '#ffffffff',
    weight: 0.5,
    fillColor: color,
    fillOpacity: color === 'transparent' ? 0 : 0.8,
  };
}

function calImpervious(feature) {
  const pct = feature.properties.pct_2025;

  const r = Math.round(255 * pct);
  const g = Math.round(255 * (1 - pct));
  const b = 100;

  const color = `rgb(${r},${g},${b})`;

  return {
    stroke: true,
    color: '#ffffffff',
    weight: 0.5,
    fillColor: color,
    fillOpacity: 0.6,
  };
}

function calInundation(feature) {
  const inund = feature.properties.inund_mean;

  const r = 100;
  const g = Math.round(255 * (1 - inund));
  const b = Math.round(255 * inund);

  const color = `rgb(${r},${g},${b})`;

  return {
    stroke: true,
    color: '#ffffffff',
    weight: 0.5,
    fillColor: color,
    fillOpacity: 0.6,
  };
}


export { calMatrix };
export { calImpervious };
export { calInundation };
