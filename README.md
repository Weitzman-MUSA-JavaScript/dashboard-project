## Content overview

**Topic** 

The impact of SEPTA's August-September 2025 service cuts.

**Intended users** 

SEPTA bus riders and potential SEPTA bus riders.

**What users could do with this information** 

- Find which bus routes were cut, shortened, or reduced in their PA Senate district (important for advocating for funding at the legislature)
- Find the overall level of service cuts in their neighborhood.
- Find which state legislators represent them and their contact information.

**Data needed to enable the above** 

- SEPTA GTFS routes and stops data from before and after the cuts.
- Neighborhood boundaries.
- Political district boundaries.

## Data 

The underlying data for the dashboard comes from SEPTA's GTFS archive; I compare the [last GTFS update](https://github.com/septadev/GTFS/releases/tag/v202508242) prior to the cuts with the first update describing service after the [restoration of service](https://github.com/septadev/GTFS/releases/tag/v202509141). (I use the post-cut period schedule so that seasonal routes, like school-focused routes that were affected by the cuts, can be shown appropriately.)

I then use an R script (under the `r` directory) to read in the GTFS data (via the `tidytransit` package), add relevant attributes, and export route segments as a geojson file.
