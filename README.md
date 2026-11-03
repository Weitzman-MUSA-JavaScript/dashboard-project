# Houston Grocery Gap

This is a decision support tool for decisionmakers to assess and plan where to put new grocery stores in and around the city of Houston. It maps where Harris County residents live far from a grocery store, ranks the places a new store would do the most good (based on the data available), and lets staff test a recruitment plan against a budget.

## Who is this tool for?

The main users are City of Houston and Harris County economic development staff, and the councils they report to who decide where/how recruitment incentives will get spent.

The secondary users are grocers' site selection teams. Grocery profit margins are tight, so staff have to make a case to a chain, and a chain wants to know whether a location can support a store, not only whether it needs one.

## What decisions does it support?

The question a decisionmaker will typically start with is where grocery access is worst and how many people that affects, so the first step maps low income + low access tracts and lets you change what counts as a grocery store (as there are varying definitions). Need alone will not recruit a grocery chain, though. The second step weighs need against the size of the local market and whether incentives apply there, using weights you set, and produces a shortlist. Before any funds are put towards an initiative, staff need to know what the impact is of a specific deal, so the last step lets you place stores within a fixed fund and see who they reach, what they would likely sell and what the city gets back in tax revenues.

## What one can find with the tool

USDA's new 2025 food access map counts every SNAP-authorized store as food access, including convenience stores, dollar stores and pharmacies. By that measure only 8 tracts in Harris County are low income and low access. Count only supermarkets, supercenters and large grocers, the same store types USDA's own older map used, and the number is 175 tracts with about 759,000 residents. Of the 3,547 SNAP stores USDA lists in Harris County, 2,027 are convenience stores. So, someone relying on the official definition of what food access is today would conclude there's little need, though the majority of these c-stores are not sufficient to eliminate food insecurity in an area.

Also, nearly all of a new store's sales come from shoppers who already buy groceries somewhere nearby when modeled. Though, there is an innate bias built into the model's data, as new shoppers that would choose the new store are not fully represented since they might not be getting groceries on a regular schedule if they have no means of getting to another grocery store. If those residents shifted from eating out to cooking at home, that would actually cost the city a little sales tax, since restaurant meals are taxed and groceries aren't. Further, Texas doesn't tax groceries for home use, so only about 28% of a grocery store's sales are taxable. At a typical top-ranked site inside city limits, a new supermarket would sell about $30 million a year, and the city would collect about $148,000 a year from it in sales and property tax, which repays a $3 million incentive in about 20 years. Counting only sales that are new to the city, it's about $63,000 a year, mostly property tax, and about 48 years. The return on a grocery incentive is the residents it reaches.

## How it works

### Step 1: find the gaps

A tract is low access when at least 500 people, or a third of its residents, live more than 1 mile from a store (10 miles in rural tracts). Distances are measured from the center of every populated 2020 census block rather than from the middle of each census tract to get more representative distances. Low income follows USDA's tract definition.

### Step 2: rank sites

Each tract is scored from 0 to 100 on need, viability and incentives:

- Need averages three percentile ranks: residents beyond reach of a grocery store, car-free households among them, and the poverty rate.
- Viability is the yearly grocery spending of residents within 2 miles who have no store within reach, which is the sales a new store could win without taking them from an existing one.
- Incentives is 100 for a tract nominated as a 2027 Opportunity Zone, 50 for an eligible tract, and 0 otherwise.

The shortlist skips any tract within 2 miles of a higher pick, because one store would serve both.

### Step 3: test a plan

Stores can go only in food desert or Opportunity Zone eligible tracts. Each one draws its incentive from the fund. Sales come from a Huff model: each block's grocery spending is split among the stores within 5 miles by store size over distance squared, with an outside option standing in for online orders and farther stores.

The Consumer Expenditure Survey's grocery spending runs low against real sales, and it leaves out everything a store sells besides food, so the model scales it up in two steps. First it's multiplied by 1.39, which makes Harris County's grocery stores and supercenters add up to their 2022 Economic Census sales: $13.2 billion at 836 supermarkets and other grocers, and $8.7 billion at 82 warehouse clubs and supercenters. That step takes food as 80% of a supermarket's sales and 45% of a supercenter's, the second based on Walmart's reported mix after taking out paper goods, cleaning supplies and other nonfood items it counts as grocery. Then it's divided by groceries' share of store sales, 80%, to get total store sales. A store below the sales it needs to stay open is flagged.

City revenue is the city's 1% sales tax plus property tax on the building. Everything a store sells besides groceries is taxable, and so is 10% of its groceries (soda, candy and hot food), which makes 28% of sales taxable. That matches Texas: the Comptroller's 2022 sales tax collections from food stores, set against Census sales, work out to about 26 to 30% taxable once liquor and convenience stores are left out. The tool shows two paybacks, one on all the tax the stores collect and one on only the sales that are new to the city, leaving out sales taken from existing stores. Stores outside city limits bring the City of Houston nothing. The incentive amounts, sales floors, building values and both grocery shares are planning estimates, and are editable in the tool.

Plans save to the browser. Export and import them as JSON to share with others!

## The data

All data the tool shows comes from seven files in `data/`, built ahead of time from public sources alongside Claude Opus 5.5 via a Python script (geopandas, pandas, numpy and scipy).

| File | What it holds | Size |
|---|---|---|
| `tracts.geojson` | All 1,115 Harris County census tracts (2020 boundaries) with population, households, income, poverty, car-free and SNAP households, distance to groceries, food desert flags under both definitions, Opportunity Zone status, estimated grocery spending, the three site scores and a neighborhood name | 1.2 MB |
| `blocks.json` | 37,201 populated 2020 census blocks: location, population, tract, distance to the nearest grocery store, whether a bus stop is within a quarter mile, its pull toward existing stores and its grocery spending | 1.8 MB |
| `stores.geojson` | 4,224 SNAP-authorized stores in and within 10 miles of the county, each tagged grocery store, small grocer, dollar store or pharmacy, or convenience store | 0.9 MB |
| `stops.json` | 8,803 METRO stop locations | 0.2 MB |
| `houston-city.geojson` | City of Houston limits, to tell which stores bring the city tax revenue | 0.2 MB |
| `harris-boundary.geojson`, `harris-mask.geojson` | The county outline and the mask that dims everything outside it | under 0.1 MB |

The census tract is the unit because it's the smallest area every source shares. USDA's food access data, the Opportunity Zone designations and the income and poverty estimates are all published by 2020 tract, so they join on one ID with nothing to reconcile. The story map project mixed 2010 and 2020 boundaries. This one doesn't.

Tracts are too coarse for distance, though. An outer Harris County tract can be several miles across, and measuring from its middle would treat residents who live next to a store the same as residents two miles out. So distance and reach are measured from census blocks, often a single city block, and summed up to tracts. Blocks are also what make step 3 honest: when someone places a store, the tool counts exactly which residents are now within a mile.

Anything that doesn't change while someone uses the tool is computed ahead of time in Python, including distances, food desert flags, spending, scores and neighborhood names. The browser only does the math that depends on what the user does: reweighting scores, spacing the shortlist and evaluating a plan. That keeps the page fast and the files small. Blocks are stored as plain arrays instead of GeoJSON because only their center points are needed, which cuts the file to about a quarter of the size. Tract shapes are simplified to roughly 25 meters of detail, plenty for a county map.

### Where the raw data and build script live

The raw downloads are kept out of the repository, because the SNAP retailer file alone is 95 MB. The build script is `scripts/build_data.py`. The files in `data/` are everything the site needs to run.

To rebuild the data, download each source in the "Data sources" section below into its own folder in `raw/`, using the folder and file names the build script reads, then run `python3 scripts/build_data.py` with geopandas, pandas, numpy and scipy installed.

Data cleaning and processing for this project, including the build script, the food access and scoring calculations and the data checks, were done by Claude Opus 5.5 (Anthropic) working with Gavin Daves.

## Data sources

- **Grocery access.** U.S. Department of Agriculture, Economic Research Service. [Food Access Research Atlas](https://www.ers.usda.gov/data-products/food-access-research-atlas): SNAP-authorized Retailer Access Map, 2025 data, released July 2026, on 2020 census tracts.
- **Store locations.** USDA Food and Nutrition Service. [Historical SNAP Retailer Locator Data](https://www.fns.usda.gov/snap/retailer-locator/data), stores authorized as of December 31, 2025.
- **Where people live.** U.S. Census Bureau. 2020 Census block populations, via [TIGERweb](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer).
- **Income, poverty and vehicles.** [American Community Survey](https://www.census.gov/programs-surveys/acs) 2020 to 2024 5-year estimates, as published in the USDA and Texas files.
- **Opportunity Zones.** Office of the Texas Governor, Economic Development and Tourism. [Opportunity Zone 2.0](https://gov.texas.gov/business/page/opportunity-zones) nominated and eligible tracts, September 2026, from the office's [public map layer](https://services6.arcgis.com/qBPMNP2zACwkFVPe/arcgis/rest/services/Opportunity_Zones_2.0_(EDT_Recommended_Tracts)/FeatureServer/0). The nominations are pending U.S. Treasury certification.
- **Grocery spending.** U.S. Bureau of Labor Statistics. [Consumer Expenditure Survey](https://www.bls.gov/cex/tables/calendar-year/mean-item-share-average-standard-error.htm) 2024, food at home by income quintile.
- **Store sales.** U.S. Census Bureau. [2022 Economic Census, retail trade](https://data.census.gov/table/ECNBASIC2022.EC2244BASIC) (table EC2244BASIC), sales and establishments by industry for Harris County.
- **Taxable sales.** Texas Comptroller of Public Accounts. [Sales tax receipts by retail subsector](https://comptroller.texas.gov/transparency/revenue/watch/naics/naics-retail.php), fiscal 2022 and 2023.
- **Supercenter sales mix.** Walmart Inc. [Form 10-K for fiscal 2025](https://www.sec.gov/Archives/edgar/data/104169/000010416925000021/wmt-20250131.htm), Walmart U.S. net sales by merchandise category.
- **Neighborhood names.** City of Houston Planning and Development, [Super Neighborhoods](https://services2.arcgis.com/LYMgRMwHfrWWEg3s/arcgis/rest/services/City_Of_Houston_Super_Neighborhoods/FeatureServer). U.S. Census Bureau 2020 incorporated and census-designated places, via [TIGERweb](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer). U.S. Geological Survey, [Geographic Names Information System](https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer), for the remaining unincorporated tracts.
- **Tax rates.** City of Houston, [tax year 2025 adopted property tax rate](https://www.houstontx.gov/2025-tax-rate/TY25-Notice-Meeting-Vote-Tax-Rate.pdf) ($0.519190 per $100). Texas Comptroller of Public Accounts, [sales tax guidance for grocery and convenience stores](https://comptroller.texas.gov/taxes/publications/96-280.php).
- **Transit.** Metropolitan Transit Authority of Harris County. GTFS schedule data for the August 30, 2026 service change, via the [Mobility Database](https://mobilitydatabase.org/feeds/gtfs/mdb-2060).
- **Basemap.** [Esri World Light Gray Canvas](https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer), with data from HERE, Garmin and OpenStreetMap contributors.

## Running it locally

The site is static HTML, CSS and JavaScript with no build step. Serve the repository root with any static server:

```bash
npx http-server . -p 8080
```

Then open http://localhost:8080. Opening `index.html` straight from the file system won't work, because the browser blocks the data requests.

## Project structure

```
index.html            page structure and the three steps
css/index.css         all styles
js/main.js            sets up the map, loads data, wires the steps together
js/tracts.js          tract layer and its colors in each step
js/headline.js        step 1 counts under both definitions
js/stores.js          store dots by category
js/scores.js          site scores and the spaced shortlist
js/rank.js            step 2 sliders, shortlist and markers
js/model.js           step 3 model: reach, Huff sales, city revenue
js/results.js         step 3 results: reach, where sales come from, payback
js/plan.js            step 3 interface, saving and comparing plans
js/geo.js             distances and point-in-polygon
js/profile.js         tract details panel
js/legend.js          map legend for each step
js/format.js          number formatting
data/                 browser-ready data built by the script
scripts/build_data.py data build from the raw downloads
mockup/               the original sketch of the layout
```

## Credits

Built by Gavin Daves for MUSA 6110, JavaScript for City Planning, at the University of Pennsylvania. Data cleaning and processing by Claude Opus 5.5 (Anthropic).
