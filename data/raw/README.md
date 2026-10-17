# Local source files

The following source files were copied from `D:\UPenn_Course\phd_y1\CPLN City at night\Assignment2`:

- `Philly_incidents_2024.csv`: original citywide police incident extract.
- `tl_2024_42_bg.zip`: 2024 Census Pennsylvania block-group polygons, dissolved to tracts during processing.
- `acs_2024_5yr_philadelphia_tracts_B01003.csv` and its metadata JSON: ACS tract resident population.
- `Philly_City_Limits.geojson`: city boundary used to match the existing Brief 4 citywide geography.
- `Rittenhouse_Site_Boundary.*`: the study-site shapefile components.
- `rittenhouse_crime_2024_report_extract.csv`: the 745 incident IDs used by the Brief 4 report to preserve its site membership.

This directory is ignored by Git. The dashboard reads the processed files in the parent `data/` folder.

The additional `incidents_2021.csv`, `incidents_2022.csv`, `incidents_2023.csv`, and `incidents_2025.csv` files were placed here by the user for the five-year dashboard. They share the original 2024 file's column structure. Processing uses the matching local calendar year from each annual UTC extract.
