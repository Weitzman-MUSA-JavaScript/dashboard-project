# ADU Query Tool

Enter a Philadelphia address to see its zoning and whether an Accessory Dwelling Unit (ADU) is permitted.

## Purpose

* **Users:** Homeowners and developers
* **Decision:** Can I build an ADU on this property?
* **Data:** Zoning base districts, zoning overlays, historic register, and the L&I ADU requirements

## How it works

1. Search an address; the map drops a pin.
2. The popup checks base district, overlays and historic status automatically.
3. It follows the L&I flowchart, asking for structure type and lot size.
4. If permitted, confirm the Additional Code Requirements checklist.

## Sources

All data accessed October 16, 2026.

* **ADU rules:** City of Philadelphia, Department of Licenses and Inspections. (2022). *Accessory Dwelling Unit Checklist* (PZ_004_INF, rev. 3/8/2022). https://www.phila.gov/media/20220308130807/PZ_004_INF_Accessory-Dwelling-Unit-Checklist-rev-3.8.2022.pdf
* **Zoning base districts** (`Zoning_BaseDistricts`): Philadelphia City Planning Commission, via OpenDataPhilly. https://www.opendataphilly.org
* **Zoning overlays** (`Zoning_Overlays`): Philadelphia City Planning Commission, via OpenDataPhilly. https://www.opendataphilly.org
* **Historic districts** (`historicdistricts_local`): Philadelphia Historical Commission / City Planning Commission, via OpenDataPhilly. https://www.opendataphilly.org/datasets/philadelphia-registered-historic-districts (last updated 2017)
* **Historic sites** (`historic_sites_philreg`): Philadelphia Historical Commission / City Planning Commission, via OpenDataPhilly. https://www.opendataphilly.org/datasets/philadelphia-registered-historic-sites (last updated 2017)
* **Basemap and geocoding:** Mapbox
* **Colors** Color Brewer 2.0

## Tech

Mapbox GL JS, vanilla JavaScript, HTML, CSS.

## Run locally

1. Add your Mapbox access token in `js/main.js`.
2. Open `index.html` with a local server (e.g. VS Code Live Server).

## Limits

* Historic status, structure type and lot size need user confirmation.
* Informational only, not legal advice. L&I makes the final determination.

## Credits

Built by Chloe Alimurong. Code written with assistance from Claude (Anthropic).