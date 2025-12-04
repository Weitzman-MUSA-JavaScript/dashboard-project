Penn Nighttime Safety Dashboard
A Web-based Safety Visualization Tool for Penn Students

This project is a nighttime safety dashboard designed to help Penn students navigate campus more safely.
It integrates crime data, building safety attributes, nighttime popularity levels, lighting levels, and routing functions.

Features:
1. Interactive Map
Displays campus buildings with: Perceived safety level (1–5), Lighting level, Nighttime popularity, Place category (Academic / Residential / Public / Community).

2. Crime Heatmap
Toggleable hotspot visualization using Penn’s crime incident dataset.

3. Filters
You can filter buildings by: Category, Minimum safety level, Minimum popularity level, Minimum lighting level

4. Search
Search for a building by name. The map pans and opens pop-up info automatically.

5. Navigation: Shortest & Safest Path
Select a start and destination from the dropdown menus.
Two routing options: Shortest route (distance-based), Safest route (crime-weighted road network)

Routes based on Street Centerline road geometry. Crime influence weighted using a Gaussian-based decay model.

Data Sources: OpenDataPhilly(Crime.geojson, Street_Centerline.geojson)
All datasets are projected in WGS84 (EPSG:4326).

Author: Hazel Sun
Master of City Planning, University of Pennsylvania
Course: MUSA Dashboard Project
