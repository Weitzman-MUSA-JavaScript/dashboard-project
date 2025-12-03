# Student Oriented Housing Site Explorer

A web-based interactive dashboard helping students identify optimal housing locations in Philadelphia based on commute convenience, nearby amenities, and bike accessibility.

## Purpose & Users

**Primary Users:** Students seeking off-campus housing near Philadelphia universities  
**Secondary Users:** Academic advisors and housing coordinators assisting students

## Core Features

| Feature | Description |
|---------|-------------|
| **Campus Selection** | Choose from 20+ Philadelphia universities via dropdown or map click |
| **Travel Mode Filter** | Toggle between walking and biking with appropriate distance calculations |
| **Time Threshold** | Set maximum commute time (5, 10, 15, or 30 minutes) |
| **Adjustable Scoring** | Customize weights for distance, parks, grocery/food, and bike access |
| **Interactive Results** | Ranked neighborhood list with color-coded scores (0-100) |
| **Detail Popups** | Click any neighborhood for full metric breakdown |
| **Layer Controls** | Toggle visibility of parks, restaurants, and bike network |

## Data Sources

| Dataset | Source | Features |
|---------|--------|----------|
| Neighborhoods | OpenDataPhilly | 158 neighborhood polygons |
| Universities | OpenDataPhilly | 629 university building footprints |
| Parks & Recreation | Philadelphia PPR | 500+ park and recreation sites |
| Grocery & Restaurants | OpenStreetMap | 1,000+ food and grocery locations |
| Bike Network | City of Philadelphia | Complete bike lane network |