Philadelphia Historical Sites Day Trip Planner

This project is an interactive web map that explores historical sites in Philadelphia and their surrounding urban context, including food retail availability and parks and recreation sites. The map is designed as a simple “day trip planner,” allowing users to search for historic sites and understand their relationship to nearby amenities.

The project was created using Leaflet.js, GeoJSON, and the Fetch API, with an emphasis on layered spatial visualization and basic user interaction.

🔍 Project Features

Historic Sites Layer
-Displays registered historic sites as orange polygons
-Clickable features with popups showing site location information
-Searchable via the sidebar input box

Food Retail Layer
-Displays neighborhood food retail areas as polygons
-A single red color is used, with varying opacity representing the number of restaurants
-Higher opacity indicates a higher concentration of food retail

Parks and Recreation Layer
-Displays parks as green circular markers
-Styled to appear above other layers for visual clarity
-Interactive Search Panel
-Users can search historic sites by address or name
-Matching results are listed in the sidebar
-Clicking a result zooms the map to the selected site and opens its popup

Legend
Explains color and opacity encoding for each data layer
Clarifies how food retail density is represented

🗺️ Map Layers & Styling Logic

Layer drawing order is controlled using Leaflet panes to ensure correct visual hierarchy:
Food Retail 
Historic Sites
Parks and Recreation 
Food retail density is represented using opacity levels instead of multiple colors to maintain a clean and accessible visual language.

📊 Data Sources

Historic Sites
Philadelphia Register of Historic Places
Format: GeoJSON

Food Retail Data
Neighborhood-level food retail statistics
Attribute used: TOTAL_RESTAURANTS
Format: GeoJSON

Parks and Recreation
Philadelphia Parks & Recreation Program Sites
Format: GeoJSON
All data files are stored locally in the data/ directory and loaded using the Fetch API.

Data source: Open Data Philly
