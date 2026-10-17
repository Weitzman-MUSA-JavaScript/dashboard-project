# Philadelphia Incident Atlas

An interactive decision support tool for exploring **2021–2025 police reported incidents in Philadelphia**. It is intended for community organizations and city planners deciding **which areas, incident types, and times to examine when planning outreach or prevention work**. It summarizes historical reports; it does not classify a place as safe or predict an individual's risk.

## What users can do

1. Start with a citywide map of incident counts by **2024 census tract**, using **2025** reports by default. Choose any year from **2021 to 2025**.
2. Filter by incident type, time of day, day of week, and season. The map, matching report count, and detail charts update for the selected year.
3. Read the five-year annual line chart with the **same incident and time filters**. It changes between Philadelphia and the selected tract, and highlights the selected year. Annual counts are shown for calendar years, not a rolling five-year window.
4. Select a tract on the map or from the accessible tract list. Its selected-year count, share of the matched city total, approximate reported blocks, and charts appear beside the map.
5. Compare its incident-type shares with citywide shares under the same time filters. Hour, weekday, and season charts show the full distribution along that dimension while retaining the other filters. Return to the city or reset filters to explore another question.

The design is informed by a prior **Rittenhouse Public Safety Brief** in the user's Assignment2 project. That report compared incident types, dispatch timing, blocks, and Philadelphia totals. This dashboard applies those questions across the full city and lets users zoom into individual tracts. Rittenhouse is **not** a separate map layer, because its study polygon does not align with a single tract. The prior report's 745 site records should not be compared directly with any one tract's count.

## Data and interpretation

| Dataset | Use | Source |
| --- | --- | --- |
| Philadelphia Police crime incidents, 2021–2025 annual extracts | Dispatch time, incident category, approximate location | [OpenDataPhilly crime incidents](https://opendataphilly.org/datasets/crime-incidents/) and [City data notes](https://data.phila.gov/visualizations/crime-incidents/) |
| 2024 TIGER/Line Pennsylvania block groups | Dissolved to Philadelphia census tract polygons for every year | [US Census TIGER/Line](https://www2.census.gov/geo/tiger/TIGER2024/BG/tl_2024_42_bg.zip) |
| 2020–2024 ACS five-year B01003 | Tract resident population shown as context | [US Census ACS B01003](https://api.census.gov/data/2024/acs/acs5/groups/B01003.html) |
| OpenStreetMap standard tiles | Map background | [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) |

Each source CSV was extracted by **UTC calendar year**. Processing converts dispatch timestamps to Philadelphia time and keeps only the matching **local calendar year**. This gives a consistent period across the five annual files, but omits roughly the last five local hours of every December 31. The dashboard counts only geocoded reports assigned to one of 408 tracts, so the annual city total equals the sum of the tract counts.

| Local year | Mapped reports | Geocoded city reports outside a tract |
| --- | ---: | ---: |
| 2021 | 133,068 | 155 |
| 2022 | 149,566 | 207 |
| 2023 | 161,766 | 84 |
| 2024 | 153,561 | 16 |
| 2025 | 148,412 | 11 |

The map and five-year chart show **counts**, not a safety score or a population-adjusted rate. Larger or busier tracts may have more reports for reasons that counts alone cannot explain. Police points are generalized to the hundred block, so block markers are approximate. Dispatch time can differ from occurrence time; homicide hours should be interpreted cautiously. Resident population does not include visitors and workers and is shown only as context. Reporting, geocoding completeness, enforcement, and category practices can vary across years, so a change in counts is descriptive rather than causal. The fixed 2024 tract boundaries and 2020–2024 ACS population provide a common geography and population context for all five years. See [data processing notes](data/README.md) and [metadata](data/metadata.json).
