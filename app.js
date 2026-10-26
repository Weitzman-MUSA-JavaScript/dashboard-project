// Create a map centered on State Island.
const map = L.map("map");

map.setView([40.7128, -74.0060], 10);

// Add the background map
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add a practice point
const marketLayer = L.layerGroup().addTo(map);
Papa.parse("data/Farmers'_Markets.csv", {   
    download: true,
    header: true,
    skipEmptyLines: true,
    
    complete: function(results) {
        const nycCounties = ["Richmond", "Kings", "Queens", "Bronx", "New York"
        ];

        results.data.forEach(function(market) {
            const latitude = parseFloat(market.Latitude);
            const longitude = parseFloat(market.Longitude);
            
            if (
                nycCounties.includes(market.County.trim()) &&
                Number.isFinite(latitude) &&
                Number.isFinite(longitude)
            ) {
              L.marker([latitude, longitude], {
  county: market.County.trim(),
  marketData: market,
              })
                .addTo(marketLayer)
                .bindPopup(function () {
                    const popup = document.createElement("div");
                    popup.textContent= [
                        market["Market Name"],
                        "Location: " + market["Market Location"],
                        "Hours: " + market["Operation Hours"],
                        "Season: " + market["Operation Season"]
                    ].join("\n");

                    popup.style.whiteSpace = "pre-line";
        
                    return popup;
                }); 
            }
        });
        function updateMarketList() {
  const list = document.querySelector("#market-list");
  list.replaceChildren();

  marketLayer.getLayers().forEach(function (marker) {
    const market = marker.options.marketData;
    const item = document.createElement("li");

    const heading = document.createElement("h3");
    heading.textContent = market["Market Name"];

    const details = document.createElement("p");
    details.textContent = [
      "Location: " + market["Market Location"],
      "Hours: " + market["Operation Hours"],
      "Season: " + market["Operation Season"]
    ].join(" • ");

    item.append(heading, details);
    list.append(item);
  });
}

updateMarketList();
        const allMarketMarkers = marketLayer.getLayers();
const boroughFilter = document.querySelector("#borough-filter");

boroughFilter.addEventListener("change", function () {
  const selectedCounty = boroughFilter.value;

  marketLayer.clearLayers();

  allMarketMarkers.forEach(function (marker) {
    if (
      selectedCounty === "all" ||
      marker.options.county === selectedCounty
    ) {
      marker.addTo(marketLayer);
    }
  });
updateMarketList();
  const visibleMarkers = marketLayer.getLayers();
  if (visibleMarkers.length > 0) {
    const bounds = L.featureGroup(visibleMarkers).getBounds();

    map.fitBounds(bounds, {
        padding: [40,40],
        maxZoom: 13
    });
    }
});
    },
    error: function(error) {
        console.error("Could not load CSV: ", error);
    }
});
const transitLayer = L.layerGroup().addTo(map);

L.control.layers(null, {
    "Subway / Staten Island Railway stations": transitLayer
}, {
    collapsed: false
}).addTo(map);
Papa.parse("data/transit_stations.csv", {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
        results.data.forEach(function(station) {
            const latitude = parseFloat(station["GTFS Latitude"]);
            const longitude = parseFloat(station["GTFS Longitude"]);

            if (
                Number.isFinite(latitude) &&
                Number.isFinite(longitude)
            ) {
                L.circleMarker([latitude, longitude], {
                radius: 5,
                color: "#f05724",
                weight: 1,
                fillcolor: "#f97316",
                fillOpacity: 0.8
            })
                .addTo(transitLayer)
                .bindPopup(function () {
                    const popup = document.createElement("div");

                    popup.textContent = [
                        station["Stop Name"],
                        "Daytime routes: "+ station["Daytime Routes"]
                    ].join("\n");

                    popup.style.whiteSpace = "pre-line";
                    return popup;
                });   
            }
        });
    },
    error: function(error) {
        console.error("Could not load stations: ", error);
    }
});