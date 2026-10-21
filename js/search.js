/**
 * Address search and suggestions with Photon, an OpenStreetMap geocoder that
 * supports search-as-you-type: https://photon.komoot.io/
 * The public server asks for fair use, so suggestions wait until the person
 * pauses typing and only ask for a few results.
 */

const PHOTON_URL = 'https://photon.komoot.io/api/';
const CITY_HALL = { lat: 39.9526, lng: -75.1652 };

// Philadelphia County, with a little margin.
const BOUNDS = { west: -75.29, south: 39.86, east: -74.95, north: 40.14 };

/** True when a point is roughly inside Philadelphia. */
function inPhiladelphia(lat, lng) {
  return lat > BOUNDS.south && lat < BOUNDS.north && lng > BOUNDS.west && lng < BOUNDS.east;
}

/** Build a short, readable label from Photon's properties. */
function labelFor(props) {
  const street = [props.housenumber, props.street].filter(Boolean).join(' ');
  const main = props.name || street || props.district || props.city;
  const area = props.name && street ? street : (props.district || props.locality || props.city);
  return {
    main,
    detail: area && area !== main ? area : 'Philadelphia',
  };
}

/**
 * @param {string} query What the person typed.
 * @param {object} [options]
 * @param {number} [options.limit] How many results to ask for.
 * @param {AbortSignal} [options.signal] Lets a newer keystroke cancel this request.
 * @returns {Promise<Array<{lat: number, lng: number, main: string, detail: string}>>}
 */
async function searchAddresses(query, { limit = 5, signal } = {}) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    lang: 'en',
    bbox: `${BOUNDS.west},${BOUNDS.south},${BOUNDS.east},${BOUNDS.north}`,
    lat: String(CITY_HALL.lat),
    lon: String(CITY_HALL.lng),
  });
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`The address search service returned ${response.status}.`);
  }
  const geojson = await response.json();
  const seen = new Set();
  const results = [];
  for (const feature of geojson.features) {
    const [lng, lat] = feature.geometry.coordinates;
    if (!inPhiladelphia(lat, lng)) {
      continue;
    }
    const label = labelFor(feature.properties);
    const key = `${label.main}|${label.detail}`;
    if (label.main && !seen.has(key)) {
      seen.add(key);
      results.push({ lat, lng, ...label });
    }
  }
  return results;
}

export { searchAddresses, inPhiladelphia };
