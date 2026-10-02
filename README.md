# Yunnan Odyssey

**Yunnan Odyssey** is a concept travel-planning web experience for Yunnan, China, built to merge **“rational planning”** (climate, cost, filters, itinerary building) with **“emotional inspiration”** (a social, Instagram-like feed tied to specific places).

The product is structured as a **3-step journey**: **Inspiration → Intelligence → Action**. 

---

## Why we built this

When people make travel plans today:

- Social platforms are great at *inspiration*, but “saved” places usually **can’t be directly turned into map collections and itineraries**.
- Travel planning tools are good at *logistics*, but places often lack the **human, emotional decision signals** (what it feels like, what others posted, why it’s worth going).

**Yunnan Odyssey combines both**:
1) a planning dashboard with decision-friendly data, and  
2) a location-based social feed (“Yunstagram”) where every post is attached to a POI, so when you click a place, you instantly see all posts about that place and can like/comment to interact. 

---

## Product walkthrough

### Step 1 — Inspiration: *The Ancient Tea Horse Road* Storymap
A narrative entry point that sets the tone for Yunnan travel using the **Tea Horse Road** as a storyline, and turns it into a “data journey” with map-driven chapters. 

Implementation notes:
- Uses Leaflet and a generated “fractal path” to evoke the Tea Horse Road route between key locations. 
- Loads POIs from `poi_new2_updated_with_pics.geojson`. 
- Ends with a CTA to enter the Dashboard. 

---

### Step 2 — Intelligence: Exploration Dashboard + “Yunstagram”
This is the main exploration hub:
- Left panel: **Month Highlight**, **Popularity Rank**, **Climate Info**. 
- Center: interactive map with **category filters** and **search**. 
- Right panel: **YUNSTAGRAM** feed. :contentReference
- Button to jump into the itinerary planner.

#### Seasonal highlighting (month-based)
The dashboard includes a month slider and updates UI theme content (title/description/image), then re-renders the map to highlight seasonal “best” places.

#### Climate information (“rational signals”)
The climate card uses a chart that combines temperature + precipitation patterns (demo values in the current build). 

#### Yunstagram (“emotional signals”)
The social feed supports:
- Viewing all posts, posts for a selected location, or “My Posts”. 
- Creating posts that **must be tied to a location** (`locationId`, `locationName`) with optional image upload. 
- Likes and comments interactions on posts. 

---

### Step 3 — Action: Interactive Itinerary Planner
The planner turns exploration into a concrete itinerary:
- Set **date range** and see total days. 
- Track **Total Cost**, **Stops**, and set a **Budget** limit.
- See an **Elevation Profile** chart for the itinerary.

#### Wishlist-driven planning
Only points in the user’s **wishlist** appear in the planner map:
- Planner loads POIs + a user wishlist document, then “renders markers only for wishlist IDs”. :contentReference

#### Add POIs into specific days
Each POI popup shows elevation + cost and lets you choose a target day (Day 1, Day 2, …) then **Add** it. 

#### Auto-generate daily routes
Routes are generated per-day using **Mapbox Directions API (driving)**; if the API fails, it falls back to a dashed straight polyline. 

---

## Data notes ❕
This project is a **prototype** and the dataset is **not fully real**:

- POI coordinates + (original) Chinese names come from **OpenStreetMap** (OSM).
- Other attributes were generated via rules + ChatGPT, and English names were produced via Google Sheets translation.
- As a result, some distributions (e.g., elevation) may look unrealistic.

The web app loads POIs from `poi_new2_updated_with_pics.geojson`.

---

## Tech stack
- **Leaflet** for web mapping (storymap/dashboard/planner). 
- **Chart.js** for climate/elevation charts. 
- **SortableJS** for drag-and-drop (planner).   
- **Firebase (Firestore)** for demo user wishlist + social posts.
- **Mapbox Directions API** for routing. 

---

## Project structure (typical)
> (Paths reflect how pages reference assets in code.)

- `index.html` — Home (CN/EN toggle + accessibility mode) 
- `storymap.html` + `js/storymap.js` — Tea Horse Road storymap 
- `dashboard.html` + `js/dashboard.js` — Exploration dashboard 
- `interactive.html` + `js/interactive.js` — Itinerary planner 
- `poi_new2_updated_with_pics.geojson` — POI dataset 
- `css/*` — styling referenced by each page (not included in this snippet set)

---

## How to run locally
Because the project fetches local GeoJSON files, it must be served via a local web server (not opened as a raw file).

Recommended:
1. Open the folder in VS Code
2. Use **Live Server**
3. Start from `index.html`

The planner also shows an explicit error if GeoJSON cannot be fetched and recommends Live Server. 

---

## Known limitations (prototype)
- Climate values and several POI attributes are mock/generated (not authoritative).
- Firebase and Mapbox keys/tokens are embedded for demo purposes; in a real deployment, move them to environment variables and restrict usage.

---

## Credits
- Map data & base attribution include OpenStreetMap contributors (used in tile attribution). 
- Routing: Mapbox Directions API.