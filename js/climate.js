/**
 * Module for land cover and climate data used in the climate analysis tab
 */

// Set land cover colors and names
const landcoverColors = {
  // 1: Urban or Built-up Land (Red)
  11: '#cc0000', 12: '#cc0000', 13: '#cc0000', 14: '#cc0000', 15: '#cc0000', 16: '#cc0000', 17: '#cc0000',
  // 2: Agricultural Land (Yellow)
  21: '#e6e600', 22: '#e6e600', 23: '#e6e600', 24: '#e6e600',
  // 3: Rangeland (Tan/Khaki)
  31: '#d2b48c', 32: '#d2b48c', 33: '#d2b48c',
  // 4: Forest Land (Green)
  41: '#228b22', 42: '#228b22', 43: '#228b22',
  // 5: Water (Blue)
  51: '#1f78b4', 52: '#1f78b4', 53: '#1f78b4', 54: '#1f78b4',
  // 6: Wetland (Teal)
  61: '#008b8b', 62: '#008b8b',
  // 7: Barren Land (Gray)
  71: '#a9a9a9', 72: '#a9a9a9', 73: '#a9a9a9', 74: '#a9a9a9', 75: '#a9a9a9', 76: '#a9a9a9', 77: '#a9a9a9',
  // 8: Tundra (Powder Blue)
  81: '#b0e0e6', 82: '#b0e0e6', 83: '#b0e0e6', 84: '#b0e0e6', 85: '#b0e0e6',
  // 9: Perennial Snow (White)
  91: '#ffffff', 92: '#ffffff',
};
const landcoverNames = {
  11: 'Residential', 12: 'Commercial and Services', 13: 'Industrial', 14: 'Transportation, Communications and Utilities', 15: 'Industrial and Commercial Complexes', 16: 'Mixed Urban or Built-up Land', 17: 'Other Urban or Built-up Land',
  21: 'Cropland and Pasture', 22: 'Orchards, Groves, Vineyards, Nurseries and Horticultural', 23: 'Confined Feeding Operations', 24: 'Other Agricultural Land',
  31: 'Herbaceous Rangeland', 32: 'Shrub and Brush Rangeland', 33: 'Mixed Rangeland',
  41: 'Deciduous Forest Land', 42: 'Evergreen Forest Land', 43: 'Mixed Forest Land',
  51: 'Streams and Canals', 52: 'Lakes', 53: 'Reservoirs', 54: 'Bays and Estuaries',
  61: 'Forested Wetland', 62: 'Nonforested Wetland',
  71: 'Dry Salt Flats', 72: 'Beaches', 73: 'Sandy Areas Other than Beaches', 74: 'Bare Exposed Rock', 75: 'Strip Mines, Quarries, and Gravel Pits', 76: 'Transitional Areas', 77: 'Mixed Barren Land',
  81: 'Shrub and Brush Tundra', 82: 'Herbaceous Tundra', 83: 'Bare Ground', 84: 'Wet Tundra', 85: 'Mixed Tundra',
  91: 'Perennial Snowfields or Ice', 92: 'Glaciers',
};

function getLandcoverColor(id) {
  return landcoverColors[id];
}
