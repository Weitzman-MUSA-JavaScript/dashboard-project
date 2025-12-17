# PA Healthcare Facility Dashboard

## 📋 Content Overview

The **PA Healthcare Facility Dashboard** is an interactive spatial analysis tool designed to visualize the distribution and coverage of healthcare resources across the Commonwealth of Pennsylvania.

This dashboard provides stakeholders, researchers, and the general public with a clear view of where critical health services are located, facilitating better understanding of resource accessibility.

### Key Features

* **Interactive Mapping:** Built with Leaflet.js, featuring a high-contrast "Navigation Night" base map for data visibility.
* **Multi-Layer Visualization:** Distinct layers for four major facility types:
  * 🏥 Hospitals
  * 🧡 Community Mental Health Centers
  * ⚕️ Intermediate Care Facilities
  * 🏠 Home Health Agencies
* **Smart Search:** Real-time filtering allows users to search facilities by **name** or **street address**.
* **Synced List View:** A dynamic sidebar list that updates based on search results. Clicking a list item automatically flies the map to the facility's location.
* **Responsive Design:** A modern, flexbox-based layout with a "Corvette Blue" & "Cherry Red" color theme, optimized for various screen sizes.
* **Custom Symbology:** Unique, color-coded SVG icons for each facility type to ensure quick visual recognition.

---

## 📊 Data Citations & Sources

The geospatial data used in this dashboard is sourced from the **Pennsylvania Department of Health (DOH)**. We acknowledge their effort in maintaining public health datasets.

| Facility Type               | Source File                                        | Original Dataset                       |
| :-------------------------- | :------------------------------------------------- | :------------------------------------- |
| **Hospitals**         | `DOH_Hospitals202311.geojson`                    | PA DOH State Licensed Hospitals        |
| **Mental Health**     | `DOH_CommunityMentalHealthCenters202106.geojson` | PA DOH Community Mental Health Centers |
| **Intermediate Care** | `DOH_IntermediateCareFacilities202212.geojson`   | PA DOH Intermediate Care Facilities    |
| **Home Health**       | `DOH_HomeHealthAgencies202208.geojson`           | PA DOH Home Health Agencies            |

---

## 🛠️ Technical Details

### Tech Stack

* **Structure:** HTML5 (Semantic)
* **Styling:** CSS3 (Flexbox Layout, Custom Scrollbars, Hover Effects)
* **Logic:** Vanilla JavaScript (ES6+, Async/Await for data fetching)
* **Mapping Engine:** [Leaflet.js](https://leafletjs.com/) (v1.9.4)

---

## 🚀 How to Run

1. **Clone or Download** the repository.
2. **Start a Local Server**:
   * **VS Code (Recommended):** Install the "Live Server" extension, right-click `index.html`, and select "Open with Live Server".
   * **Node.js:** Use `http-server` or similar packages.
3. **View:** Open your browser and navigate to `http://localhost:8000` (or the port specified).
