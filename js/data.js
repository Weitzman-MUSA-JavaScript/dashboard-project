import { parseCSV } from "./utils.js";

function normalizeTaiwanLabel(value) {
  if (typeof value !== "string" || value.length === 0) {
    return value;
  }
  if (!value.includes("Taiwan")) {
    return value;
  }
  return value.replace(/Taiwan(?!, China)/g, "Taiwan, China");
}

const earthquakeUrl = new URL("../data/earthquake.json", import.meta.url);
const beltsUrl = new URL("../data/plate_boundaries.geojson", import.meta.url);
const citiesUrl = new URL("../data/worldcities.csv", import.meta.url);

function normalizeEarthquake(feature, index) {
  const { properties, geometry } = feature;
  const coords = geometry && geometry.coordinates ? geometry.coordinates : [0, 0];
  const dateISO = properties.date || properties.time || null;
  const dateObj = dateISO ? new Date(dateISO) : null;
  const year = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj.getUTCFullYear() : null;
  const id = properties.ID ?? properties.id ?? `eq-${index}`;
  const place = normalizeTaiwanLabel(properties.place || "Unknown location");
  const state = normalizeTaiwanLabel(properties.state || properties.country || "");
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: coords,
    },
    properties: {
      ...properties,
      id,
      mag: Number(properties.magnitudo ?? properties.mag ?? properties.magnitude ?? null),
      depth: Number(properties.depth ?? null),
      hasTsunami: Number(properties.tsunami ?? 0) === 1,
      significance: Number(properties.significance ?? properties.sig ?? 0),
      place,
      state,
      dateISO,
      year,
      latitude: coords[1],
      longitude: coords[0],
    },
  };
}

export async function loadEarthquakes() {
  const response = await fetch(earthquakeUrl);
  const data = await response.json();
  const features = data.features.map((feature, index) => normalizeEarthquake(feature, index));
  const byId = new Map(features.map((f) => [f.properties.id, f]));
  return {
    collection: { ...data, features },
    features,
    byId,
  };
}

export async function loadBelts() {
  const response = await fetch(beltsUrl);
  const belts = await response.json();
  return belts;
}

export async function loadCities() {
  const response = await fetch(citiesUrl);
  const text = await response.text();
  const rows = parseCSV(text);
  return rows
    .map((row) => {
      const lat = Number(row.lat ?? row.latitude ?? row.Latitude);
      const lng = Number(row.lng ?? row.longitude ?? row.Longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const population = Number(row.population ?? 0);
      const city = normalizeTaiwanLabel(row.city_ascii || row.city || "");
      const admin = normalizeTaiwanLabel(row.admin_name || "");
      const country = normalizeTaiwanLabel(row.country || "");
      const displayName = [city, admin && admin !== city ? admin : null, country]
        .filter(Boolean)
        .join(", ");
      return {
        city,
        country,
        admin,
        lat,
        lng,
        population,
        value: displayName,
      };
    })
    .filter(Boolean);
}
