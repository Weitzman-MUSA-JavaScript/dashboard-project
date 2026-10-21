import { TOTAL_GF, CITY_SHARE, SERVICES } from "./budget.js";

const $ = (id) => document.getElementById(id);
const usd = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const SALES_RATE = 0.01; 
const key = String(name).trim().toLowerCase();

const val = (id) => +$(id).value || 0;

const myTotal = () =>
  val("wage") +
  val("property") * CITY_SHARE +
  val("transfer") +
  val("business") +
  val("spending") * SALES_RATE;

const myShare = (s) => myTotal() * (s.budget / (TOTAL_GF * 1000));

const NAME_FIELDS = ["dist_num", "park_name", "firesta_", "building", "NAME", "SHORT_NAME", "official_name", "PUBLIC_NAME", "SITE_NAME", "LABEL", "FACILITY_NAME", "ASSET_NAME", "LOCATION_NAME", "DISTRICT_NAME"];
const ADDRESS_FIELDS = ["ADDRESS", "ADDRESS_911", "ADDRESS_FULL", "STREET_ADDRESS", "FULL_ADDRESS", "LOCATION"];
const pick = (props, fields) => {
  const lower = Object.fromEntries(Object.entries(props).map(([k, v]) => [k.toLowerCase(), v]));
  return fields.map((f) => lower[f.toLowerCase()]).find((v) => v);
};

const map = L.map("map").setView([39.9902, -75.1652], 11);
const MAPBOX_TOKEN = "pk.eyJ1Ijoic2NlcmFtaSIsImEiOiJjbXZlNW55OGIweDgzMnhvbGlkbTVxNTVsIn0.2j3CpCOfxs5Bx7NVmLNakg"; 
L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
  id: "mapbox/outdoors-v12",
  accessToken: MAPBOX_TOKEN,
  tileSize: 512,
  zoomOffset: -1,
  maxZoom: 19,
  attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const layers = {};   // e.g. { Fire: <layer>, Police: <layer>, ... }
let selected = null; // the service picked in the table, or null for all

function showOnly(label) {
  selected = selected === label ? null : label; // clicking the same row again shows all
  for (const [name, layer] of Object.entries(layers)) {
    if (!selected || name === selected) layer.addTo(map);
    else map.removeLayer(layer);
  }
  render(); // redraw the table so the selected row is highlighted
}

function render() {
  $("summary").innerHTML = SERVICES.map((s) => `
    <tr data-label="${s.label}" class="${selected === s.label ? "selected" : ""}">
      <td><img src="${s.iconUrl}" width="12"> ${s.label}</td>
      <td>${usd(myShare(s))}</td>
    </tr>`).join("");
}

$("summary").onclick = (e) => {
  const row = e.target.closest("tr[data-label]");
  if (row) showOnly(row.dataset.label);
};

for (const s of SERVICES) {
  if (!s.url) continue;
  fetch(s.url)
    .then((r) => r.json())
.then((geo) => {
  const seen = new Set();
  geo.features = geo.features.filter((f) => {
    const name = pick(f.properties, NAME_FIELDS);
    if (!name) return true;                  // no name: keep it
    const key = String(name).trim().toLowerCase();
    if (seen.has(key)) return false;         // name already seen: drop it
    seen.add(key);
    return true;
  });
  const count = geo.features.length;
      layers[s.label] = L.geoJSON(geo, {
        pointToLayer: (_, ll) => L.marker(ll, {
          icon: L.divIcon({
            className: "",
            iconSize: [10, 10],
            html: `<div style="width:15px; height:15px; display:flex; align-items:center; justify-content:center;
                     background:${s.circle}; border:1px solid rgba(0,0,0,0.25); border-radius:50%;
                     box-shadow:0 1px 3px rgba(0,0,0,0.3);">
                     <img src="${s.iconUrl}" style="width:10px; height:10px;">
                   </div>`,
          }),
        }),
      })
      .bindPopup((l) => {
          const p = l.feature.properties;
const name = p.firesta_ != null
  ? `Fire Station ${p.firesta_}`
  : p.dist_num != null
    ? `Police Station, District ${p.dist_num}`
    : pick(p, NAME_FIELDS) ?? s.label;
          const address = pick(p, ADDRESS_FIELDS);
          return `<div class="popup-title">${name}</div>
            ${address ? `<div class="popup-address">${address}</div>` : ""}
            <div class="popup-cost">You spend ~<span class="popup-amount">${usd(myShare(s) / count)}</span>/yr on this site</div>
            <div class="popup-note">${usd(myShare(s))} to ${s.label}, split across ${count} sites</div>`;
        }, { className: "service-popup" });

      if (!selected || selected === s.label) layers[s.label].addTo(map);
    })
    .catch(console.error);
}

$("learn-more").onclick = () => $("about").showModal();
$("close-about").onclick = () => $("about").close();

for (const id of ["wage", "property", "transfer", "business", "spending"]) {
  $(id).oninput = render;
}
render();