// Point-in-polygon lookup for finding which tract a click is in.

// Ray casting: count how many edges a line running east from the point
// crosses. An odd count means the point is inside.
// Source: Claude Opus 5.5
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Recursive check for polygons with holes
function inPolygon(lon, lat, rings) {
  return inRing(lon, lat, rings[0]) && !rings.slice(1).some((hole) => inRing(lon, lat, hole));
}

function inFeature(lon, lat, feature) {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') { return inPolygon(lon, lat, coordinates); }
  if (type === 'MultiPolygon') { return coordinates.some((rings) => inPolygon(lon, lat, rings)); }
  return false;
}

function findFeature(lon, lat, collection) {
  return collection.features.find((f) => inFeature(lon, lat, f)) || null;
}

export { findFeature, inFeature };
