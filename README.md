# Markets by Transit in New York City

Created by Acharee Sirisan.

## Live website

https://jasach29.github.io/dashboard-project/

## Purpose and audience

This project responds to food access challenges, including those
experienced in food deserts, by helping NYC residents explore
farmers markets and nearby subway or Staten Island Railway
stations. It supports people who rely on public transportation
in choosing a market to visit by showing market locations,
operating hours, seasons, and nearby rail options.

## Decisions this tool supports

- Which farmers market should I visit in my chosen borough?
- What operating hours and season are listed for that market?
- Which nearby subway or Staten Island Railway stations could I investigate for my trip?

## Features

- Filter farmers markets by borough.
- Automatically zoom to the displayed markets.
- Click markets for locations, hours, and seasons.
- Click stations for names and daytime routes.
- Show or hide train stations.
- Operate the borough dropdown using a keyboard.
- Browse a market list that updates with the borough filter.

## Tools

HTML, CSS, JavaScript, Leaflet, and Papa Parse.

## Run locally

Open the project folder in VS Code. Right-click index.html and
select "Open with Live Server."

## Data sources

- [Farmers Markets in New York State](https://data.ny.gov/Economic-Development/Farmers-Markets-in-New-York-State-Map/gfni-eg8a)
- [MTA Subway Stations](https://data.ny.gov/Transportation/MTA-Subway-Stations/39hk-dx4f)
- Basemap: OpenStreetMap contributors.

## Limitations

Farmers markets may operate only on certain days or during
specific seasons. Listed hours and seasons may change or become
outdated, so users should confirm schedules before visiting.

Station points represent station locations rather than individual
entrances. The map does not calculate walking routes or travel
times, show live service, or include buses and ferries. Nearby
stations do not guarantee a convenient or accessible walking
connection. Check transit service before traveling.