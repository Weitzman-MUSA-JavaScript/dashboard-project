
# SEPTA Bus Rerouting Visualizer
In August of 2026, SEPTA did a significant [system rerouting of their bus routes](https://wwww.septa.org/initiatives/bus/).
Now that the rerouting has been implemented, it can be difficult to see how individual routes changed. SEPTA's trip planners and other navigation tools generally show current service, not a side-by-side comparison with the previous routes. Riders who rely on familiarity with the city rather than navigation apps may have difficulty finding where a changed route or stop moved.

This tool visualizes previous and current routes side-by-side, helping riders compare the changes and serving as a snapshot of the former routes.

After more data is collected, this map can be overlapped with ridership data for each stop (which SEPTA does currently collect). This can provide an overview for SEPTA transportation planners to see if moving the stops have led to a change in ridership. 

* **The users I want to empower are transit riders and eventually transit planners.** 
* **The specific decisions those users need to make are where to wait for the bus and what bus to take to get to a part of Philadelphia after the SEPTA Phase I bus rerouting.**
* **The data required to inform these decisions include SEPTA bus stop and bus route data.**

## DATA
This project used datasets directly from SEPTA's open data site. 

- [SEPTA Summer 2026 Bus Stops (Before August 2026 Phase I Changes)](https://data-septa.opendata.arcgis.com/datasets/SEPTA::summer-2026-stop-summary-bus/about)

- [SEPTA Fall 2026 Bus Stops (After Phase I Changes)](https://data-septa.opendata.arcgis.com/datasets/SEPTA::transit-stops-fall-2026/about)


## DESIGN DETAILS

Part of the SEPTA Phase I Changes also included updated signage. The logo on the upper left hand corner is inspired by the signage SEPTA uses for directions and informational signs that aren't about service. 

<img src="images/logo.png" alt="Dashboard Logo" width="150">

According to the SEPTA site, "arrows and symbols are always on a black background for the highest contrast."

![SEPTA wayfinding and information signage](images/septa_signage.png)

The color scheme used is reminiscent of the SEPTA logo. 

The JS and CSS code were both linted and site is a11y verified. 

## LIMITATIONS
- SEPTA datasets are not created equal. Even between the bus stop datasets for Summer 2026 and Fall 2026, the format and columns are different. Datasets with connect routes didn't have the individual bus stop data. This made it a challenge to connect each of the bus stops.
- Ridership data for the new reroutes may not be available yet. 

## EXTENSIONS
- Comparing ridership data before and after a route change. 
- Wayfinding - If a stop is outdated, direct user to nearest new stop for a bus going in the same direction. 
- Connecting the bus stops - Right now the map only displays the bus stops. It would be visually nice to have the stops connected. 
- In the next year, SEPTA will be rolling out even more changes in the system. Those would also be interesting to map. 

