# Philadelphia Transit Index Dashboard

**Zhanchao Yang**
> Department of City and Regional Planning <br>
> Weitzman School of Design, University of Pennsylvania

An interactive web dashboard that helps housing seekers and tenants in Philadelphia evaluate neighborhoods based on transit accessibility. The dashboard calculates a transit index at the census tract level using spatial analysis and provides a breakdown of key factors influencing transit access.

## Purpose

**Key Question:** *Where can I find a place to live that fits my transit needs or desires?*

This dashboard empowers housing seekers and tenants to make informed decisions about where to live in Philadelphia by providing clear, visual insights into transit accessibility across different neighborhoods. Whether you prioritize proximity to subway stations, bus routes, or regional rail, this tool helps you understand Philadelphia's transit landscape.

## Target Audience

- **Housing Seekers**: Individuals looking for a new place to live who want to prioritize transit access
- **Current Tenants**: Residents evaluating their current location or considering a move
- **Real Estate Professionals**: Agents helping clients find transit-accessible housing

## Features

- **Interactive Map**: Explore Philadelphia neighborhoods with an intuitive map interface powered by Mapbox
- **Transit Index Visualization**: View transit accessibility scores at the census tract level
- **Geographic Search**: Find specific neighborhoods or addresses


## Usage

1. **Explore the Map**: The dashboard opens with an interactive map of Philadelphia
2. **View Transit Index**: Census tracts are colored based on their transit accessibility score
3. **Click for Details**: Click on any census tract to see detailed information about:
   - Overall transit index score
   - Proximity to subway/metro stations
   - Other contributing factors
4. **Search Locations**: Use the search feature to find specific neighborhoods or addresses
5. **Compare Areas**: Click between different census tracts to compare transit accessibility

## Project Structure

```
transit-index-dashboard/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # Stylesheet for the dashboard
├── js/
│   ├── index.js           # Main JavaScript entry point
│   ├── map.js             # Map initialization and configuration
│   ├── chart.js           # Data visualization components
│   └── geolocate.js       # Geolocation functionality
├── package.json           # Project dependencies and scripts
├── .eslintrc.json        # ESLint configuration
├── .stylelintrc.json     # Stylelint configuration
└── README.md             # This file
```

## Data Sources

The transit index is calculated using the following data sources:

- **Census Tract Boundaries**: U.S. Census Bureau TIGER/Line Shapefiles
- **SEPTA Transit Data**: Southeastern Pennsylvania Transportation Authority
  - Subway/Metro lines and stations
  - Bus routes and stops
  - Regional rail stations
- **Philadelphia Open Data**: Additional geographic and demographic data

*Note: All data sources will be properly cited in the dashboard interface.*

## Author

**Zhanchao Yang**
- GitHub: [@zyang91](https://github.com/zyang91)
- Project: MUSA JavaScript Dashboard

## Acknowledgments

- Weitzman School of Design, University of Pennsylvania
- MUSA JavaScript Course
- Mapbox for mapping services
- SEPTA for transit data
- U.S. Census Bureau for geographic data

For questions, issues, or suggestions, please open an issue on the [GitHub repository](https://github.com/zyang91/transit-index-dashboard/issues).
