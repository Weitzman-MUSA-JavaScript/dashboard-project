import { haversineDistance } from "./utils.js";

export function filterEarthquakes(features, center, state) {
  if (!state.magnitudes || state.magnitudes.size === 0) {
    return [];
  }
  const hasCenter = center && Number.isFinite(center.lat) && Number.isFinite(center.lng);
  const centerCoord = hasCenter ? [center.lat, center.lng] : null;
  const startYear = Math.min(state.yearStart, state.yearEnd);
  const endYear = Math.max(state.yearStart, state.yearEnd);
  const radius = state.radius;

  return features
    .map((feature) => {
      const { mag, year, hasTsunami, latitude, longitude } = feature.properties;
      if (!Number.isFinite(mag) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      const band = getMagnitudeBand(mag);
      if (!state.magnitudes.has(band)) {
        return null;
      }
      if (year !== null && (year < startYear || year > endYear)) {
        return null;
      }

      let distanceKm = null;
      if (hasCenter) {
        distanceKm = haversineDistance(centerCoord, [latitude, longitude]);
        if (distanceKm > radius) {
          return null;
        }
      }
      return {
        ...feature,
        properties: {
          ...feature.properties,
          distanceKm,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.properties.dateISO ? new Date(a.properties.dateISO).getTime() : 0;
      const bTime = b.properties.dateISO ? new Date(b.properties.dateISO).getTime() : 0;
      return bTime - aTime;
    });
}

function getMagnitudeBand(mag) {
  if (mag >= 8) return "8+";
  if (mag >= 7) return "7-7.9";
  return "6-6.9";
}

export function calcMetrics(earthquakes) {
  if (!earthquakes.length) {
    return {
      count: 0,
      maxMag: null,
      mostRecent: null,
      tsunamiCount: 0,
    };
  }
  const magnitudes = earthquakes
    .map((feature) => feature.properties.mag)
    .filter((mag) => Number.isFinite(mag));
  const maxMag = magnitudes.length ? Math.max(...magnitudes) : null;
  const mostRecent = earthquakes.reduce((latest, feature) => {
    if (!feature.properties.dateISO) return latest;
    const time = new Date(feature.properties.dateISO).getTime();
    if (!Number.isFinite(time)) return latest;
    if (!latest) return feature.properties.dateISO;
    return time > new Date(latest).getTime() ? feature.properties.dateISO : latest;
  }, null);

  const tsunamiCount = earthquakes.reduce((count, feature) => (
    feature.properties.hasTsunami ? count + 1 : count
  ), 0);

  return {
    count: earthquakes.length,
    maxMag,
    mostRecent,
    tsunamiCount,
  };
}

export function calcMinDistanceToBelts(center, beltsCollection) {
  if (!center || !beltsCollection || !Array.isArray(beltsCollection.features)) {
    return null;
  }
  if (!window.turf) {
    console.warn("Turf library not available");
    return null;
  }
  const { point, flattenEach, pointToLineDistance } = window.turf;
  const pt = point([center.lng, center.lat]);
  let minDistance = Number.POSITIVE_INFINITY;
  flattenEach(beltsCollection, (feature) => {
    if (!feature || !feature.geometry) return;
    const geomType = feature.geometry.type;
    if (geomType !== "LineString" && geomType !== "MultiLineString") {
      return;
    }
    const distance = pointToLineDistance(pt, feature, { units: "kilometers" });
    if (Number.isFinite(distance) && distance < minDistance) {
      minDistance = distance;
    }
  });
  return Number.isFinite(minDistance) ? minDistance : null;
}

export function classifyRisk(distanceKm, countWithinRadius300) {
  if (distanceKm === null || distanceKm === undefined || !Number.isFinite(distanceKm)) {
    return {
      level: "unknown",
      label: "Risk unknown",
      className: "",
      description: "Unable to determine distance to seismic belt.",
    };
  }
  if (distanceKm <= 50) {
    return {
      level: "high",
      label: "High risk",
      className: "highlight-high",
      description: "Within 50 km of a seismic belt",
    };
  }
  if (distanceKm <= 200) {
    return {
      level: "medium",
      label: "Moderate risk",
      className: "highlight-medium",
      description: "Between 50 km and 200 km from a seismic belt",
    };
  }
  if (countWithinRadius300 > 5) {
    return {
      level: "medium",
      label: "Moderate risk",
      className: "highlight-medium",
      description: "More than 200 km from a seismic belt, but 300 km radius shows elevated activity",
    };
  }
  return {
    level: "low",
    label: "Lower risk",
    className: "highlight-low",
    description: "More than 200 km from a seismic belt",
  };
}
