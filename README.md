# **Philadelphia Itinerary Builder Dashboard**
Created by Lu Yii Wong 

Fall 2025

This project expands on **Assignment 1’s Philadelphia Story Map**, transforming it into an interactive tool that helps visitors design a custom itinerary based on their interests, time, and budget. Users can filter destinations across Philadelphia and instantly see tailored recommendations on both the map and sidebar.

---

## **Overview**

The dashboard allows users to:

* Select themes of interest (history, food, recreation, museums, etc.)
* Add more specific tags such as architecture, waterfront, or university
* Set a time budget (half day or full day)
* Choose a maximum spending amount
* View a dynamically updated itinerary with estimated total time and cost

Compared to the original story map, this version:

* Includes **more locations** across Philadelphia
* Provides **more extensive detail** for each stop
* Covers **additional neighborhoods** beyond the initial assignment
* Gives users **control over how their itinerary is structured**

---
## **Technical Details**
### **Key Functional Components**

#### **1. Event Handling**

Event listeners are used for:

* Theme selection
* Budget slider
* Time-availability dropdown
* Map interactions (optional)

#### **2. Data Filtering**

A custom filtering pipeline:

* Reads all themes of each location
* Applies budget and time constraints
* Returns only the stops that meet user criteria
* Updates the map layer and sidebar

#### **3. Data Structure**

Stored in:

```
data/itinerary_stops.geojson
```

Each feature contains:

```json
{
  "type": "Feature",
  "properties": {
    "id": "example_id",
    "name": "Example Location",
    "address": "123 Example St",
    "themes": ["history", "architecture"],
    "est_duration_min": 60,
    "est_cost": 10,
    "description": "Description of the location.",
    "must_see": true
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-75.0000, 39.9500]
  }
}
```

---

## **Data Sources & Citations**

**Basemap Tiles:**
CARTO Light Basemap
Attribution: © OpenStreetMap contributors • © CARTO

**Location Information:**
All destination details (names, addresses, descriptions) were compiled manually using publicly available information from:

* Visit Philadelphia
* Google Maps
* Official websites of museums and attractions

Estimated visit durations and costs were created manually for demostration purposes.

---

## **File Structure**

```
/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
└── data/
    └── itinerary_stops.geojson
```
