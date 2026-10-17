# Dashboard data

`raw/` holds the original annual incident CSVs and geography sources. The dashboard reads only the processed files in this folder. Raw sources are ignored by Git.

## Published files

| File | Contents |
| --- | --- |
| `tracts.geojson` | 408 simplified 2024 census tract polygons with 2020–2024 ACS resident population and polygon area; the same geometry is used for all five years |
| `tract_summary.csv` | One row per tract and year (2,040 rows), with incident count, theft count, population, area, and reports per 1,000 estimated residents |
| `incidents_2021.csv` through `incidents_2025.csv` | Geocoded records in each local calendar year, with tract GEOID, month, weekday, dispatch hour, category, approximate coordinates, and block |
| `trend_2021_2025.bin` | Compact five-year record data for the annual chart; 746,373 tract-assigned records, 5,224,611 bytes |
| `rittenhouse_boundary.geojson` | Existing Brief 4 study boundary, retained as a reference file; it is not drawn on the dashboard |
| `metadata.json` | Sources, year-specific quality counts, category names, and the index lists needed to decode the trend file |

Run `python scripts/prepare_data.py` from the repository root to rebuild these files. The script needs pandas, NumPy, GeoPandas, Shapely, PyProj, and Pyogrio. It dissolves the 2024 Pennsylvania block-group polygons to census tracts, joins ACS tract population by 11-digit GEOID, converts each annual source's UTC dispatch timestamps to `America/New_York`, and assigns geocoded incidents to the full-resolution tract polygons. Only the displayed polygon geometry is simplified.

Each source is a UTC calendar-year extract. Filtering to the matching local year means the last roughly five local hours of December 31 are absent for every year. The dashboard's annual totals are counts of **tract-assigned** records. The processed year CSVs also retain a small number of geocoded records with blank `tract_geoid`; the browser omits those records to keep city and tract sums consistent. `metadata.json` reports those counts for each year.

The Winter filter combines January, February, and December **within each calendar year**; it is not a continuous December-to-February season crossing two years.

## Compact trend format

`trend_2021_2025.bin` has no header. Each record is seven bytes, in this order:

| Offset | Field | Encoding |
| ---: | --- | --- |
| 0 | Year | Unsigned byte; index into `metadata.json` → `years` |
| 1–2 | Tract | Unsigned 16-bit little-endian integer; index into `trend.tract_geoids` |
| 3 | Incident category | Unsigned byte; index into `trend.categories` |
| 4 | Month | Unsigned byte, 1–12 |
| 5 | Weekday | Unsigned byte, Monday = 0 |
| 6 | Dispatch hour | Unsigned byte, 0–23 |

There is one record per tract-assigned incident. The annual chart applies the incident type, time-of-day, weekday, season, and city/tract filters to this file, independent of the selected map year. The map and other detail charts use only the selected year's CSV. This avoids downloading coordinates and block names for all five years on page load.

Police event points are generalized to the hundred block. Dispatch time may differ from occurrence time, and homicide dispatch hours should be read cautiously. Resident population does not represent visitors or workers; the per-resident ratios in `tract_summary.csv` are context, not individual risk. Seventeen tracts have zero estimated residents, so their ratio is blank. Geocoding completeness and reporting can differ across years. The Rittenhouse report's 745-ID comparison is documented in the raw source notes and metadata; it is not a dashboard filter or map layer.
