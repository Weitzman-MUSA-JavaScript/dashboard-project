# Rwanda Healthcare Access

I built this dashboard for my JavaScript for Planners course to explore access to healthcare in Rwanda. I wanted to bring walking time and population together so someone could identify areas worth looking into when planning outreach or assessing gaps in access.

[Open the dashboard](https://freddie999.github.io/dashboard-project/)

## Who this is for

**The users I want to empower are…** health planners and community-health organisations investigating geographic barriers to healthcare in Rwanda.

**The specific decisions those users need to make are…** which areas to shortlist for further investigation when planning outreach or evaluating healthcare-access gaps, considering both walking time and population.

**The data required to inform these decisions is…** modelled walking times to health centres, health posts, and major hospitals; estimated population in each hexagonal area; and the locations of those areas.

## How to use it

1. Choose a healthcare facility type and enter a minimum walking time.
2. Look at the matching areas on the map and their combined estimated population.
3. Click a hexagon to see its population and modelled walking time.
4. Open the results panel to browse all matching areas, 10 per page, sorted by largest estimated population. Use **Previous page**, **Next page**, or enter a page number and choose **Go to page**. Selecting a result highlights it and moves the map to its location. **View selected area on map** closes the panel so you can see the highlighted hexagon, including on a phone.
5. Use **Reset filters and map** to return to health centres, a 60-minute threshold, and the starting map view.

The selected hexagon's details and the matching-results list share a panel. The list shows areas matching the filters across the dataset, not just areas near the one you clicked. The summary totals also include matching cells outside the current map view.

You can use Tab to move between controls and Enter to select a result. Changing pages moves focus to the new result range. Escape closes a panel and returns focus to its navigation button. The selected hexagon has a dark outline with a white border to stand out against the map.

## Data and sources

The healthcare-access data comes from the [Fika Safe Access Scorecard](https://fikadigital.org/saipoc), using its [public resolution-8 H3 PMTiles archive](https://public-b2p-geodata.s3.us-east-1.amazonaws.com/general-pmtiles/all_countries_merged_hex8.pmtiles).

The Rwanda subset contains 24,547 unique hexagonal cells. Repeated records across tiles were deduplicated by `h3_index`, and full H3 cell boundaries were reconstructed from those IDs. The prepared data is stored in two files:

- `data/rwanda-healthcare.pmtiles` supplies the map geometry and attributes.
- `data/rwanda-healthcare-values.csv` supplies the records used for filtering, population totals, and the results list.

Both files describe the same cells and use `h3_index` to connect them. The basemap comes from [OpenFreeMap](https://openfreemap.org/).

## What to keep in mind

These are modelled walking times, not recorded patient journeys. The dashboard uses Fika's `no_sites` fields; the exact scenario meaning and source dates remain unconfirmed. Zero travel times are treated as uncertain and excluded from the results.

Population figures are estimates attached to the cells. Their dates and coverage are not fully documented, so the totals should not be treated as a verified national population count. Cells have not been clipped to Rwanda's border. Source-data reuse terms also remain unconfirmed.

I use population to order the results, but that does not make the first result the highest-priority intervention. The tool is a starting point for further investigation, not a final recommendation on where to place a facility.

## Running locally

Open this project folder in VS Code and serve `index.html` with Live Server. If your workspace contains several projects, make sure Live Server points to `dashboard-project`. The data files need to be served over HTTP rather than opening the HTML file directly.

To install the code-checking tools and run the checks:

```bash
npm ci
npm run js-lint
npm run css-lint
```

The app uses HTML, CSS, and JavaScript, with MapLibre GL JS for the map, PMTiles for the tile archive, D3's CSV parser, and H3 for locating selected cells. The GitHub Pages workflow is configured to deploy when changes are pushed to `main`.
